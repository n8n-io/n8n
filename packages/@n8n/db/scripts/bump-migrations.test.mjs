import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bumpMigrations } from './bump-migrations.mjs';

const MIGRATIONS = 'packages/@n8n/db/src/migrations';
const MIGRATION_TESTS = 'packages/cli/test/migration';
const OLD = 1_700_000_000_000;
const ADDED = 1_700_000_000_100;
const SECOND_ADDED = 1_700_000_000_110;
const BASE_HEAD = 1_700_000_000_200;
const OTHER_BASE_HEAD = 1_700_000_000_300;
const ABOVE_BASE_HEAD = 1_700_000_000_250;
const NOW_BELOW_HEAD = 1_700_000_000_150;

describe('bumpMigrations', () => {
	let repo;

	function git(...args) {
		return execFileSync(
			'git',
			[
				'-c',
				'user.name=test',
				'-c',
				'user.email=test@example.com',
				'-c',
				'commit.gpgsign=false',
				...args,
			],
			{ cwd: repo, encoding: 'utf8' },
		);
	}

	function write(path, content) {
		mkdirSync(dirname(join(repo, path)), { recursive: true });
		writeFileSync(join(repo, path), content);
	}

	function read(path) {
		return existsSync(join(repo, path)) ? readFileSync(join(repo, path), 'utf8') : null;
	}

	function addMigration(folder, timestamp, name) {
		write(
			`${MIGRATIONS}/${folder}/${timestamp}-${name}.ts`,
			`export class ${name}${timestamp} {}\n`,
		);
	}

	function commit(message) {
		git('add', '-A');
		git('commit', '-m', message);
	}

	beforeEach(() => {
		repo = mkdtempSync(join(tmpdir(), 'bump-migrations-'));
		git('init', '-b', 'master');
		addMigration('common', OLD, 'Old');
		commit('initial');
	});

	afterEach(() => {
		rmSync(repo, { recursive: true, force: true });
	});

	it('moves an added common migration after the base head', () => {
		git('checkout', '-b', 'feature');
		addMigration('common', ADDED, 'New');
		write(`${MIGRATION_TESTS}/${ADDED}-new.test.ts`, `const MIGRATION_NAME = 'New${ADDED}';\n`);
		commit('add New');
		git('checkout', 'master');
		addMigration('common', BASE_HEAD, 'Head');
		commit('add Head');
		git('checkout', 'feature');

		bumpMigrations({ cwd: repo, base: 'master', now: NOW_BELOW_HEAD });

		const moved = BASE_HEAD + 1;
		expect({
			oldMigrationExists: existsSync(join(repo, `${MIGRATIONS}/common/${ADDED}-New.ts`)),
			migration: read(`${MIGRATIONS}/common/${moved}-New.ts`),
			test: read(`${MIGRATION_TESTS}/${moved}-new.test.ts`),
		}).toEqual({
			oldMigrationExists: false,
			migration: `export class New${moved} {}\n`,
			test: `const MIGRATION_NAME = 'New${moved}';\n`,
		});
	});

	it('moves the class of a migration whose class name differs from its file name', () => {
		const classTimestamp = ADDED - 5;
		git('checkout', '-b', 'feature');
		write(`${MIGRATIONS}/common/${ADDED}-New.ts`, `export class Renamed${classTimestamp} {}\n`);
		write(
			`${MIGRATION_TESTS}/${ADDED}-new.test.ts`,
			`const MIGRATION_NAME = 'Renamed${classTimestamp}';\n`,
		);
		commit('add New with another class name');
		git('checkout', 'master');
		addMigration('common', BASE_HEAD, 'Head');
		commit('add Head');
		git('checkout', 'feature');

		bumpMigrations({ cwd: repo, base: 'master', now: NOW_BELOW_HEAD });

		const moved = BASE_HEAD + 1;
		expect({
			migration: read(`${MIGRATIONS}/common/${moved}-New.ts`),
			test: read(`${MIGRATION_TESTS}/${moved}-new.test.ts`),
		}).toEqual({
			migration: `export class Renamed${moved} {}\n`,
			test: `const MIGRATION_NAME = 'Renamed${moved}';\n`,
		});
	});

	it('gives a common and sqlite pair one new timestamp', () => {
		git('checkout', '-b', 'feature');
		addMigration('common', ADDED, 'Pair');
		addMigration('sqlite', ADDED, 'Pair');
		commit('add Pair');
		git('checkout', 'master');
		addMigration('common', BASE_HEAD, 'Head');
		commit('add Head');
		git('checkout', 'feature');

		bumpMigrations({ cwd: repo, base: 'master', now: NOW_BELOW_HEAD });

		const moved = BASE_HEAD + 1;
		expect([
			existsSync(join(repo, `${MIGRATIONS}/common/${moved}-Pair.ts`)),
			existsSync(join(repo, `${MIGRATIONS}/sqlite/${moved}-Pair.ts`)),
		]).toEqual([true, true]);
	});

	it('keeps the order of two added migrations', () => {
		git('checkout', '-b', 'feature');
		addMigration('common', ADDED, 'First');
		addMigration('common', SECOND_ADDED, 'Second');
		commit('add two');
		git('checkout', 'master');
		addMigration('common', BASE_HEAD, 'Head');
		commit('add Head');
		git('checkout', 'feature');

		const moves = bumpMigrations({ cwd: repo, base: 'master', now: NOW_BELOW_HEAD });

		expect(moves).toEqual([
			{ name: 'First', from: ADDED, to: BASE_HEAD + 1 },
			{ name: 'Second', from: SECOND_ADDED, to: BASE_HEAD + 2 },
		]);
	});

	it('renames each file once when a new timestamp equals the old timestamp of a later migration', () => {
		addMigration('common', BASE_HEAD, 'Head');
		commit('add Head');
		git('checkout', '-b', 'feature');
		addMigration('common', ADDED, 'Stale');
		addMigration('common', BASE_HEAD + 1, 'Fresh');
		commit('add Stale and Fresh');

		bumpMigrations({ cwd: repo, base: 'master', now: NOW_BELOW_HEAD });

		expect({
			stale: read(`${MIGRATIONS}/common/${BASE_HEAD + 1}-Stale.ts`),
			fresh: read(`${MIGRATIONS}/common/${BASE_HEAD + 2}-Fresh.ts`),
		}).toEqual({
			stale: `export class Stale${BASE_HEAD + 1} {}\n`,
			fresh: `export class Fresh${BASE_HEAD + 2} {}\n`,
		});
	});

	it('takes the head from the given base ref', () => {
		git('checkout', '-b', 'stack-parent');
		addMigration('common', BASE_HEAD, 'ParentHead');
		commit('add ParentHead');
		git('checkout', '-b', 'feature');
		addMigration('common', ADDED, 'New');
		commit('add New');
		git('checkout', 'master');
		addMigration('common', OTHER_BASE_HEAD, 'MasterHead');
		commit('add MasterHead');
		git('checkout', 'feature');

		const moves = bumpMigrations({ cwd: repo, base: 'stack-parent', now: NOW_BELOW_HEAD });

		expect(moves).toEqual([{ name: 'New', from: ADDED, to: BASE_HEAD + 1 }]);
	});

	it('does not move an added override of a base migration', () => {
		addMigration('common', BASE_HEAD, 'Head');
		commit('add Head');
		git('checkout', '-b', 'feature');
		addMigration('sqlite', BASE_HEAD, 'Head');
		addMigration('common', ADDED, 'Stale');
		commit('add override and Stale');

		const moves = bumpMigrations({ cwd: repo, base: 'master', now: NOW_BELOW_HEAD });

		expect(moves).toEqual([{ name: 'Stale', from: ADDED, to: BASE_HEAD + 1 }]);
	});

	it('changes nothing when every added migration is above the base head', () => {
		addMigration('common', BASE_HEAD, 'Head');
		commit('add Head');
		git('checkout', '-b', 'feature');
		addMigration('common', ABOVE_BASE_HEAD, 'Fresh');
		commit('add Fresh');

		const moves = bumpMigrations({ cwd: repo, base: 'master', now: NOW_BELOW_HEAD });

		expect({ moves, status: git('status', '--porcelain') }).toEqual({ moves: [], status: '' });
	});
});
