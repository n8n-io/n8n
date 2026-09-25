import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { containerPlacement, pinPath, staleWorkflowTargets } from '../branch-placement';

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

describe('containerPlacement', () => {
	it('pins a renamed project so the selection lands in the directory the branch holds', () => {
		const existing = makeManifest({
			projects: [acme],
			folders: [entry('f1', 'Sales', `${P}/folders/sales`)],
		});
		const staging = makeManifest({
			projects: [entry('p1', 'Acme Corp', 'projects/acme-corp')],
			workflows: [entry('w1', 'W1', 'projects/acme-corp/workflows/w1')],
		});

		const placement = containerPlacement(existing, staging);

		expect(pinPath('projects/acme-corp/workflows/w1', placement.pins)).toBe(`${P}/workflows/w1`);
		expect(placement.keptFiles.has('projects/acme-corp/project.json')).toBe(true);
	});

	it('applies the deepest pin when a parent and a child were both renamed', () => {
		const existing = makeManifest({
			folders: [entry('f1', 'A', `${P}/folders/a`), entry('f2', 'C', `${P}/folders/a/c`)],
		});
		const staging = makeManifest({
			folders: [entry('f1', 'B', `${P}/folders/b`), entry('f2', 'D', `${P}/folders/b/d`)],
			workflows: [entry('w1', 'W1', `${P}/folders/b/d/workflows/w1`)],
		});

		const placement = containerPlacement(existing, staging);

		expect(pinPath(`${P}/folders/b/d/workflows/w1`, placement.pins)).toBe(
			`${P}/folders/a/c/workflows/w1`,
		);
	});

	it('creates no pin for a folder the branch lacks', () => {
		const existing = makeManifest({
			folders: [entry('f1', 'A', `${P}/folders/a`)],
		});
		const staging = makeManifest({
			folders: [entry('f1', 'B', `${P}/folders/b`), entry('f2', 'New', `${P}/folders/b/new`)],
		});

		const placement = containerPlacement(existing, staging);

		expect(pinPath(`${P}/folders/b/new/workflows/w1`, placement.pins)).toBe(
			`${P}/folders/a/new/workflows/w1`,
		);
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

		expect(staleWorkflowTargets(before, staging, new Set())).toEqual([
			'projects/p/folders/sales/workflows/w1',
		]);
	});
});
