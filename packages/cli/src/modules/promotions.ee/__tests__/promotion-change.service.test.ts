import { FORMAT_VERSION } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { scopeManifestToProject } from '../promotion-change.service';

const ids = (entries: Array<{ id: string }> | undefined) => entries?.map(({ id }) => id).sort();

// The global entry comes last on purpose: a name-keyed map would keep it for every project.
const manifest: PackageManifest = {
	packageFormatVersion: FORMAT_VERSION,
	exportedAt: '2026-09-17T00:00:00.000Z',
	sourceN8nVersion: '2.0.0',
	sourceId: 'source',
	projects: [
		{ id: 'A', name: 'Alpha', target: 'projects/alpha-A' },
		{ id: 'B', name: 'Beta', target: 'projects/beta-B' },
	],
	workflows: [
		{ id: 'wfA', name: 'Alpha flow', target: 'projects/alpha-A/workflows/alpha-flow-wfA' },
		{ id: 'wfB', name: 'Beta flow', target: 'projects/beta-B/workflows/beta-flow-wfB' },
	],
	variables: [
		{ id: 'varA', name: 'API_URL', target: 'projects/alpha-A/variables/api-url-varA' },
		{ id: 'varB', name: 'API_URL', target: 'projects/beta-B/variables/api-url-varB' },
		{ id: 'varG', name: 'API_URL', target: 'variables/api-url-varG' },
		{ id: 'varT', name: 'TOKEN', target: 'variables/token-varT' },
	],
	requirements: {
		variables: [
			{ name: 'API_URL', usedByWorkflows: ['wfA', 'wfB'] },
			{ name: 'TOKEN', usedByWorkflows: ['wfB'] },
		],
	},
};

describe('scopeManifestToProject', () => {
	it('keeps the project workflows, its own variable over the global one, and their requirements', () => {
		const scoped = scopeManifestToProject(manifest, 'A');

		expect(ids(scoped.workflows)).toEqual(['wfA']);
		expect(ids(scoped.variables)).toEqual(['varA', 'varT']);
		expect(scoped.requirements?.variables).toEqual([{ name: 'API_URL', usedByWorkflows: ['wfA'] }]);
	});

	it('resolves a shared name to each project regardless of the entry order', () => {
		const reversed = { ...manifest, variables: [...(manifest.variables ?? [])].reverse() };

		expect(ids(scopeManifestToProject(reversed, 'A').variables)).toEqual(['varA', 'varT']);
		expect(ids(scopeManifestToProject(manifest, 'B').variables)).toEqual(['varB', 'varT']);
	});

	it('keeps only global variables and no workflows for a project the manifest does not know', () => {
		const scoped = scopeManifestToProject(manifest, 'C');

		expect(scoped.workflows).toEqual([]);
		expect(ids(scoped.variables)).toEqual(['varG', 'varT']);
		expect(scoped.requirements?.variables).toBeUndefined();
	});
});
