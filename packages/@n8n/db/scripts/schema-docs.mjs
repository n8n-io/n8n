#!/usr/bin/env node
// @ts-check
/**
 * Generates (or verifies) the database schema documentation under `docs/generated/`.
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
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(__dirname, '../../../../');
const TMP_DIR = resolve(PKG_ROOT, '.tmp-schema-docs');

// Pinned by tag + digest for reproducible CI runs; bump deliberately.
const TBLS_IMAGE =
	'ghcr.io/k1low/tbls:v1.94.5@sha256:ae8a3bff6d4f8495d13a7982cd71fac3e8a3d1dd394888f2c44ef82216aa14e4';

/** Thrown for expected, user-facing failures so `main`'s cleanup still runs. */
class FailError extends Error {}

function fail(msg) {
	throw new FailError(msg);
}

/** Turns a spawn failure into an actionable message for missing binaries. */
function spawnErrorMessage(cmd, err) {
	if (err.code === 'ENOENT') {
		if (cmd === 'tbls') {
			return 'tbls is not installed. Install it with `brew install tbls` (see https://github.com/k1LoW/tbls#install), or re-run with --docker to use the tbls Docker image instead.';
		}
		if (cmd === 'docker') {
			return 'docker is not installed or not on PATH. Install Docker, or drop --docker to use a local tbls binary.';
		}
	}
	return `failed to spawn ${cmd}: ${err.message}`;
}

function parseArgs(argv) {
	const args = { command: null, dbType: null, docker: !!process.env.CI };
	for (const arg of argv) {
		if (arg === '--docker') args.docker = true;
		else if (arg.startsWith('--db=')) args.dbType = arg.slice('--db='.length);
		else if (!arg.startsWith('--') && !args.command) args.command = arg;
	}
	return args;
}

/** Runs a command, inheriting stdio. Resolves with the exit code. */
function run(cmd, cmdArgs, env) {
	return new Promise((res, rej) => {
		const child = spawn(cmd, cmdArgs, { cwd: REPO_ROOT, env, stdio: 'inherit' });
		child.on('error', (err) => rej(new FailError(spawnErrorMessage(cmd, err))));
		child.on('close', (code) => res(code ?? 1));
	});
}

/** Runs a command, capturing stdout (used for `tbls diff`). */
function capture(cmd, cmdArgs, env) {
	return new Promise((res, rej) => {
		let stdout = '';
		const child = spawn(cmd, cmdArgs, { cwd: REPO_ROOT, env });
		child.on('error', (err) => rej(new FailError(spawnErrorMessage(cmd, err))));
		child.stdout.on('data', (d) => (stdout += d));
		child.stderr.on('data', (d) => process.stderr.write(d));
		child.on('close', (code) => res({ code: code ?? 1, stdout }));
	});
}

/** Spins up an empty database and returns its connection details + a cleanup fn. */
async function provision(dbType) {
	if (dbType === 'sqlite') {
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
function buildDsn(dbType, provisioned, docker) {
	if (dbType === 'sqlite') {
		// tbls reads the file directly; under Docker it lives in the /work mount.
		const filePath = docker ? `/work/${relative(REPO_ROOT, provisioned.file)}` : provisioned.file;
		return `sqlite://${filePath}`;
	}
	const conn = provisioned.dataSourceOptions;
	// Under Docker, tbls runs in its own container and reaches the host-mapped
	// Postgres port via host.docker.internal (added below with --add-host).
	const host = docker ? 'host.docker.internal' : conn.host;
	return `postgres://${conn.username}:${conn.password}@${host}:${conn.port}/${conn.database}?sslmode=disable&search_path=public`;
}

/** Invokes tbls (binary locally, Docker image in CI). */
async function tbls(command, dbType, dsn, docker) {
	const config = `.tbls.${dbType}.yml`;
	const env = { ...process.env, TBLS_DSN: dsn };
	const args = command === 'diff' ? ['diff'] : ['doc', '--force'];
	args.push('-c', config);

	if (docker) {
		const dockerArgs = [
			'run',
			'--rm',
			'--add-host',
			'host.docker.internal:host-gateway',
			'-e',
			`TBLS_DSN=${dsn}`,
			'-v',
			`${REPO_ROOT}:/work`,
			'-w',
			'/work',
			TBLS_IMAGE,
			...args,
		];
		return command === 'diff'
			? capture('docker', dockerArgs, env)
			: { code: await run('docker', dockerArgs, env), stdout: '' };
	}
	return command === 'diff'
		? capture('tbls', args, env)
		: { code: await run('tbls', args, env), stdout: '' };
}

async function main() {
	let { command, dbType, docker } = parseArgs(process.argv.slice(2));
	if (command !== 'doc' && command !== 'diff') {
		fail('usage: schema-docs.mjs <doc|diff> --db=<sqlite|postgres> [--docker]');
	}
	if (dbType !== 'sqlite' && dbType !== 'postgres') {
		fail('--db must be sqlite or postgres');
	}

	// Resolve which tbls runtime to use, before spinning up a DB and running
	// migrations. Prefer a local tbls binary; fall back to the Docker image when
	// it's absent. `--docker` (or CI) forces the Docker path.
	const probeBin = (cmd) => {
		const { error, status } = spawnSync(cmd, ['version'], { stdio: 'ignore' });
		if (error) return 'missing';
		return status === 0 ? 'ok' : 'broken';
	};

	if (docker) {
		const state = probeBin('docker');
		if (state === 'missing') fail(spawnErrorMessage('docker', { code: 'ENOENT' }));
		if (state === 'broken')
			fail('docker is installed but not responding — is the Docker daemon running?');
	} else if (probeBin('tbls') !== 'ok') {
		if (probeBin('docker') === 'ok') {
			docker = true;
			console.info(
				'tbls not available — falling back to running in Docker. ' +
					'Install tbls (`brew install tbls` or see ' +
					'https://github.com/k1LoW/tbls#install) to run locally.',
			);
		} else {
			fail(
				'neither tbls nor docker is available. Install tbls (`brew install tbls`, ' +
					'see https://github.com/k1LoW/tbls#install) or ensure Docker is set up.',
			);
		}
	}

	const provisioned = await provision(dbType);
	try {
		// Imported only now: env above must be set before @n8n/db evaluates its
		// migration context from the DI config.
		const { DataSource } = await import('@n8n/typeorm');
		// Imported from built dist by path: the package can't resolve its own name.
		const { entities, sqliteMigrations, postgresMigrations, wrapMigration } = await import(
			new URL('../dist/index.js', import.meta.url).href
		);
		const migrations = dbType === 'sqlite' ? sqliteMigrations : postgresMigrations;

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

		const dsn = buildDsn(dbType, provisioned, docker);
		const { code, stdout } = await tbls(command, dbType, dsn, docker);

		if (command === 'diff') {
			// `tbls diff` prints the unified diff to stdout and exits non-zero when
			// the docs are stale. An empty stdout with a non-zero exit is a genuine
			// tbls error (e.g. cannot connect), so check the diff output first.
			if (stdout.trim() !== '') {
				process.stdout.write(stdout);
				fail(
					`schema docs for ${dbType} are out of date. Run \`pnpm db:schema:docs\` and commit the changes.`,
				);
			}
			if (code !== 0) fail(`tbls diff failed (exit ${code})`);
			console.log(`✓ ${dbType} schema docs are up to date`);
		} else if (code !== 0) {
			fail(`tbls doc failed (exit ${code})`);
		} else {
			console.log(`✓ generated ${dbType} schema docs in docs/generated/${dbType}-schema`);
		}
	} finally {
		await provisioned.cleanup();
	}
}

try {
	await main();
} catch (err) {
	if (err instanceof FailError) {
		console.error(`error: ${err.message}`);
		process.exitCode = 1;
	} else {
		throw err;
	}
}
