import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { containerMoves, remapPath, staleWorkflowTargets } from '../branch-placement';

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

const P = 'projects/acme';
const acme = entry('p1', 'Acme', P);

describe('containerMoves', () => {
	it('moves a renamed project to the path the export uses, so the branch content rides along', () => {
		const existing = makeManifest({
			projects: [acme],
			folders: [entry('f1', 'Sales', `${P}/folders/sales`)],
		});
		const staging = makeManifest({
			projects: [entry('p1', 'Acme Corp', 'projects/acme-corp')],
			workflows: [entry('w1', 'W1', 'projects/acme-corp/workflows/w1')],
		});

		const moves = containerMoves(existing, staging);

		expect(moves).toEqual([{ kind: 'projects', from: P, to: 'projects/acme-corp' }]);
	});

	it('orders the deepest container first when a parent and a child were both renamed', () => {
		const existing = makeManifest({
			folders: [entry('f1', 'A', `${P}/folders/a`), entry('f2', 'C', `${P}/folders/a/c`)],
		});
		const staging = makeManifest({
			folders: [entry('f1', 'B', `${P}/folders/b`), entry('f2', 'D', `${P}/folders/b/d`)],
			workflows: [entry('w1', 'W1', `${P}/folders/b/d/workflows/w1`)],
		});

		// The order is the parking order: the child must leave before the parent moves.
		expect(containerMoves(existing, staging)).toEqual([
			{ kind: 'folders', from: `${P}/folders/a/c`, to: `${P}/folders/b/d` },
			{ kind: 'folders', from: `${P}/folders/a`, to: `${P}/folders/b` },
		]);
	});

	it('creates no move for a container the branch lacks', () => {
		const existing = makeManifest({
			folders: [entry('f1', 'A', `${P}/folders/a`)],
		});
		const staging = makeManifest({
			folders: [entry('f1', 'B', `${P}/folders/b`), entry('f2', 'New', `${P}/folders/b/new`)],
		});

		const moves = containerMoves(existing, staging);

		expect(moves).toEqual([{ kind: 'folders', from: `${P}/folders/a`, to: `${P}/folders/b` }]);
	});

	it('creates no move for a container whose path is unchanged', () => {
		const existing = makeManifest({ projects: [acme] });
		const staging = makeManifest({
			projects: [entry('p1', 'Acme', P)],
			workflows: [entry('w1', 'W1', `${P}/workflows/w1`)],
		});

		expect(containerMoves(existing, staging)).toEqual([]);
	});
});

describe('remapPath', () => {
	const moves = [
		{ kind: 'folders' as const, from: `${P}/folders/a`, to: `${P}/folders/b` },
		{ kind: 'folders' as const, from: `${P}/folders/a/c`, to: `${P}/folders/b/d` },
	];

	it('rewrites through the deepest covering move regardless of move order', () => {
		const target = `${P}/folders/a/c/workflows/w1`;
		expect(remapPath(target, moves)).toBe(`${P}/folders/b/d/workflows/w1`);
		expect(remapPath(target, [...moves].reverse())).toBe(`${P}/folders/b/d/workflows/w1`);
	});

	it('leaves a path no move covers, and does not match a sibling by prefix', () => {
		expect(remapPath(`${P}/folders/ab/workflows/w1`, moves)).toBe(`${P}/folders/ab/workflows/w1`);
		expect(remapPath(`${P}/variables/v1`, moves)).toBe(`${P}/variables/v1`);
	});
});

describe('staleWorkflowTargets', () => {
	it('reports deleted and re-exported workflows, not untouched ones or credentials', () => {
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

		expect(staleWorkflowTargets(before, staging, new Set(['w2'])).sort()).toEqual([
			'projects/p/workflows/gone',
			'projects/p/workflows/old-name',
			'projects/p/workflows/rewritten',
		]);
	});

	it('reports only the selected workflow old path when its folder was renamed', () => {
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

		expect(staleWorkflowTargets(before, staging, new Set())).toEqual([
			'projects/p/folders/sales/workflows/w1',
		]);
	});
});
