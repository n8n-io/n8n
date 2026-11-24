import { entityFilePath } from '@/modules/n8n-packages/io/manifest-entry';
import { FORMAT_VERSION } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { PACKAGE_SUBFOLDER } from '../constants';
import { buildPreview, type PreviewSide } from '../promotion-preview';

const PROJECT = { id: 'P', name: 'Platform', target: 'projects/platform-P' };
const OWNED_TARGET = `${PROJECT.target}/credentials/crm-key-C`;
const TOP_LEVEL_TARGET = 'credentials/crm-key-C';

const pathOf = (target: string) => `${PACKAGE_SUBFOLDER}/${entityFilePath('credentials', target)}`;

type CredentialSpec = {
	target: string;
	name?: string;
	type?: string;
	blob?: string;
	/** A workflow of the project that uses the credential. */
	usedBy?: string;
};

function side(
	specs: CredentialSpec[],
	options: { owned?: boolean } = { owned: true },
): PreviewSide {
	const manifest: PackageManifest = {
		packageFormatVersion: FORMAT_VERSION,
		sourceN8nVersion: '2.0.0',
		sourceId: 'source',
		projects: [PROJECT],
		workflows: [
			{
				id: 'wf',
				name: 'Sync leads',
				target: `${PROJECT.target}/workflows/sync-leads-wf`,
				isArchived: false,
			},
		],
		credentials: specs.map(({ target, name = 'CRM key' }) => ({ id: 'C', name, target })),
		requirements: {
			credentials: specs.flatMap(({ usedBy, name = 'CRM key', type = 'httpHeaderAuth' }) =>
				usedBy
					? [{ id: 'C', name, type, usedBy: [{ kind: 'workflow' as const, id: usedBy }] }]
					: [],
			),
		},
	};
	const blobByPath = new Map(specs.map(({ target, blob = 'blob' }) => [pathOf(target), blob]));
	return { manifest, blobByPath, ownedCredentials: options.owned };
}

const preview = (
	base: PreviewSide,
	desired: PreviewSide,
	direction: 'promote' | 'apply' = 'promote',
) =>
	buildPreview({
		operation: { direction, planned: null },
		projectIds: [PROJECT.id],
		base,
		desired,
	});

const credentialRow = (resources: Array<{ type: string }>) =>
	resources.find(({ type }) => type === 'credential') as
		| { change: string; selectable: boolean; parentKey: string | null }
		| undefined;

describe('credentials in the Promote preview', () => {
	describe('A project lists only the credentials that it owns as selectable', () => {
		it('hides a branch credential that the user cannot see, instead of showing it as deleted', () => {
			const visible = new Set<string>();
			const { resources } = preview(
				{ ...side([{ target: OWNED_TARGET }]), visibleCredentialIds: visible },
				{ ...side([]), visibleCredentialIds: visible },
			);

			expect(credentialRow(resources)).toBeUndefined();
		});

		it('does not list an owned credential without the owned-credential option', () => {
			const { resources } = preview(
				side([], { owned: false }),
				side([{ target: OWNED_TARGET }], { owned: false }),
			);

			expect(credentialRow(resources)).toBeUndefined();
		});

		it('keeps a credential that only a workflow uses as context and not selectable', () => {
			const { resources } = preview(side([]), side([{ target: TOP_LEVEL_TARGET, usedBy: 'wf' }]));

			expect(credentialRow(resources)).toMatchObject({ selectable: false, parentKey: null });
		});

		it('does not make a credential selectable on Apply', () => {
			const { resources } = preview(side([]), side([{ target: OWNED_TARGET }]), 'apply');

			expect(credentialRow(resources)).toMatchObject({ selectable: false });
		});
	});

	describe('The package file and the owner folder make a credential change', () => {
		it.each([
			['name', { name: 'CRM token' }],
			['type', { type: 'oAuth2Api' }],
			['expression or other exported field', {}],
		])('shows a different %s as modified', (_field, changed) => {
			const { resources } = preview(
				side([{ target: OWNED_TARGET }]),
				side([{ target: OWNED_TARGET, ...changed, blob: 'other' }]),
			);

			expect(credentialRow(resources)).toMatchObject({ change: 'modified', selectable: true });
		});

		it('shows a credential that the branch holds at the top level as modified', () => {
			const { resources } = preview(
				side([{ target: TOP_LEVEL_TARGET, usedBy: 'wf' }]),
				side([{ target: OWNED_TARGET }]),
			);

			expect(credentialRow(resources)).toMatchObject({ change: 'modified', selectable: true });
		});

		it('does not list a credential whose file is the same', () => {
			const { resources } = preview(
				side([{ target: OWNED_TARGET, blob: 'same' }]),
				side([{ target: OWNED_TARGET, blob: 'same' }]),
			);

			expect(credentialRow(resources)).toBeUndefined();
		});
	});

	describe('Promote never lists a deletion of a credential', () => {
		it('does not list a credential that the branch holds and the instance lacks', () => {
			const { resources } = preview(side([{ target: OWNED_TARGET }]), side([]));

			expect(credentialRow(resources)).toBeUndefined();
		});
	});
});
