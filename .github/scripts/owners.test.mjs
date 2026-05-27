import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	assignOwnership,
	ownershipsToAllocations,
	parseOwnersContent,
	parseOwnersFile,
} from './owners.mjs';

/**
 * Run these tests by running
 *
 * node --test ./.github/scripts/owners.test.mjs
 * */

describe('parseOwnersContent', () => {
	it('parses well-formed OWNERS lines into Owner records', () => {
		const content = [
			'# header comment',
			'',
			'*                            @n8n-io/catalysts',
			'packages/cli/                @n8n-io/cli-team',
			'packages/foo/bar.ts          @n8n-io/some-team',
		].join('\n');

		assert.deepEqual(parseOwnersContent(content), [
			{ filepath: '*', team: '@n8n-io/catalysts' },
			{ filepath: 'packages/cli/', team: '@n8n-io/cli-team' },
			{ filepath: 'packages/foo/bar.ts', team: '@n8n-io/some-team' },
		]);
	});

	it('skips lines without an @n8n-io team', () => {
		const content = [
			'# comment',
			'*  @other-org/team',
			'pkg/  @n8n-io/keepers',
			'',
		].join('\n');

		assert.deepEqual(parseOwnersContent(content), [
			{ filepath: 'pkg/', team: '@n8n-io/keepers' },
		]);
	});

	it('returns an empty array when no lines reference @n8n-io', () => {
		assert.deepEqual(parseOwnersContent('# nothing here\n*  @someone-else'), []);
	});
});

describe('parseOwnersFile', () => {
	it('reads the real OWNERS file into well-formed Owner records', () => {
		const owners = parseOwnersFile();

		assert.ok(owners.length > 0, 'OWNERS file should not be empty');
		assert.ok(
			owners.every(o => o.team && o.filepath),
			'every parsed entry should have both team and filepath',
		);
		assert.ok(
			owners.every(o => o.team?.startsWith('@n8n-io/')),
			'every parsed team should belong to the @n8n-io org',
		);
	});
});

describe('assignOwnership', () => {
	it('assigns every file to the catch-all team when only `*` is defined', () => {
		const files = new Set(['a.ts', 'packages/cli/src/index.ts', 'docs/readme.md']);
		const owners = [{ filepath: '*', team: '@n8n-io/catalysts' }];

		const result = assignOwnership(files, owners);

		assert.deepEqual(
			result.get('@n8n-io/catalysts')?.sort(),
			[...files].sort(),
		);
		assert.equal(result.size, 1);
	});

	it('applies last-match-wins: a later specific rule overrides the catch-all', () => {
		const files = new Set([
			'README.md',
			'packages/cli/src/index.ts',
			'packages/cli/src/lib/foo.ts',
		]);
		const owners = [
			{ filepath: '*', team: '@n8n-io/catalysts' },
			{ filepath: 'packages/cli/', team: '@n8n-io/cli-team' },
		];

		const result = assignOwnership(files, owners);

		assert.deepEqual(result.get('@n8n-io/catalysts'), ['README.md']);
		assert.deepEqual(
			result.get('@n8n-io/cli-team')?.sort(),
			['packages/cli/src/index.ts', 'packages/cli/src/lib/foo.ts'].sort(),
		);
	});

	it('matches a directory pattern recursively', () => {
		const files = new Set([
			'packages/cli/src/deep/nested/file.ts',
			'packages/cli/package.json',
		]);
		const owners = [{ filepath: 'packages/cli/', team: '@n8n-io/cli-team' }];

		const result = assignOwnership(files, owners);

		assert.deepEqual(
			result.get('@n8n-io/cli-team')?.sort(),
			[...files].sort(),
		);
	});

	it('matches an exact file pattern only against that file', () => {
		const files = new Set([
			'packages/cli/src/controllers/ai.controller.ts',
			'packages/cli/src/controllers/other.controller.ts',
		]);
		const owners = [
			{
				filepath: 'packages/cli/src/controllers/ai.controller.ts',
				team: '@n8n-io/ai-team',
			},
		];

		const result = assignOwnership(files, owners);

		assert.deepEqual(result.get('@n8n-io/ai-team'), [
			'packages/cli/src/controllers/ai.controller.ts',
		]);
		// the other controller matched no rule, so it must be omitted entirely
		assert.equal(result.size, 1);
	});

	it('omits files that match no rule (no catch-all present)', () => {
		const files = new Set(['unowned/file.ts', 'packages/cli/src/x.ts']);
		const owners = [{ filepath: 'packages/cli/', team: '@n8n-io/cli-team' }];

		const result = assignOwnership(files, owners);

		assert.deepEqual(result.get('@n8n-io/cli-team'), ['packages/cli/src/x.ts']);
		assert.equal(result.size, 1);
	});

	it('returns an empty Map when there are no changed files', () => {
		const owners = [{ filepath: '*', team: '@n8n-io/catalysts' }];
		const result = assignOwnership(new Set(), owners);

		assert.equal(result.size, 0);
	});
});

describe('ownershipsToAllocations', () => {
	it('converts a Map of team -> files into Allocation[] with fileCount', () => {
		const ownerships = new Map([
			['@n8n-io/cli-team', ['a.ts', 'b.ts', 'c.ts']],
			['@n8n-io/catalysts', ['README.md']],
		]);

		const result = ownershipsToAllocations(ownerships);

		assert.deepEqual(result, [
			{ team: '@n8n-io/cli-team', fileCount: 3 },
			{ team: '@n8n-io/catalysts', fileCount: 1 },
		]);
	});

	it('returns an empty array for an empty Map', () => {
		assert.deepEqual(ownershipsToAllocations(new Map()), []);
	});
});
