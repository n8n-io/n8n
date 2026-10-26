import type { User } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { entityFilePath } from '@/modules/n8n-packages/io/manifest-entry';
import { FORMAT_VERSION } from '@/modules/n8n-packages/spec/constants';
import {
	packageManifestSchema,
	type PackageManifest,
} from '@/modules/n8n-packages/spec/manifest.schema';

import { PACKAGE_SUBFOLDER } from '../constants';
import { PromotionChangeService } from '../promotion-change.service';
import { buildPreview, scopeManifestToProject, type PreviewSide } from '../promotion-preview';

const ids = (entries: Array<{ id: string }> | undefined) => entries?.map(({ id }) => id).sort();

// The global entry comes last on purpose: a name-keyed map would keep it for every project.
const manifest: PackageManifest = {
	packageFormatVersion: FORMAT_VERSION,
	sourceN8nVersion: '2.0.0',
	sourceId: 'source',
	projects: [
		{ id: 'A', name: 'Alpha', target: 'projects/alpha-A' },
		{ id: 'B', name: 'Beta', target: 'projects/beta-B' },
	],
	workflows: [
		{
			id: 'wfA',
			name: 'Alpha flow',
			target: 'projects/alpha-A/workflows/alpha-flow-wfA',
			isArchived: false,
		},
		{
			id: 'wfB',
			name: 'Beta flow',
			target: 'projects/beta-B/workflows/beta-flow-wfB',
			isArchived: false,
		},
	],
	variables: [
		{ id: 'varA', name: 'API_URL', target: 'projects/alpha-A/variables/api-url-varA' },
		{ id: 'varB', name: 'API_URL', target: 'projects/beta-B/variables/api-url-varB' },
		{ id: 'varG', name: 'API_URL', target: 'variables/api-url-varG' },
		{ id: 'varT', name: 'TOKEN', target: 'variables/token-varT' },
	],
	requirements: {
		variables: [
			{
				name: 'API_URL',
				usedBy: [
					{ kind: 'workflow', id: 'wfA' },
					{ kind: 'workflow', id: 'wfB' },
					{ kind: 'agent', id: 'wfA' },
				],
			},
			{
				name: 'TOKEN',
				usedBy: [
					{ kind: 'workflow', id: 'wfB' },
					{ kind: 'agent', id: 'wfA' },
				],
			},
		],
	},
};

describe('scopeManifestToProject', () => {
	it('keeps the project workflows, its own variable over the global one, and their requirements', () => {
		const scoped = scopeManifestToProject(manifest, 'A');

		expect(ids(scoped.workflows)).toEqual(['wfA']);
		expect(ids(scoped.variables)).toEqual(['varA', 'varT']);
		expect(scoped.requirements?.variables).toEqual([
			{ name: 'API_URL', usedBy: [{ kind: 'workflow', id: 'wfA' }] },
		]);
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

describe('buildPreview', () => {
	const target = 'projects/alpha-A/workflows/alpha-flow-wfA';
	const side = (workflow: Record<string, unknown>, blobSha: string): PreviewSide => ({
		manifest: packageManifestSchema.parse({
			...manifest,
			variables: undefined,
			requirements: undefined,
			workflows: [{ id: 'wfA', name: 'Alpha flow', target, ...workflow }],
		}),
		blobByPath: new Map([[`${PACKAGE_SUBFOLDER}/${entityFilePath('workflows', target)}`, blobSha]]),
	});
	const changeOf = (desired: PreviewSide) =>
		buildPreview({
			operation: null,
			projectIds: ['A'],
			base: side({}, 'before'),
			desired,
		}).resources.find(({ key }) => key === 'workflow:wfA')?.change;

	it('labels a changed workflow by the archive flag of its manifest entry', () => {
		expect(changeOf(side({ isArchived: true }, 'after'))).toBe('archived');
		expect(changeOf(side({ isArchived: false }, 'after'))).toBe('modified');
	});

	it('labels a changed workflow of a package without the flag as modified', () => {
		expect(changeOf(side({}, 'after'))).toBe('modified');
	});
});

describe('PromotionChangeService preview permission', () => {
	const service = new PromotionChangeService(
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
	);
	// The read scope passes the route decorator, but not the check for each direction.
	const reader = { role: { slug: 'custom', scopes: [{ slug: 'promotions:read' }] } } as User;

	it.each(['promote', 'apply'] as const)(
		'names the promotions:%s scope when the user lacks it',
		async (direction) => {
			const details = service.getDetails(reader, 'project1', direction, {
				commitSha: null,
				keys: [],
			});

			await expect(details).rejects.toThrow(ForbiddenError);
			await expect(details).rejects.toThrow(`requires the promotions:${direction} scope`);
		},
	);
});
