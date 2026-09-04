import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { mergeManifests, staleTargets } from '../manifest-merge';

const baseMetadata = {
	packageFormatVersion: '1' as const,
	exportedAt: '2026-01-01T00:00:00.000Z',
	sourceN8nVersion: '1.0.0',
	sourceId: 'instance-1',
};

function makeManifest(overrides: Partial<PackageManifest> = {}): PackageManifest {
	return { ...baseMetadata, ...overrides };
}

function entry(id: string, name = `name-${id}`, target = `target/${id}`) {
	return { id, name, target };
}

function credReq(id: string, usedByWorkflows: string[]) {
	return { id, name: `cred-${id}`, type: 'api', usedByWorkflows };
}

const noDeletes = new Set<string>();
const P = 'projects/acme';
const OTHER = 'projects/other';
const acme = entry('p1', 'Acme', P);

/** The selected project is always `p1`, the only subtree a push prunes. */
const merge = (
	existing: PackageManifest,
	staging: PackageManifest,
	deletes: Set<string> = noDeletes,
) => mergeManifests(existing, staging, deletes, 'p1');

describe('mergeManifests', () => {
	it('adds, replaces and deletes workflows in one merge', () => {
		const existing = makeManifest({ workflows: [entry('w1'), entry('w2'), entry('w3')] });
		const staging = makeManifest({ workflows: [entry('w2', 'updated-w2'), entry('w4')] });

		const result = merge(existing, staging, new Set(['w3']));

		expect(result.workflows!.map((w) => w.id)).toEqual(['w1', 'w2', 'w4']);
		expect(result.workflows!.find((w) => w.id === 'w2')!.name).toBe('updated-w2');
	});

	describe('renamed containers', () => {
		it('leaves a renamed project where the branch has it and lands the selection inside', () => {
			const existing = makeManifest({
				projects: [acme],
				folders: [entry('f1', 'Sales', `${P}/folders/sales`)],
				workflows: [
					entry('w1', 'W1', `${P}/workflows/w1`),
					entry('w2', 'W2', `${P}/folders/sales/workflows/w2`),
				],
				credentials: [entry('c1', 'Cred', `${P}/credentials/cred`)],
				requirements: { credentials: [credReq('c1', ['w2'])] },
			});
			const staging = makeManifest({
				projects: [entry('p1', 'Acme Corp', 'projects/acme-corp')],
				workflows: [entry('w1', 'W1 renamed', 'projects/acme-corp/workflows/w1')],
			});

			const result = merge(existing, staging);

			expect(result.projects).toEqual([acme]);
			expect(result.folders).toEqual([entry('f1', 'Sales', `${P}/folders/sales`)]);
			expect(result.workflows).toEqual([
				entry('w2', 'W2', `${P}/folders/sales/workflows/w2`),
				entry('w1', 'W1 renamed', `${P}/workflows/w1`),
			]);
			expect(result.credentials).toEqual([entry('c1', 'Cred', `${P}/credentials/cred`)]);
		});

		it('applies the deepest pin when a parent and a child were both renamed', () => {
			const existing = makeManifest({
				folders: [entry('f1', 'A', `${P}/folders/a`), entry('f2', 'C', `${P}/folders/a/c`)],
				workflows: [entry('w2', 'W2', `${P}/folders/a/c/workflows/w2`)],
			});
			const staging = makeManifest({
				folders: [entry('f1', 'B', `${P}/folders/b`), entry('f2', 'D', `${P}/folders/b/d`)],
				workflows: [entry('w1', 'W1', `${P}/folders/b/d/workflows/w1`)],
			});

			const result = merge(existing, staging);

			expect(result.folders!.map((f) => f.target)).toEqual([`${P}/folders/a`, `${P}/folders/a/c`]);
			expect(result.workflows!.map((w) => w.target)).toEqual([
				`${P}/folders/a/c/workflows/w2`,
				`${P}/folders/a/c/workflows/w1`,
			]);
		});

		it('creates a folder the branch lacks, inside the directory the branch keeps', () => {
			const existing = makeManifest({
				folders: [entry('f1', 'A', `${P}/folders/a`)],
			});
			const staging = makeManifest({
				folders: [entry('f1', 'B', `${P}/folders/b`), entry('f2', 'New', `${P}/folders/b/new`)],
				workflows: [entry('w1', 'W1', `${P}/folders/b/new/workflows/w1`)],
			});

			const result = merge(existing, staging);

			expect(result.folders).toEqual([
				entry('f1', 'A', `${P}/folders/a`),
				entry('f2', 'New', `${P}/folders/a/new`),
			]);
			expect(result.workflows).toEqual([entry('w1', 'W1', `${P}/folders/a/new/workflows/w1`)]);
		});

		it('rejects a merge that puts two entries in one directory', () => {
			const existing = makeManifest({
				workflows: [
					entry('w-old', 'Report', `${P}/workflows/report`),
					entry('w2', 'Report', `${P}/workflows/report-2`),
				],
			});
			// w-old was deleted, so the exporter allocated w2 -> report, w-new -> report-2.
			const staging = makeManifest({
				workflows: [entry('w-new', 'Report', `${P}/workflows/report-2`)],
			});

			expect(() => merge(existing, staging, new Set(['w-old']))).toThrow(
				/same directory .*workflows\/report-2.*Select both/,
			);
		});
	});

	describe('dependencies', () => {
		it('keeps a branch dependency that only unselected workflows use', () => {
			const existing = makeManifest({
				projects: [acme],
				workflows: [entry('w1', 'W1', `${P}/workflows/w1`)],
				credentials: [entry('c1', 'C1', `${P}/credentials/c1`)],
				requirements: { credentials: [credReq('c1', ['w1'])] },
			});
			const staging = makeManifest({
				projects: [acme],
				workflows: [entry('w2', 'W2', `${P}/workflows/w2`)],
				credentials: [entry('c2', 'C2', `${P}/credentials/c2`)],
				requirements: { credentials: [credReq('c2', ['w2'])] },
			});

			const result = merge(existing, staging);

			expect(result.credentials!.map((c) => c.id)).toEqual(['c1', 'c2']);
			expect(result.requirements!.credentials).toEqual([
				credReq('c1', ['w1']),
				credReq('c2', ['w2']),
			]);
		});

		it('drops a dependency when the replaced workflow no longer uses it', () => {
			const existing = makeManifest({
				projects: [acme],
				workflows: [entry('w1', 'W1', `${P}/workflows/w1`), entry('w2', 'W2', `${P}/workflows/w2`)],
				credentials: [
					entry('c1', 'C1', `${P}/credentials/c1`),
					entry('c2', 'C2', `${P}/credentials/c2`),
				],
				requirements: { credentials: [credReq('c1', ['w1']), credReq('c2', ['w1', 'w2'])] },
			});
			// w1 is pushed again and now uses neither credential.
			const staging = makeManifest({
				projects: [acme],
				workflows: [entry('w1', 'W1', `${P}/workflows/w1`)],
			});

			const result = merge(existing, staging);

			expect(result.credentials).toEqual([entry('c2', 'C2', `${P}/credentials/c2`)]);
			expect(result.requirements!.credentials).toEqual([credReq('c2', ['w2'])]);
		});

		it('prunes variable entries by name and merges their requirements by name', () => {
			const existing = makeManifest({
				projects: [acme],
				workflows: [entry('w1', 'W1', `${P}/workflows/w1`)],
				variables: [
					entry('v1', 'API_KEY', `${P}/variables/api-key`),
					entry('v2', 'OLD_URL', `${P}/variables/old-url`),
				],
				requirements: {
					variables: [
						{ name: 'API_KEY', usedByWorkflows: ['w1'] },
						{ name: 'OLD_URL', usedByWorkflows: ['w1'] },
					],
				},
			});
			const staging = makeManifest({
				projects: [acme],
				workflows: [entry('w1', 'W1', `${P}/workflows/w1`)],
				variables: [
					entry('v1', 'API_KEY', `${P}/variables/api-key`),
					entry('v3', 'BASE_URL', `${P}/variables/base-url`),
				],
				requirements: {
					variables: [
						{ name: 'API_KEY', usedByWorkflows: ['w1'] },
						{ name: 'BASE_URL', usedByWorkflows: ['w1'] },
					],
				},
			});

			const result = merge(existing, staging);

			expect(result.variables!.map((v) => v.name)).toEqual(['API_KEY', 'BASE_URL']);
			expect(result.requirements!.variables!.map((v) => v.name)).toEqual(['API_KEY', 'BASE_URL']);
		});

		it('replaces a recreated variable that has a new id but the same name in the same directory', () => {
			const existing = makeManifest({
				projects: [acme],
				workflows: [entry('w1', 'W1', `${P}/workflows/w1`)],
				variables: [entry('v1', 'API_KEY', `${P}/variables/api-key`)],
				requirements: { variables: [{ name: 'API_KEY', usedByWorkflows: ['w1'] }] },
			});
			const staging = makeManifest({
				projects: [acme],
				workflows: [entry('w1', 'W1', `${P}/workflows/w1`)],
				variables: [entry('v2', 'API_KEY', `${P}/variables/api-key`)],
				requirements: { variables: [{ name: 'API_KEY', usedByWorkflows: ['w1'] }] },
			});

			const result = merge(existing, staging);

			expect(result.variables).toEqual([entry('v2', 'API_KEY', `${P}/variables/api-key`)]);
			// The old directory is cleared before the overlay writes the new file.
			expect(staleTargets(existing, result, staging)).toContain(`${P}/variables/api-key`);
		});

		it('keeps a same-named variable that lives in another directory', () => {
			const existing = makeManifest({
				projects: [acme],
				workflows: [entry('w1', 'W1', `${P}/workflows/w1`), entry('w2', 'W2', `${P}/workflows/w2`)],
				variables: [entry('v1', 'API_KEY', 'variables/api-key')],
				requirements: { variables: [{ name: 'API_KEY', usedByWorkflows: ['w1', 'w2'] }] },
			});
			const staging = makeManifest({
				projects: [acme],
				workflows: [entry('w1', 'W1', `${P}/workflows/w1`)],
				variables: [entry('v2', 'API_KEY', `${P}/variables/api-key`)],
				requirements: { variables: [{ name: 'API_KEY', usedByWorkflows: ['w1'] }] },
			});

			const result = merge(existing, staging);

			expect(result.variables).toEqual([
				entry('v1', 'API_KEY', 'variables/api-key'),
				entry('v2', 'API_KEY', `${P}/variables/api-key`),
			]);
		});

		it('keeps the old key of a renamed variable as a reference-only requirement for unselected users', () => {
			// The variable was renamed on the instance, so no value exists under the
			// old key anymore. The unselected workflow keeps its reference; only the
			// bundled entry follows the rename.
			const existing = makeManifest({
				projects: [acme],
				workflows: [entry('w1', 'W1', `${P}/workflows/w1`), entry('w2', 'W2', `${P}/workflows/w2`)],
				variables: [entry('v1', 'OLD_KEY', `${P}/variables/old_key`)],
				requirements: { variables: [{ name: 'OLD_KEY', usedByWorkflows: ['w1', 'w2'] }] },
			});
			const staging = makeManifest({
				projects: [acme],
				workflows: [entry('w1', 'W1', `${P}/workflows/w1`)],
				variables: [entry('v1', 'NEW_KEY', `${P}/variables/new_key`)],
				requirements: { variables: [{ name: 'NEW_KEY', usedByWorkflows: ['w1'] }] },
			});

			const result = merge(existing, staging);

			expect(result.variables).toEqual([entry('v1', 'NEW_KEY', `${P}/variables/new_key`)]);
			expect(result.requirements!.variables).toEqual([
				{ name: 'OLD_KEY', usedByWorkflows: ['w2'] },
				{ name: 'NEW_KEY', usedByWorkflows: ['w1'] },
			]);
		});

		it('merges nodeType requirements by type@version', () => {
			const http = { type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2 };
			const existing = makeManifest({
				workflows: [entry('w1')],
				requirements: { nodeTypes: [{ ...http, usedByWorkflows: ['w1'] }] },
			});
			const staging = makeManifest({
				workflows: [entry('w2')],
				requirements: {
					nodeTypes: [
						{ ...http, usedByWorkflows: ['w2'] },
						{ type: 'n8n-nodes-base.slack', typeVersion: 2.1, usedByWorkflows: ['w2'] },
					],
				},
			});

			const result = merge(existing, staging);

			expect(result.requirements!.nodeTypes).toEqual([
				{ ...http, usedByWorkflows: ['w1', 'w2'] },
				{ type: 'n8n-nodes-base.slack', typeVersion: 2.1, usedByWorkflows: ['w2'] },
			]);
		});

		it('keeps reference-only sub-workflow requirements', () => {
			const staging = makeManifest({
				workflows: [entry('w1')],
				requirements: { workflows: [{ id: 'w-sub', usedByWorkflows: ['w1'] }] },
			});

			const result = merge(makeManifest(), staging);

			expect(result.requirements!.workflows).toEqual([{ id: 'w-sub', usedByWorkflows: ['w1'] }]);
		});
	});

	describe('pruning stays inside the selected project', () => {
		// One push, three unused credentials. Only the one in the pushed project
		// may go: the push states what changed in `p1` and knows nothing fresh
		// about the rest of the branch.
		const existing = makeManifest({
			projects: [acme, entry('p2', 'Other', OTHER)],
			workflows: [entry('w1', 'W1', `${P}/workflows/w1`)],
			credentials: [
				entry('c1', 'In the pushed project', `${P}/credentials/c1`),
				entry('c2', 'In another project', `${OTHER}/credentials/c2`),
				entry('c3', 'Outside every project', 'credentials/c3'),
			],
			requirements: { credentials: [credReq('c1', ['w1'])] },
		});
		// w1 is pushed again and drops c1, so nothing references any of the three.
		const staging = makeManifest({
			projects: [acme],
			workflows: [entry('w1', 'W1', `${P}/workflows/w1`)],
		});

		it('drops the unused dependency of the selected project and keeps the others', () => {
			const result = merge(existing, staging);

			expect(result.credentials!.map((c) => c.id)).toEqual(['c2', 'c3']);
		});

		it('removes only the directory of the dependency it dropped', () => {
			const result = merge(existing, staging);

			expect(staleTargets(existing, result, staging).sort()).toEqual([
				`${P}/credentials/c1`,
				`${P}/workflows/w1`,
			]);
		});

		it('prunes nothing when the branch does not hold the selected project yet', () => {
			const firstPush = makeManifest({
				projects: [acme],
				workflows: [entry('w1', 'W1', `${P}/workflows/w1`)],
			});

			const result = mergeManifests(makeManifest(), firstPush, noDeletes, 'p1');

			expect(result.workflows).toEqual([entry('w1', 'W1', `${P}/workflows/w1`)]);
		});
	});
});

describe('staleTargets', () => {
	it('reports removed, moved and re-exported leaf entries, not untouched ones', () => {
		const before = makeManifest({
			projects: [entry('p1', 'P', 'projects/p')],
			workflows: [
				entry('w1', 'kept', 'projects/p/workflows/kept'),
				entry('w2', 'gone', 'projects/p/workflows/gone'),
				entry('w3', 'moved', 'projects/p/workflows/old-name'),
				entry('w4', 'rewritten', 'projects/p/workflows/rewritten'),
			],
			credentials: [entry('c1', 'cred', 'projects/p/credentials/cred')],
		});
		const staging = makeManifest({
			workflows: [
				entry('w3', 'moved', 'projects/p/workflows/new-name'),
				entry('w4', 'rewritten', 'projects/p/workflows/rewritten'),
			],
		});
		const after = merge(before, staging, new Set(['w2']));

		expect(staleTargets(before, after, staging).sort()).toEqual([
			'projects/p/credentials/cred',
			'projects/p/workflows/gone',
			'projects/p/workflows/old-name',
			'projects/p/workflows/rewritten',
		]);
	});

	it('leaves a renamed folder in place and only replaces the selected workflow', () => {
		const before = makeManifest({
			folders: [entry('f1', 'sales', 'projects/p/folders/sales')],
			workflows: [
				entry('w1', 'W1', 'projects/p/folders/sales/workflows/w1'),
				entry('w2', 'W2', 'projects/p/folders/sales/workflows/w2'),
			],
		});
		const staging = makeManifest({
			folders: [entry('f1', 'revenue', 'projects/p/folders/revenue')],
			workflows: [entry('w1', 'W1', 'projects/p/folders/revenue/workflows/w1')],
		});
		const after = merge(before, staging);

		expect(staleTargets(before, after, staging)).toEqual(['projects/p/folders/sales/workflows/w1']);
	});

	it('never removes a folder, even when nothing live is left under it', () => {
		const before = makeManifest({
			folders: [entry('f1', 'sales', 'projects/p/folders/sales')],
			workflows: [entry('w1', 'W1', 'projects/p/folders/sales/workflows/w1')],
		});
		const after = makeManifest({ folders: [entry('f1', 'sales', 'projects/p/folders/sales')] });

		expect(staleTargets(before, after, makeManifest())).toEqual([
			'projects/p/folders/sales/workflows/w1',
		]);
	});
});
