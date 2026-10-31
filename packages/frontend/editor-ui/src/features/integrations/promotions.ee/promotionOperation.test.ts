import type { ApplyCheckResult } from './promotions.types';

import { credential, destructiveChange, variable } from './__tests__/bindings.fixtures';
import { billingPreview, billingResources } from './__tests__/preview.fixtures';
import {
	indexBlockers,
	listBlockers,
	crossProjectMoveBlockers,
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

const check = (fields: Partial<ApplyCheckResult> = {}): ApplyCheckResult => ({
	environmentId: 'environment-1',
	git: { branchName: 'main', commitSha: 'c'.repeat(40) },
	missingProjects: [],
	missingBindings: [],
	accessRequirements: [],
	conflicts: [],
	warnings: [],
	movedWorkflows: [],
	movedFolders: [],
	...fields,
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
			listBlockers(
				{
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
					movedWorkflows: [
						{
							id: 'w4',
							name: 'Format currency',
							project: { id: 'p2', name: 'Ops' },
							projectExists: true,
							instanceProject: { id: 'p1', name: 'Billing' },
						},
					],
					movedFolders: [],
				},
				[],
			),
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

	it('should mark a moved folder row as blocking without blocking a workflow', () => {
		const index = indexBlockers(
			listBlockers(
				{
					...check(),
					movedFolders: [
						{
							id: 'f1',
							name: 'Payments',
							project: { id: 'p2', name: 'Ops' },
							projectExists: true,
							instanceProject: { id: 'p1', name: 'Billing' },
						},
					],
				},
				[],
			),
		);

		expect(index.byResource.get('folder:f1')?.[0]).toMatchObject({
			kind: 'moved',
			workflowKeys: [],
		});
		expect([...index.blocked]).toEqual([]);
	});

	it('should block a workflow that moved out of or into the project on promote', () => {
		const preview = billingPreview();
		const graph = buildSelectionGraph(
			{
				...preview,
				resources: preview.resources.map((resource) => {
					if (resource.key === 'workflow:w2') {
						return { ...resource, change: 'deleted', movedToProject: { id: 'p2', name: 'Ops' } };
					}
					if (resource.key === 'workflow:w3') {
						return { ...resource, change: 'added', movedFromProject: { id: 'p2', name: 'Ops' } };
					}
					return resource;
				}),
			},
			'promote',
		);

		expect([...indexBlockers(crossProjectMoveBlockers(graph)).blocked].sort()).toEqual([
			'workflow:w2',
			'workflow:w3',
		]);
	});

	it('should block every listed workflow for a project-wide conflict', () => {
		const listed = ['workflow:w1', 'workflow:w2', 'workflow:w3'];
		const project = { id: 'p1', name: 'Billing' };
		const blockersOf = (conflicts: ApplyCheckResult['conflicts']) =>
			indexBlockers(listBlockers(check({ conflicts }), listed));

		const tagConflict = blockersOf([
			{
				kind: 'tag',
				code: 'tag-conflict',
				id: 't1',
				reason: 'name-collision',
				consumers: consumer('w3'),
			},
		]);
		expect([...tagConflict.byResource.keys()]).toEqual(['tag:t1']);
		const checkNotRun = blockersOf([
			{ kind: 'project', code: 'check-not-run', project, reason: 'contentImport' },
		]);
		expect([...checkNotRun.blocked]).toEqual(listed);
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

		expect(scoped.accessRequirements).toEqual([]);
		expect(scoped.missingBindings[0].consumers[0].workflows).toEqual([{ id: 'w1', name: 'w1' }]);
	});
});
