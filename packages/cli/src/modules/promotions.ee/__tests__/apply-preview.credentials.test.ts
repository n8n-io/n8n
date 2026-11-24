import type { PackageImportPlan } from '@/modules/n8n-packages/engine/project-package-importer';
import type { SelectedCredentialPlan } from '@/modules/n8n-packages/entities/credential/credential.types';

import { plannedChanges } from '../apply-preview';

/** A plan with no work, except for the selected credentials. */
function planWith(selected: SelectedCredentialPlan): PackageImportPlan {
	return {
		projectPlan: { items: [] },
		scopes: [
			{
				project: { id: 'p1' },
				plan: {
					credentialPlan: { successes: new Map(), updates: [], failures: [], selected },
					variablePlan: { matched: [] },
					folderPlan: { items: [] },
					tagPlan: { matched: [], creations: [], renames: [], reconciles: [] },
					dataTablePlan: {
						matched: [],
						columnAlignments: [],
						creations: [],
						updates: [],
						failures: [],
					},
				},
			},
		],
	} as unknown as PackageImportPlan;
}

describe('the planned changes of selected credentials', () => {
	it('maps each outcome of the selected-credential step to a change', () => {
		const changes = plannedChanges(
			planWith({
				creations: [{ sourceId: 'c-new', name: 'Stripe', type: 'stripeApi' }],
				updates: [
					{
						sourceId: 'c-renamed',
						targetId: 'c-renamed',
						targetName: 'Old Stripe',
						targetType: 'stripeApi',
						ownerProjectId: 'p1',
						name: 'Stripe',
						usedBy: [],
					},
				],
				unchanged: [{ id: 'c-same', name: 'Slack' }],
				ownedElsewhere: [{ id: 'c-foreign', name: 'Shared key' }],
			}),
		);

		expect(Object.fromEntries(changes)).toEqual({
			'credential:c-new': { change: 'added' },
			'credential:c-renamed': { change: 'modified', previousName: 'Old Stripe' },
			'credential:c-same': { change: 'unchanged', name: 'Slack' },
			'credential:c-foreign': { change: 'unchanged' },
		});
	});
});
