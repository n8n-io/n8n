import type { ApplyCheckResult } from './promotions.types';

import { credential, destructiveChange, variable } from './__tests__/bindings.fixtures';
import {
	archivedWorkflow,
	notOnBranchCredential,
	otherProjectCredential,
	outsideAccessWorkflow,
	personalCredential,
	repeatedBinding,
	targetNotSelectedWorkflow,
	targetSelectedWorkflow,
	unreachableCredential,
	unreachableWorkflow,
} from './__tests__/missingDependencies.fixtures';
import { billingPreview, billingResources, resource } from './__tests__/preview.fixtures';
import {
	indexBlockers,
	indexByWorkflow,
	isWarningDependency,
	listBlockers,
	listOnlyDependencies,
	crossProjectMoveBlockers,
	scopeCheck,
	scopeNonBlockingToSelection,
	scopeToSelection,
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

const noSelection: ReadonlySet<string> = new Set();

const check = (fields: Partial<ApplyCheckResult> = {}): ApplyCheckResult => ({
	environmentId: 'environment-1',
	git: { branchName: 'main', commitSha: 'c'.repeat(40) },
	missingProjects: [],
	missingBindings: [],
	accessRequirements: [],
	conflicts: [],
	warnings: [],
	missingDependencies: [],
	movedWorkflows: [],
	movedFolders: [],
	...fields,
});

describe('promotion operation', () => {
	it('should send the selected workflows and folders, and leave the project and their shared dependencies to the server', () => {
		const graph = buildSelectionGraph(billingPreview(), 'apply');
		const { reminders, reconciliation, payments, project } = billingResources;

		// Both workflows include the "Invoices" table, but the request does not name it.
		expect(
			toOperationRequest(
				graph,
				new Set([reminders.key, reconciliation.key, payments.key, project.key]),
			),
		).toEqual({ workflowIds: ['w1', 'w2'], folderIds: ['f1'], credentialIds: [] });
	});

	it('should send only the selected credentials that the project owns', () => {
		const preview = billingPreview();
		const owned = resource({
			key: 'credential:c9',
			name: 'CRM key',
			parentKey: 'project:p1',
			change: 'added',
			selectable: true,
		});
		const graph = buildSelectionGraph(
			{ ...preview, resources: [...preview.resources, owned] },
			'promote',
		);
		const { stripe } = billingResources;

		// "Stripe" comes with the workflows that use it, so the request does not name it.
		expect(toOperationRequest(graph, new Set([owned.key, stripe.key]))).toEqual({
			workflowIds: [],
			folderIds: [],
			credentialIds: ['c9'],
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
				noSelection,
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
				noSelection,
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
			indexBlockers(listBlockers(check({ conflicts }), listed, noSelection));

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
				missingDependencies: [
					{ ...unreachableCredential, consumers: consumer('w1', 'w99') },
					{ ...unreachableWorkflow, consumers: consumer('w99') },
				],
			}),
			graph,
		);

		expect(scoped.accessRequirements).toEqual([]);
		expect(scoped.missingBindings[0].consumers[0].workflows).toEqual([{ id: 'w1', name: 'w1' }]);
		expect(scoped.missingDependencies).toEqual([
			{ ...unreachableCredential, consumers: consumer('w1') },
		]);
	});

	it('should block the workflows of a missing dependency only when the dependency stops the Apply', () => {
		const index = indexBlockers(
			listBlockers(
				check({
					missingDependencies: [unreachableCredential, unreachableWorkflow, archivedWorkflow],
				}),
				[],
				noSelection,
			),
		);

		// "Invoice reconciliation" (w1) uses the credential. The two sub-workflows stop nothing.
		expect([...index.blocked]).toEqual(['workflow:w1']);
		expect(index.byWorkflow.has('workflow:w3')).toBe(false);
		expect(index.byResource.get('credential:c1')).toEqual([
			{
				kind: 'outside',
				reason: 'not-on-instance',
				resourceKey: 'credential:c1',
				workflowKeys: ['workflow:w1'],
			},
		]);
	});

	it('should give the blocker of a missing dependency the reason of the dependency', () => {
		const blockers = listBlockers(
			check({ missingDependencies: [unreachableCredential, notOnBranchCredential] }),
			[],
			noSelection,
		);

		expect(blockers.map(({ kind, reason, resourceKey }) => [kind, reason, resourceKey])).toEqual([
			['outside', 'not-on-instance', 'credential:c1'],
			['outside', 'not-on-branch', 'credential:c9'],
		]);
	});

	it('should keep a dependency that does not stop the Apply only for the selected workflows, and keep one that stops it whole', () => {
		// "w1" and "w3" use each dependency. Only the first one stops the Apply.
		const stops = { ...unreachableCredential, consumers: consumer('w1', 'w3') };
		const accepted = { ...archivedWorkflow, consumers: consumer('w1', 'w3') };
		const scoped = (selected: string[]) =>
			scopeNonBlockingToSelection([stops, accepted, unreachableWorkflow], new Set(selected));

		expect(scoped(['workflow:w1', 'workflow:w3'])).toEqual([stops, accepted, unreachableWorkflow]);
		expect(scoped(['workflow:w1'])).toEqual([stops, { ...accepted, consumers: consumer('w1') }]);
		expect(scoped([])).toEqual([stops]);
	});

	it('should not count a credential or a variable twice when the check also details it', () => {
		const missingCredential = { ...credential, sourceId: 'c1', consumers: consumer('w1') };
		const missingVariable = { ...variable, consumers: consumer('w1') };
		const missingDependencies = [
			repeatedBinding(missingCredential),
			repeatedBinding(missingVariable),
			archivedWorkflow,
			unreachableWorkflow,
		];

		expect(listOnlyDependencies(missingDependencies, noSelection)).toEqual([
			archivedWorkflow,
			unreachableWorkflow,
		]);
		expect(
			listBlockers(
				check({ missingBindings: [missingCredential, missingVariable], missingDependencies }),
				[],
				noSelection,
			).map(({ kind }) => kind),
		).toEqual(['missing', 'missing']);
	});

	it('should say that only a sub-workflow that the user can access is a warning', () => {
		const listed = listOnlyDependencies(
			[archivedWorkflow, unreachableWorkflow, unreachableCredential, notOnBranchCredential],
			new Set(),
		);

		expect(listed.filter(isWarningDependency)).toEqual([archivedWorkflow]);
	});

	it('should keep a missing dependency with a condition only when the selection matches the condition', () => {
		const missingDependencies = [
			archivedWorkflow,
			targetNotSelectedWorkflow,
			targetSelectedWorkflow,
		];
		const reasons = (selected: string[]) =>
			listOnlyDependencies(missingDependencies, new Set(selected)).map(({ reason }) => reason);

		// The target of the two entries is "Weekly KPI report" (w3). The first entry has no condition.
		expect(reasons(['workflow:w1', 'workflow:w3'])).toEqual(['archived', 'caller-policy']);
		expect(reasons(['workflow:w1'])).toEqual(['archived', 'not-on-instance']);
		expect(reasons([])).toEqual(['archived', 'not-on-instance']);
	});

	it('should block the workflows of a missing dependency with a condition only when the selection matches the condition', () => {
		const stops = { ...targetSelectedWorkflow, blocking: true };
		const blocked = (selected: string[]) => [
			...indexBlockers(listBlockers(check({ missingDependencies: [stops] }), [], new Set(selected)))
				.blocked,
		];

		expect(blocked(['workflow:w3'])).toEqual(['workflow:w1']);
		expect(blocked(['workflow:w1'])).toEqual([]);
	});

	it('should keep the missing dependencies that a selected workflow uses, with only the selected workflows', () => {
		const dependencies = [otherProjectCredential, outsideAccessWorkflow, personalCredential];

		// "Weekly KPI report" (w3) is selected. "Invoice reconciliation" (w1) is not.
		const scoped = scopeToSelection(dependencies, new Set(['workflow:w3', 'folder:f1']));

		expect(scoped.map(({ name }) => name)).toEqual(['Send audit log', 'Personal Gmail']);
		expect(scoped[0].consumers[0].workflows).toEqual([{ id: 'w3', name: 'Weekly KPI report' }]);
		expect(scopeToSelection(dependencies, new Set())).toEqual([]);
	});

	it('should list the missing dependencies of each workflow', () => {
		const byWorkflow = indexByWorkflow([
			otherProjectCredential,
			outsideAccessWorkflow,
			personalCredential,
		]);

		expect([...byWorkflow.keys()]).toEqual(['workflow:w1', 'workflow:w3']);
		expect(byWorkflow.get('workflow:w1')?.map(({ name }) => name)).toEqual([
			'CRM key',
			'Send audit log',
		]);
		expect(byWorkflow.get('workflow:w3')?.map(({ name }) => name)).toEqual([
			'Send audit log',
			'Personal Gmail',
		]);
	});
});
