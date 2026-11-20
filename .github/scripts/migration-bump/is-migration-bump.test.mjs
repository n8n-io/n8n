import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isMigrationBump } from './is-migration-bump.mjs';

const APP = { login: 'n8n-assistant[bot]' };
const PERSON = { login: 'poly' };
const OLD = '1700000000100';
const NEW = '1700000000201';

const MIGRATION_RENAME = {
	status: 'renamed',
	previous_filename: `packages/@n8n/db/src/migrations/common/${OLD}-New.ts`,
	filename: `packages/@n8n/db/src/migrations/common/${NEW}-New.ts`,
	patch: [
		'@@ -1,3 +1,3 @@',
		" import type { MigrationContext } from '../migration-types';",
		'-export class New' + OLD + ' implements ReversibleMigration {',
		'+export class New' + NEW + ' implements ReversibleMigration {',
		'   async up() {}',
	].join('\n'),
};

const TEST_RENAME = {
	status: 'renamed',
	previous_filename: `packages/cli/test/migration/${OLD}-new.test.ts`,
	filename: `packages/cli/test/migration/${NEW}-new.test.ts`,
	patch: [
		'@@ -1 +1 @@',
		`-const MIGRATION_NAME = 'New${OLD}';`,
		`+const MIGRATION_NAME = 'New${NEW}';`,
	].join('\n'),
};

const GITHUB = { login: 'web-flow' };

/** @param {{ author?: { login: string }, committer?: { login: string }, verified?: boolean, files?: any[] }} [overrides] */
function changes({
	author = APP,
	committer = GITHUB,
	verified = true,
	files = [MIGRATION_RENAME, TEST_RENAME],
} = {}) {
	return {
		commits: [{ sha: 'bump-sha', author, committer, commit: { verification: { verified } } }],
		files,
	};
}

describe('isMigrationBump', () => {
	it('accepts a rename plus the class name change from the App', () => {
		assert.equal(isMigrationBump(changes()), true);
	});

	it('rejects one extra changed line', () => {
		const extraLine = {
			...MIGRATION_RENAME,
			patch: `${MIGRATION_RENAME.patch}\n-  const a = 1;\n+  const a = 2;`,
		};

		assert.equal(isMigrationBump(changes({ files: [extraLine, TEST_RENAME] })), false);
	});

	it('rejects the same change from a person', () => {
		assert.equal(isMigrationBump(changes({ author: PERSON })), false);
	});

	it('rejects an App-authored commit that GitHub did not sign', () => {
		assert.equal(isMigrationBump(changes({ verified: false })), false);
	});

	it('rejects an App-authored commit that a person committed', () => {
		assert.equal(isMigrationBump(changes({ committer: PERSON })), false);
	});

	it('rejects a timestamp change with no renamed migration file', () => {
		assert.equal(isMigrationBump(changes({ files: [TEST_RENAME] })), false);
	});

	it('rejects a copied file', () => {
		const copied = { ...TEST_RENAME, status: 'copied' };

		assert.equal(isMigrationBump(changes({ files: [MIGRATION_RENAME, copied] })), false);
	});

	it('rejects a range with no changed files', () => {
		assert.equal(isMigrationBump(changes({ files: [] })), false);
	});

	it('rejects an extra added line', () => {
		const addedLine = { ...MIGRATION_RENAME, patch: `${MIGRATION_RENAME.patch}\n+  drop = true;` };

		assert.equal(isMigrationBump(changes({ files: [addedLine, TEST_RENAME] })), false);
	});

	it('rejects a rename into another folder', () => {
		const moved = { ...TEST_RENAME, filename: `packages/cli/test/other/${NEW}-new.test.ts` };

		assert.equal(isMigrationBump(changes({ files: [MIGRATION_RENAME, moved] })), false);
	});

	it('rejects a rename to another name', () => {
		const renamed = {
			...TEST_RENAME,
			filename: `packages/cli/test/migration/${NEW}-other.test.ts`,
		};

		assert.equal(isMigrationBump(changes({ files: [MIGRATION_RENAME, renamed] })), false);
	});
});
