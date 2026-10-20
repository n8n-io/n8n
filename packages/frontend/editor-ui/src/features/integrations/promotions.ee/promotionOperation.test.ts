import type { ApplyCheckResult } from '@n8n/api-types';

import { credential, destructiveChange, variable } from './__tests__/bindings.fixtures';
import { billingPreview, billingResources } from './__tests__/preview.fixtures';
import {
	indexBlockers,
	listBlockers,
	scopeCheck,
	toOperationRequest,
	touchesDestructiveChange,
} from './promotionOperation';
import { buildSelectionGraph } from './promotionPreview.selection';

const consumer = (...ids: string[]) => [
	{
		project: { id: 'p1', name: 'Billing' },
		workflows: ids.map((id) => ({ id, name: id })),
	},
];

const check = (preflight: Partial<ApplyCheckResult['preflight']> = {}): ApplyCheckResult => ({
	environmentId: 'environment-1',
	git: { branchName: 'main', commitSha: 'c'.repeat(40) },
	preflight: {
		missingProjects: [],
		missingBindings: [],
		accessRequirements: [],
		conflicts: [],
		warnings: [],
		...preflight,
	},
	movedWorkflows: [],
});

describe('promotion operation', () => {
	it('should send only the selected workflows and leave their shared dependencies to the server', () => {
		const graph = buildSelectionGraph(billingPreview(), 'promote');
		const { reminders, reconciliation } = billingResources;

		// Both workflows include the "Invoices" table, but the request names only the workflows.
		expect(toOperationRequest(graph, new Set([reminders.key, reconciliation.key]))).toEqual({
			workflowIds: ['w1', 'w2'],
		});
	});

	it('should block only the workflows that need a missing binding or moved to another project', () => {
		const index = indexBlockers(
			listBlockers({
				...check({
					missingBindings: [{ ...credential, sourceId: 'c1', consumers: consumer('w1') }],
					conflicts: [{ ...destructiveChange, id: 't1', consumers: consumer('w2') }],
					warnings: [
						{
							kind: 'variable',
							code: 'variable-shadowed',
							name: 'API_URL',
							scope: { kind: 'global' },
							consumers: consumer('w3'),
						},
					],
				}),
				movedWorkflows: [{ id: 'w4', name: 'Format currency', project: { id: 'p2', name: 'Ops' } }],
			}),
		);

		expect([...index.blocked]).toEqual(['workflow:w1', 'workflow:w4']);
		// The tree marks the dependency rows with the same keys as the preview.
		expect(index.byResource.get('credential:c1')?.[0]).toMatchObject({
			kind: 'missing',
			workflowKeys: ['workflow:w1'],
		});
		expect(index.byResource.get('variable:global:API_URL')?.[0].kind).toBe('warning');
		// A data table change that removes values needs a confirmation, but does not block.
		expect(touchesDestructiveChange(index, ['workflow:w2'])).toBe(true);
		expect(touchesDestructiveChange(index, ['workflow:w1', 'workflow:w3'])).toBe(false);
	});

	it('should ignore the blockers of workflows that the preview does not list', () => {
		const graph = buildSelectionGraph(billingPreview(), 'apply');
		// "w99" is unchanged, so the preview does not list it. The check covers it anyway.
		const scoped = scopeCheck(
			check({
				missingBindings: [{ ...variable, consumers: consumer('w1', 'w99') }],
				accessRequirements: [
					{ ...credential, code: 'access-required', consumers: consumer('w99') },
				],
			}),
			graph,
		);

		expect(scoped.preflight.accessRequirements).toEqual([]);
		expect(scoped.preflight.missingBindings[0].consumers[0].workflows).toEqual([
			{ id: 'w1', name: 'w1' },
		]);
	});
});
