import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseOwnersFile, teamHandleToSlug } from './owners.mjs';
import { TEAMS, collectImporters, decideOwner } from './resolve-dependency-owners.mjs';

/**
 * Run these tests by running
 *
 * node --test ./.github/scripts/owners/resolve-dependency-owners.test.mjs
 * */

const workspace = new Set(['@n8n/a', '@n8n/b', '@n8n/c', 'n8n-tooling']);

const importerDirs = new Map([
	['@n8n/a', 'packages/a'],
	['@n8n/b', 'packages/b'],
	['@n8n/c', 'packages/c'],
	['n8n-tooling', 'packages/tooling'],
]);

const entries = [
	{ pattern: '*', team: '@n8n-io/qa-dx', required: false, line: 1 },
	{ pattern: 'packages/a/', team: '@n8n-io/nodes', required: false, line: 2 },
	{ pattern: 'packages/b/', team: '@n8n-io/iam', required: false, line: 3 },
	{ pattern: 'packages/c/', team: '@n8n-io/unknown-team', required: false, line: 4 },
];

const teams = {
	'qa-dx': { linearTeam: 'Developer Platform' },
	nodes: { linearTeam: 'NODES' },
	iam: { linearTeam: 'Identity & Access' },
};

/** @param {import('./resolve-dependency-owners.mjs').Importer[]} importers */
const decide = (importers) =>
	decideOwner({ packageName: 'dep', importers, importerDirs, entries, teams });

describe('collectImporters', () => {
	it('marks direct and transitive importers and records the direct dependency that pulls it in', () => {
		const trees = [
			{
				name: 'dep',
				dependents: [
					{ name: '@n8n/a', depField: 'dependencies' },
					{ name: 'axios', dependents: [{ name: '@n8n/b', depField: 'dependencies' }] },
				],
			},
		];

		assert.deepEqual(collectImporters(trees, workspace), [
			{ name: '@n8n/a', direct: true, dev: false, via: [] },
			{ name: '@n8n/b', direct: false, dev: false, via: ['axios'] },
		]);
	});

	it('treats an importer as dev-only only when every path is a devDependency', () => {
		const trees = [
			{
				name: 'dep',
				dependents: [
					{ name: 'vitest', dependents: [{ name: '@n8n/a', depField: 'devDependencies' }] },
					{ name: 'axios', dependents: [{ name: '@n8n/a', depField: 'dependencies' }] },
					{ name: 'vite', dependents: [{ name: '@n8n/b', depField: 'devDependencies' }] },
				],
			},
		];

		const importers = collectImporters(trees, workspace);
		assert.equal(importers.find((i) => i.name === '@n8n/a')?.dev, false);
		assert.equal(importers.find((i) => i.name === '@n8n/b')?.dev, true);
	});
});

describe('decideOwner', () => {
	it('picks the single team that uses the dependency directly in production', () => {
		const result = decide([
			{ name: '@n8n/a', direct: true, dev: false, via: [] },
			{ name: '@n8n/b', direct: false, dev: false, via: ['axios'] },
		]);

		assert.equal(result.decision, 'single');
		assert.equal(result.linearTeam, 'NODES');
		assert.deepEqual(result.candidateTeams, ['NODES']);
	});

	it('round-robins between the teams when several use it', () => {
		const result = decide([
			{ name: '@n8n/a', direct: false, dev: false, via: ['axios'] },
			{ name: '@n8n/b', direct: false, dev: false, via: ['axios'] },
		]);

		assert.equal(result.decision, 'round-robin');
		assert.equal(result.linearTeam, '');
		assert.deepEqual(result.candidateTeams, ['Identity & Access', 'NODES']);
	});

	it('gives dev-only dependencies to the OWNERS catch-all team as tooling', () => {
		const result = decide([{ name: '@n8n/a', direct: true, dev: true, via: [] }]);

		assert.equal(result.decision, 'tooling');
		assert.equal(result.linearTeam, 'Developer Platform');
	});

	it('reports owners with no Linear team and leaves them out of the candidates', () => {
		const result = decide([
			{ name: '@n8n/a', direct: true, dev: false, via: [] },
			{ name: '@n8n/c', direct: true, dev: false, via: [] },
		]);

		assert.equal(result.decision, 'single');
		assert.deepEqual(result.unmapped, ['unknown-team']);
	});

	it('returns no owner when no workspace package uses the dependency', () => {
		const result = decide([]);

		assert.equal(result.decision, 'none');
		assert.deepEqual(result.candidateTeams, []);
	});
});

describe('teams.json', () => {
	it('maps every team in the real OWNERS file to a Linear team', () => {
		const slugs = new Set(parseOwnersFile().map((entry) => teamHandleToSlug(entry.team)));
		const missing = [...slugs].filter((slug) => !TEAMS[slug]?.linearTeam);

		assert.deepEqual(missing, [], 'add these OWNERS teams to teams.json');
	});
});
