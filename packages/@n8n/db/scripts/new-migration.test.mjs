import { execFileSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const FAR_FUTURE = 9_000_000_000_000;

describe('new-migration', () => {
	let pkgRoot;

	beforeEach(() => {
		pkgRoot = mkdtempSync(join(tmpdir(), 'new-migration-'));
		cpSync(SCRIPTS_DIR, join(pkgRoot, 'scripts'), { recursive: true });
		for (const folder of ['common', 'sqlite', 'postgresdb']) {
			mkdirSync(join(pkgRoot, 'src', 'migrations', folder), { recursive: true });
		}
	});

	afterEach(() => {
		rmSync(pkgRoot, { recursive: true, force: true });
	});

	function addMigration(timestamp, name) {
		writeFileSync(
			join(pkgRoot, 'src', 'migrations', 'common', `${timestamp}-${name}.ts`),
			`export class ${name}${timestamp} {}\n`,
		);
	}

	function scaffold(name) {
		execFileSync(process.execPath, [join(pkgRoot, 'scripts', 'new-migration.mjs'), name], {
			stdio: 'pipe',
		});
	}

	function scaffoldedTimestamp(name) {
		const file = readdirSync(join(pkgRoot, 'src', 'migrations', 'common')).find((entry) =>
			entry.endsWith(`-${name}.ts`),
		);
		return Number(file?.split('-')[0]);
	}

	it('scaffolds max + 1 when the newest migration is in the future', () => {
		addMigration(FAR_FUTURE, 'Head');

		scaffold('Next');

		expect(
			existsSync(join(pkgRoot, 'src', 'migrations', 'common', `${FAR_FUTURE + 1}-Next.ts`)),
		).toBe(true);
	});

	it('scaffolds Date.now() when the newest migration is in the past', () => {
		addMigration(1_700_000_000_000, 'Head');
		const before = Date.now();

		scaffold('Next');

		const timestamp = scaffoldedTimestamp('Next');
		expect(timestamp >= before && timestamp <= Date.now()).toBe(true);
	});
});
