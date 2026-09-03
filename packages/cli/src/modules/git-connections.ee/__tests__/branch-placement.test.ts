import type { PackageContents } from '@/modules/n8n-packages/engine/package-contents';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import {
	assertNoCollisions,
	containerPlacement,
	orphanedDependencies,
	pinPath,
	staleTargets,
	variableIds,
} from '../branch-placement';
import type { BranchState } from '../branch-placement';

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

function contents(overrides: Partial<PackageContents> = {}): PackageContents {
	return {
		projects: [],
		folders: [],
		workflows: [],
		credentials: [],
		dataTables: [],
		variables: [],
		tags: [],
		...overrides,
	};
}

const noDeletes = new Set<string>();
const P = 'projects/acme';

const place = (existing: BranchState, staging: PackageManifest) =>
	containerPlacement(existing, staging);

describe('containerPlacement', () => {
	it('pins a renamed container back to the directory the branch uses', () => {
		const existing = { projects: [entry('p1', 'Acme', `${P}`)] };
		const staging = makeManifest({ projects: [entry('p1', 'Acme Corp', 'projects/acme-corp')] });

		const placement = place(existing, staging);

		expect(placement.pins).toEqual([{ from: 'projects/acme-corp', to: P }]);
		// The branch keeps the container's own file, so the rename does not land.
		expect([...placement.keptFiles]).toEqual(['projects/acme-corp/project.json']);
		expect(pinPath('projects/acme-corp/workflows/w1', placement.pins)).toBe(`${P}/workflows/w1`);
	});

	it('applies the deepest pin when a parent and a child were both renamed', () => {
		const existing = {
			folders: [entry('f1', 'A', `${P}/folders/a`), entry('f2', 'C', `${P}/folders/a/c`)],
		};
		const staging = makeManifest({
			folders: [entry('f1', 'B', `${P}/folders/b`), entry('f2', 'D', `${P}/folders/b/d`)],
		});

		const { pins } = place(existing, staging);

		expect(pinPath(`${P}/folders/b/d/workflows/w1`, pins)).toBe(`${P}/folders/a/c/workflows/w1`);
		expect(pinPath(`${P}/folders/b/workflows/w2`, pins)).toBe(`${P}/folders/a/workflows/w2`);
	});

	it('leaves a container the branch lacks at its exported path', () => {
		const existing = { folders: [entry('f1', 'A', `${P}/folders/a`)] };
		const staging = makeManifest({
			folders: [entry('f1', 'B', `${P}/folders/b`), entry('f2', 'New', `${P}/folders/b/new`)],
		});

		const { pins, keptFiles } = place(existing, staging);

		// The new folder is created inside the directory the branch keeps.
		expect(pinPath(`${P}/folders/b/new`, pins)).toBe(`${P}/folders/a/new`);
		expect(keptFiles.has(`${P}/folders/b/new/folder.json`)).toBe(false);
	});
});

describe('staleTargets', () => {
	it('reports the branch directories the export takes over or deletes', () => {
		const existing = {
			workflows: [
				entry('w1', 'kept', 'projects/p/workflows/kept'),
				entry('w2', 'gone', 'projects/p/workflows/gone'),
				entry('w3', 'moved', 'projects/p/workflows/old-name'),
				entry('w4', 'rewritten', 'projects/p/workflows/rewritten'),
			],
		};
		const staging = makeManifest({
			workflows: [
				entry('w3', 'moved', 'projects/p/workflows/new-name'),
				entry('w4', 'rewritten', 'projects/p/workflows/rewritten'),
			],
		});

		const stale = staleTargets(existing, staging, place(existing, staging), new Set(['w2']));

		expect(stale.sort()).toEqual([
			'projects/p/workflows/gone',
			'projects/p/workflows/old-name',
			'projects/p/workflows/rewritten',
		]);
	});

	it('leaves a dependency the export does not carry to the prune after the overlay', () => {
		const existing = {
			workflows: [entry('w1', 'W1', 'projects/p/workflows/w1')],
			credentials: [entry('c1', 'cred', 'projects/p/credentials/cred')],
		};
		const staging = makeManifest({ workflows: [entry('w1', 'W1', 'projects/p/workflows/w1')] });

		const stale = staleTargets(existing, staging, place(existing, staging), noDeletes);

		expect(stale).toEqual(['projects/p/workflows/w1']);
	});

	it('clears the directory of a recreated variable, matched by name and directory', () => {
		const existing = { variables: [entry('v1', 'API_KEY', `${P}/variables/api-key`)] };
		const staging = makeManifest({
			variables: [entry('v2', 'API_KEY', `${P}/variables/api-key`)],
		});

		const stale = staleTargets(existing, staging, place(existing, staging), noDeletes);

		expect(stale).toEqual([`${P}/variables/api-key`]);
	});

	it('keeps a same-named variable that lives in another directory', () => {
		const existing = { variables: [entry('v1', 'API_KEY', 'variables/api-key')] };
		const staging = makeManifest({
			variables: [entry('v2', 'API_KEY', `${P}/variables/api-key`)],
		});

		expect(staleTargets(existing, staging, place(existing, staging), noDeletes)).toEqual([]);
	});

	it('never removes a folder, even when nothing live is left under it', () => {
		const existing = {
			folders: [entry('f1', 'sales', 'projects/p/folders/sales')],
			workflows: [entry('w1', 'W1', 'projects/p/folders/sales/workflows/w1')],
		};
		const staging = makeManifest({
			folders: [entry('f1', 'revenue', 'projects/p/folders/revenue')],
		});

		const stale = staleTargets(existing, staging, place(existing, staging), new Set(['w1']));

		expect(stale).toEqual(['projects/p/folders/sales/workflows/w1']);
	});
});

describe('assertNoCollisions', () => {
	const check = (
		existing: BranchState,
		staging: PackageManifest,
		deleted: Set<string> = noDeletes,
	) => assertNoCollisions(existing, staging, place(existing, staging), deleted);

	it('rejects a push that would put two workflows in one directory', () => {
		const existing = {
			workflows: [
				entry('w-old', 'Report', `${P}/workflows/report`),
				entry('w2', 'Report', `${P}/workflows/report-2`),
			],
		};
		// w-old was deleted, so the exporter allocated w2 -> report, w-new -> report-2.
		const staging = makeManifest({
			workflows: [entry('w-new', 'Report', `${P}/workflows/report-2`)],
		});

		expect(() => check(existing, staging, new Set(['w-old']))).toThrow(
			/same directory .*workflows\/report-2.*Select both/,
		);
	});

	it('accepts the same push once the blocking workflow is selected too', () => {
		const existing = {
			workflows: [
				entry('w-old', 'Report', `${P}/workflows/report`),
				entry('w2', 'Report', `${P}/workflows/report-2`),
			],
		};
		const staging = makeManifest({
			workflows: [
				entry('w2', 'Report', `${P}/workflows/report`),
				entry('w-new', 'Report', `${P}/workflows/report-2`),
			],
		});

		expect(() => check(existing, staging, new Set(['w-old']))).not.toThrow();
	});

	it('accepts a workflow that replaces itself', () => {
		const existing = { workflows: [entry('w1', 'W1', `${P}/workflows/w1`)] };
		const staging = makeManifest({ workflows: [entry('w1', 'W1 renamed', `${P}/workflows/w1`)] });

		expect(() => check(existing, staging)).not.toThrow();
	});

	it('accepts a recreated variable that takes over the directory of the old one', () => {
		const existing = { variables: [entry('v1', 'API_KEY', `${P}/variables/api-key`)] };
		const staging = makeManifest({
			variables: [entry('v2', 'API_KEY', `${P}/variables/api-key`)],
		});

		expect(() => check(existing, staging)).not.toThrow();
	});

	it('accepts a container the branch already holds, pinned onto its own directory', () => {
		const existing = { projects: [entry('p1', 'Acme', P)] };
		const staging = makeManifest({ projects: [entry('p1', 'Acme Corp', 'projects/acme-corp')] });

		expect(() => check(existing, staging)).not.toThrow();
	});
});

describe('orphanedDependencies', () => {
	it('reports what no workflow on the branch uses any more', () => {
		const tree = contents({
			credentials: [entry('c1', 'used'), entry('c2', 'orphan')],
			dataTables: [entry('d1', 'orphan')],
			tags: [entry('t1', 'used')],
			variables: [entry('v1', 'USED'), entry('v2', 'ORPHAN')],
			requirements: {
				credentials: [{ id: 'c1', name: 'used', type: 'api', usedByWorkflows: ['w1'] }],
				tags: [{ id: 't1', name: 'used', usedByWorkflows: ['w1'] }],
				variables: [{ name: 'USED', usedByWorkflows: ['w1'] }],
			},
		});

		expect(
			orphanedDependencies(tree)
				.map((e) => e.id)
				.sort(),
		).toEqual(['c2', 'd1', 'v2']);
	});

	it('reports every dependency when no workflow needs anything', () => {
		const tree = contents({ credentials: [entry('c1')], workflows: [entry('w1')] });

		expect(orphanedDependencies(tree).map((e) => e.id)).toEqual(['c1']);
	});
});

describe('variableIds', () => {
	it('takes the id of a recreated variable from the export and the rest from the branch', () => {
		const existing = {
			variables: [
				entry('v1', 'API_KEY', `${P}/variables/api-key`),
				entry('v2', 'KEPT', `${P}/variables/kept`),
			],
		};
		const staging = makeManifest({
			variables: [entry('v3', 'API_KEY', `${P}/variables/api-key`)],
		});

		const ids = variableIds(existing, staging, place(existing, staging));

		expect(ids.get(`${P}/variables/api-key`)).toBe('v3');
		expect(ids.get(`${P}/variables/kept`)).toBe('v2');
	});

	it('follows a pinned container, so an exported variable keeps the branch directory', () => {
		const existing = { projects: [entry('p1', 'Acme', P)] };
		const staging = makeManifest({
			projects: [entry('p1', 'Acme Corp', 'projects/acme-corp')],
			variables: [entry('v1', 'API_KEY', 'projects/acme-corp/variables/api-key')],
		});

		const ids = variableIds(existing, staging, place(existing, staging));

		expect(ids.get(`${P}/variables/api-key`)).toBe('v1');
	});
});
