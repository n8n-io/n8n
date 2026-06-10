#!/usr/bin/env node
// @ts-check
/**
 * Generates (or verifies) the database schema documentation under `docs/db/`.
 *
 * The schema is defined by the migrations, not the entities (entities run with
 * `synchronize: false`). So we bring an empty database to the fully-migrated
 * state by running the `@n8n/db` migration arrays, then point `tbls` at it to
 * render Markdown + a Mermaid ER diagram.
 *
 * One database type per process: `migration-helpers.ts` captures `DB_TYPE` /
 * `DB_TABLE_PREFIX` from the DI config at module-load time, so the env must be
 * set BEFORE `@n8n/db` is imported and cannot be changed afterwards.
 *
 *   node scripts/schema-docs.mjs <doc|diff> --db=<sqlite|postgres> [--docker]
 *
 * `--docker` (auto-enabled when `CI` is set) runs tbls via its image instead of
 * a local binary.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../../');
const TMP_DIR = resolve(REPO_ROOT, '.tmp-schema-docs');

function fail(msg) {
	console.error(`error: ${msg}`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = { command: null, db: null, docker: !!process.env.CI };
	for (const arg of argv) {
		if (arg === '--docker') args.docker = true;
		else if (arg.startsWith('--db=')) args.db = arg.slice('--db='.length);
		else if (!arg.startsWith('--') && !args.command) args.command = arg;
	}
	return args;
}

/** Runs a command, inheriting stdio. Resolves with the exit code. */
function run(cmd, cmdArgs, env) {
	return new Promise((res) => {
		const child = spawn(cmd, cmdArgs, { cwd: REPO_ROOT, env, stdio: 'inherit' });
		child.on('error', (err) => fail(`failed to spawn ${cmd}: ${err.message}`));
		child.on('close', (code) => res(code ?? 1));
	});
}

/** Runs a command, capturing stdout (used for `tbls diff`). */
function capture(cmd, cmdArgs, env) {
	return new Promise((res) => {
		let stdout = '';
		const child = spawn(cmd, cmdArgs, { cwd: REPO_ROOT, env });
		child.on('error', (err) => fail(`failed to spawn ${cmd}: ${err.message}`));
		child.stdout.on('data', (d) => (stdout += d));
		child.stderr.on('data', (d) => process.stderr.write(d));
		child.on('close', (code) => res({ code: code ?? 1, stdout }));
	});
}

/** Spins up an empty database and returns its connection details + a cleanup fn. */
async function provision(db) {
	if (db === 'sqlite') {
		const file = resolve(TMP_DIR, 'schema.sqlite');
		mkdirSync(TMP_DIR, { recursive: true });
		rmSync(file, { force: true });
		process.env.DB_TYPE = 'sqlite';
		process.env.DB_SQLITE_DATABASE = file;
		process.env.DB_TABLE_PREFIX = '';
		return {
			dataSourceOptions: { type: 'sqlite', database: file },
			file,
			cleanup: () => rmSync(file, { force: true }),
		};
	}

	// postgres: spin a throwaway container. Image tag matches the testcontainers
	// default in `n8n-containers` (packages/testing/containers/test-containers.ts).
	const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
	const container = await new PostgreSqlContainer('postgres:18-alpine').start();
	const conn = {
		host: container.getHost(),
		port: container.getMappedPort(5432),
		username: container.getUsername(),
		password: container.getPassword(),
		database: container.getDatabase(),
		schema: 'public',
	};
	process.env.DB_TYPE = 'postgresdb';
	process.env.DB_POSTGRESDB_HOST = conn.host;
	process.env.DB_POSTGRESDB_PORT = String(conn.port);
	process.env.DB_POSTGRESDB_DATABASE = conn.database;
	process.env.DB_POSTGRESDB_USER = conn.username;
	process.env.DB_POSTGRESDB_PASSWORD = conn.password;
	process.env.DB_POSTGRESDB_SCHEMA = conn.schema;
	process.env.DB_TABLE_PREFIX = '';
	return {
		dataSourceOptions: { type: 'postgres', ...conn },
		cleanup: () => container.stop(),
	};
}

/** Builds the tbls DSN for the freshly-migrated database. */
function buildDsn(db, provisioned, docker) {
	if (db === 'sqlite') {
		// tbls reads the file directly; under Docker it lives in the /work mount.
		const path = docker ? `/work/${relative(REPO_ROOT, provisioned.file)}` : provisioned.file;
		return `sqlite://${path}`;
	}
	const c = provisioned.dataSourceOptions;
	// Under Docker, tbls runs in its own container and reaches the host-mapped
	// Postgres port via host.docker.internal (added below with --add-host).
	const host = docker ? 'host.docker.internal' : c.host;
	return `postgres://${c.username}:${c.password}@${host}:${c.port}/${c.database}?sslmode=disable&search_path=public`;
}

/** Invokes tbls (binary locally, Docker image in CI). */
async function tbls(command, db, dsn, docker) {
	const config = `.tbls.${db}.yml`;
	const env = { ...process.env, TBLS_DSN: dsn };
	const args = command === 'diff' ? ['diff'] : ['doc', '--force'];
	args.push('-c', config);

	if (docker) {
		const dockerArgs = [
			'run', '--rm',
			'--add-host', 'host.docker.internal:host-gateway',
			'-e', `TBLS_DSN=${dsn}`,
			'-v', `${REPO_ROOT}:/work`, '-w', '/work',
			'ghcr.io/k1low/tbls',
			...args,
		];
		return command === 'diff' ? capture('docker', dockerArgs, env) : { code: await run('docker', dockerArgs, env), stdout: '' };
	}
	return command === 'diff' ? capture('tbls', args, env) : { code: await run('tbls', args, env), stdout: '' };
}

async function main() {
	const { command, db, docker } = parseArgs(process.argv.slice(2));
	if (command !== 'doc' && command !== 'diff') {
		fail('usage: schema-docs.mjs <doc|diff> --db=<sqlite|postgres> [--docker]');
	}
	if (db !== 'sqlite' && db !== 'postgres') {
		fail('--db must be sqlite or postgres');
	}

	const provisioned = await provision(db);
	try {
		// Imported only now: env above must be set before @n8n/db evaluates its
		// migration context from the DI config.
		const { DataSource } = await import('@n8n/typeorm');
		// Imported from built dist by path: the package can't resolve its own name.
		const { entities, sqliteMigrations, postgresMigrations, wrapMigration } = await import(
			new URL('../dist/index.js', import.meta.url).href
		);
		const migrations = db === 'sqlite' ? sqliteMigrations : postgresMigrations;

		const dataSource = new DataSource({
			...provisioned.dataSourceOptions,
			// Some migrations use the EntityManager, so entity metadata must be registered.
			entities: Object.values(entities),
			synchronize: false,
			migrationsTableName: 'migrations',
			migrations,
		});
		await dataSource.initialize();
		// Wrap only after initialize(): TypeORM constructs each migration during
		// metadata building, and wrapping installs a `transaction` getter that
		// would clash with migrations setting `transaction` in their constructor.
		migrations.forEach(wrapMigration);
		await dataSource.runMigrations({ transaction: 'each' });
		await dataSource.destroy();

		const dsn = buildDsn(db, provisioned, docker);
		const { code, stdout } = await tbls(command, db, dsn, docker);

		if (command === 'diff') {
			// `tbls diff` prints the unified diff to stdout and exits non-zero when
			// the docs are stale. An empty stdout with a non-zero exit is a genuine
			// tbls error (e.g. cannot connect), so check the diff output first.
			if (stdout.trim() !== '') {
				process.stdout.write(stdout);
				fail(
					`schema docs for ${db} are out of date. Run \`pnpm db:schema:docs\` and commit the changes.`,
				);
			}
			if (code !== 0) fail(`tbls diff failed (exit ${code})`);
			console.log(`✓ ${db} schema docs are up to date`);
		} else if (code !== 0) {
			fail(`tbls doc failed (exit ${code})`);
		} else {
			console.log(`✓ generated ${db} schema docs in docs/db/${db}`);
		}
	} finally {
		await provisioned.cleanup();
	}
}

await main();
