import type { PromotionMissingDependency } from '@n8n/api-types';
import type { INode, IWorkflowSettings } from 'n8n-workflow';

import type {
	InventoryWorkflow,
	PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import {
	callerPolicyAllows,
	idsMissingOnSource,
	missingWorkflowDependencies,
	sortDependencies,
	toSourceWarning,
	type ApplyDependencyFacts,
	type ReferencedWorkflowState,
} from '../apply-dependency-check';
import { collectWorkflowReferences } from '../package-references';

const ALPHA = { id: 'p1', name: 'Alpha' };
const BETA = { id: 'p2', name: 'Beta' };

const callNode = (workflowId: unknown): INode => ({
	id: `call-${String(workflowId)}`,
	name: `Call ${String(workflowId)}`,
	type: 'n8n-nodes-base.executeWorkflow',
	typeVersion: 1,
	position: [0, 0],
	parameters: { workflowId } as INode['parameters'],
});

const workflow = (
	id: string,
	projectId: string,
	{
		calls = [],
		isArchived = false,
		settings,
	}: { calls?: string[]; isArchived?: boolean; settings?: IWorkflowSettings } = {},
): InventoryWorkflow =>
	({
		path: `projects/${projectId}/workflows/${id}/workflow.json`,
		projectId,
		id,
		name: `Workflow ${id}`,
		content: {
			name: `Workflow ${id}`,
			nodes: calls.map(callNode),
			connections: {},
			isArchived,
			settings,
		},
	}) as unknown as InventoryWorkflow;

const consumer = (project: typeof ALPHA, ...ids: string[]) => ({
	project,
	workflows: ids.map((id) => ({ id, name: `Workflow ${id}` })),
});

const onInstance = (
	projectId: string | null,
	state: Partial<ReferencedWorkflowState> = {},
): ReferencedWorkflowState => ({ isArchived: false, projectId, ...state });

/**
 * Checks the references of the applied workflows. Without `applied`, the Apply imports every
 * workflow of the package, as an Apply of the whole instance does.
 */
function check(
	workflows: InventoryWorkflow[],
	{
		applied = workflows.map(({ id }) => id),
		rows = [],
		...facts
	}: Partial<ApplyDependencyFacts> & {
		applied?: string[];
		rows?: Array<{ id: string; name?: string }>;
	} = {},
) {
	const inventory = { workflows } as PackageDirectoryInventory;
	const appliedWorkflowIds = new Set(applied);
	return missingWorkflowDependencies({
		references: collectWorkflowReferences({
			...inventory,
			workflows: workflows.filter(({ id }) => appliedWorkflowIds.has(id)),
		}),
		inventory,
		manifest: {
			requirements: { workflows: rows.map((row) => ({ ...row, usedBy: [] })) },
		} as unknown as PackageManifest,
		facts: {
			credentialProjectIds: new Set(),
			unusableCredentials: new Map(),
			appliedWorkflowIds,
			removedWorkflowIds: new Set(),
			selectableWorkflowIds: new Set(),
			instanceWorkflows: new Map(),
			readableProjectIds: new Set(),
			callerPolicyDefault: 'workflowsFromSameOwner',
			...facts,
		},
		projectOf: (id) => [ALPHA, BETA].find((project) => project.id === id) ?? { id, name: id },
	});
}

describe('callerPolicyAllows', () => {
	const caller = { id: 'caller', projectId: ALPHA.id };
	const subWorkflow = (settings: IWorkflowSettings | undefined, projectId: string | null) => ({
		settings,
		projectId,
	});

	it('allows every caller with the policy `any`', () => {
		expect(callerPolicyAllows(subWorkflow({ callerPolicy: 'any' }, BETA.id), caller, 'none')).toBe(
			true,
		);
	});

	it('refuses every caller with the policy `none`, also from the same project', () => {
		expect(callerPolicyAllows(subWorkflow({ callerPolicy: 'none' }, ALPHA.id), caller, 'any')).toBe(
			false,
		);
	});

	it.each([
		['caller', true],
		[' other , caller ', true],
		['other', false],
		['', false],
		[undefined, false],
	])('with the policy `workflowsFromAList` and the list %j, gives %s', (callerIds, allowed) => {
		// The same project does not replace the list.
		const settings: IWorkflowSettings = { callerPolicy: 'workflowsFromAList', callerIds };
		expect(callerPolicyAllows(subWorkflow(settings, ALPHA.id), caller, 'any')).toBe(allowed);
	});

	it('refuses a list that is not text, as a package file can hold', () => {
		const settings = { callerPolicy: 'workflowsFromAList', callerIds: ['caller'] };
		expect(
			callerPolicyAllows(
				subWorkflow(settings as unknown as IWorkflowSettings, ALPHA.id),
				caller,
				'any',
			),
		).toBe(false);
	});

	it.each([
		[ALPHA.id, true],
		[BETA.id, false],
		[null, false],
	])(
		'with the policy `workflowsFromSameOwner` and the sub-workflow in the project %s, gives %s',
		(projectId, allowed) => {
			expect(
				callerPolicyAllows(
					subWorkflow({ callerPolicy: 'workflowsFromSameOwner' }, projectId),
					caller,
					'any',
				),
			).toBe(allowed);
		},
	);

	it.each([
		['any', true],
		['none', false],
		['workflowsFromAList', false],
		['workflowsFromSameOwner', false],
	] as const)(
		'uses the default policy `%s` for a sub-workflow without a policy',
		(defaultPolicy, allowed) => {
			expect(callerPolicyAllows(subWorkflow({}, BETA.id), caller, defaultPolicy)).toBe(allowed);
			expect(callerPolicyAllows(subWorkflow(undefined, BETA.id), caller, defaultPolicy)).toBe(
				allowed,
			);
		},
	);
});

describe('collectWorkflowReferences', () => {
	it('reads a call from a node and the error workflow, and no reference in an expression', () => {
		const caller = workflow('caller', ALPHA.id, {
			calls: ['sub', '={{ $json.id }}'],
			settings: { errorWorkflow: 'handler' },
		});
		const other = workflow('other', ALPHA.id, {
			calls: ['sub'],
			settings: { errorWorkflow: 'DEFAULT' },
		});
		const dynamic = workflow('dynamic', ALPHA.id, {
			settings: { errorWorkflow: '={{ $vars.x }}' },
		});

		expect(
			collectWorkflowReferences({
				workflows: [other, caller, dynamic],
			} as PackageDirectoryInventory),
		).toEqual([
			{ id: 'handler', workflows: [caller] },
			{ id: 'sub', workflows: [other, caller] },
		]);
	});

	it('lists a workflow one time for a workflow that it references more than one time', () => {
		const caller = workflow('caller', ALPHA.id, {
			calls: ['sub', 'sub'],
			settings: { errorWorkflow: 'sub' },
		});

		expect(collectWorkflowReferences({ workflows: [caller] } as PackageDirectoryInventory)).toEqual(
			[{ id: 'sub', workflows: [caller] }],
		);
	});
});

describe('missingWorkflowDependencies', () => {
	const entry = (
		id: string,
		reason: PromotionMissingDependency['reason'],
		accessible: boolean,
		...consumers: Array<ReturnType<typeof consumer>>
	) => ({
		kind: 'workflow',
		id,
		name: id,
		group: accessible ? 'needs-action' : 'outside-access',
		reason,
		accessible,
		blocking: false,
		consumers,
	});

	it('does not list a workflow that the Apply imports and that accepts the call', () => {
		expect(
			check([workflow('caller', ALPHA.id, { calls: ['sub'] }), workflow('sub', ALPHA.id)]),
		).toEqual([]);
	});

	it('does not list a workflow that only this instance holds and that accepts the call', () => {
		expect(
			check([workflow('caller', ALPHA.id, { calls: ['sub'] })], {
				instanceWorkflows: new Map([['sub', onInstance(ALPHA.id)]]),
			}),
		).toEqual([]);
	});

	it('lists a workflow that neither this instance nor the branch holds as not on the branch, outside the access', () => {
		const caller = workflow('caller', ALPHA.id, {
			calls: ['sub'],
			settings: { errorWorkflow: 'handler' },
		});

		expect(check([caller], { readableProjectIds: new Set([ALPHA.id, BETA.id]) })).toEqual([
			entry('handler', 'not-on-branch', false, consumer(ALPHA, 'caller')),
			entry('sub', 'not-on-branch', false, consumer(ALPHA, 'caller')),
		]);
	});

	it('uses the name of the requirement row, and the id for a row without a name', () => {
		const caller = workflow('caller', ALPHA.id, { calls: ['named', 'unnamed'] });

		const names = check([caller], {
			rows: [{ id: 'named', name: 'Notify' }, { id: 'unnamed' }],
		}).map(({ id, name }) => [id, name]);

		expect(names).toEqual([
			['named', 'Notify'],
			['unnamed', 'unnamed'],
		]);
	});

	it('lists a workflow that the branch holds but the Apply does not import, by the access to its branch project', () => {
		const workflows = [workflow('caller', ALPHA.id, { calls: ['sub'] }), workflow('sub', BETA.id)];

		expect(check(workflows, { applied: ['caller'] })).toEqual([
			entry('sub', 'not-on-instance', false, consumer(ALPHA, 'caller')),
		]);
		expect(
			check(workflows, { applied: ['caller'], readableProjectIds: new Set([BETA.id]) }),
		).toEqual([entry('sub', 'not-on-instance', true, consumer(ALPHA, 'caller'))]);
	});

	it('reads the state on this instance of a workflow that the Apply does not import', () => {
		// The branch holds the sub-workflow as archived, but this Apply does not write it.
		const workflows = [
			workflow('caller', ALPHA.id, { calls: ['sub'] }),
			workflow('sub', ALPHA.id, { isArchived: true }),
		];

		expect(
			check(workflows, {
				applied: ['caller'],
				instanceWorkflows: new Map([['sub', onInstance(ALPHA.id)]]),
			}),
		).toEqual([]);
	});

	it('lists a workflow that the branch archives, for a call and for an error workflow', () => {
		const workflows = [
			workflow('caller', ALPHA.id, { calls: ['sub'] }),
			workflow('failing', BETA.id, { settings: { errorWorkflow: 'sub' } }),
			workflow('sub', ALPHA.id, { isArchived: true, settings: { callerPolicy: 'none' } }),
		];

		// A workflow of the project of the archived workflow uses it, so the user can act on it.
		expect(check(workflows)).toEqual([
			entry('sub', 'archived', true, consumer(ALPHA, 'caller'), consumer(BETA, 'failing')),
		]);
	});

	it('lists a workflow that this instance holds as archived, by the access to its owner project', () => {
		const caller = workflow('caller', ALPHA.id, { calls: ['sub'] });
		const instanceWorkflows = new Map([['sub', onInstance(BETA.id, { isArchived: true })]]);

		expect(check([caller], { instanceWorkflows })).toEqual([
			entry('sub', 'archived', false, consumer(ALPHA, 'caller')),
		]);
		expect(check([caller], { instanceWorkflows, readableProjectIds: new Set([BETA.id]) })).toEqual([
			entry('sub', 'archived', true, consumer(ALPHA, 'caller')),
		]);
	});

	it('lists the callers that the caller policy refuses, with the branch policy of an imported sub-workflow', () => {
		const workflows = [
			workflow('same-project', BETA.id, { calls: ['sub'] }),
			workflow('other-project', ALPHA.id, { calls: ['sub'] }),
			workflow('sub', BETA.id),
		];

		expect(check(workflows)).toEqual([
			entry('sub', 'caller-policy', false, consumer(ALPHA, 'other-project')),
		]);
		expect(check(workflows, { readableProjectIds: new Set([BETA.id]) })).toEqual([
			entry('sub', 'caller-policy', true, consumer(ALPHA, 'other-project')),
		]);
		expect(check(workflows, { callerPolicyDefault: 'any' })).toEqual([]);
	});

	it('lists the callers that the caller policy of a workflow on this instance refuses', () => {
		const workflows = [
			workflow('listed', ALPHA.id, { calls: ['sub'] }),
			workflow('unlisted', ALPHA.id, { calls: ['sub'] }),
		];

		expect(
			check(workflows, {
				instanceWorkflows: new Map([
					[
						'sub',
						onInstance(ALPHA.id, {
							settings: { callerPolicy: 'workflowsFromAList', callerIds: 'listed' },
						}),
					],
				]),
			}),
		).toEqual([entry('sub', 'caller-policy', true, consumer(ALPHA, 'unlisted'))]);
	});

	it('lists the workflows that the caller policy of their error workflow refuses', () => {
		const workflows = [
			workflow('same-project', BETA.id, { settings: { errorWorkflow: 'handler' } }),
			workflow('other-project', ALPHA.id, { settings: { errorWorkflow: 'handler' } }),
			workflow('handler', BETA.id),
		];

		expect(check(workflows)).toEqual([
			entry('handler', 'caller-policy', false, consumer(ALPHA, 'other-project')),
		]);
		expect(check(workflows, { callerPolicyDefault: 'any' })).toEqual([]);
	});

	it('lists a workflow once when the caller policy refuses its call and its error workflow', () => {
		const workflows = [
			workflow('caller', ALPHA.id, { calls: ['handler'], settings: { errorWorkflow: 'handler' } }),
			workflow('handler', ALPHA.id, { settings: { callerPolicy: 'none' } }),
		];

		expect(check(workflows)).toEqual([
			entry('handler', 'caller-policy', true, consumer(ALPHA, 'caller')),
		]);
	});

	it('applies the caller policy to a workflow that is its own error workflow', () => {
		const own = (callerPolicy: IWorkflowSettings['callerPolicy']) =>
			workflow('own', ALPHA.id, { settings: { errorWorkflow: 'own', callerPolicy } });

		expect(check([own('workflowsFromSameOwner')])).toEqual([]);
		expect(check([own('none')])).toEqual([
			entry('own', 'caller-policy', true, consumer(ALPHA, 'own')),
		]);
	});

	it('lists a workflow without an owner project on this instance outside the access', () => {
		const caller = workflow('caller', ALPHA.id, { calls: ['sub'] });

		expect(
			check([caller], {
				instanceWorkflows: new Map([['sub', onInstance(null, { isArchived: true })]]),
				readableProjectIds: new Set([ALPHA.id]),
			}),
		).toEqual([entry('sub', 'archived', false, consumer(ALPHA, 'caller'))]);
	});
});

describe('missingWorkflowDependencies: a workflow that the Apply deletes', () => {
	const caller = workflow('caller', ALPHA.id, { calls: ['sub'] });
	const deleted = (projectId: string | null) => ({
		instanceWorkflows: new Map([['sub', onInstance(projectId)]]),
		removedWorkflowIds: new Set(['sub']),
	});
	const entry = (accessible: boolean) => ({
		kind: 'workflow',
		id: 'sub',
		name: 'sub',
		group: accessible ? 'needs-action' : 'outside-access',
		reason: 'not-on-instance',
		accessible,
		blocking: false,
		consumers: [consumer(ALPHA, 'caller')],
	});

	it('lists it as not on this instance, although this instance holds it before the Apply', () => {
		expect(check([caller], { instanceWorkflows: deleted(ALPHA.id).instanceWorkflows })).toEqual([]);
		expect(check([caller], deleted(ALPHA.id))).toEqual([entry(true)]);
	});

	it('gives the group by the project that held it', () => {
		// A workflow of the project that held it uses it.
		expect(check([caller], deleted(ALPHA.id))).toEqual([entry(true)]);
		expect(check([caller], deleted(BETA.id))).toEqual([entry(false)]);
		expect(
			check([caller], { ...deleted(BETA.id), readableProjectIds: new Set([BETA.id]) }),
		).toEqual([entry(true)]);
		expect(
			check([caller], { ...deleted(null), readableProjectIds: new Set([ALPHA.id, BETA.id]) }),
		).toEqual([entry(false)]);
	});

	it('reads the branch state of a workflow that the Apply imports into another project', () => {
		const workflows = [caller, workflow('sub', ALPHA.id)];

		expect(check(workflows, deleted(BETA.id))).toEqual([]);
	});
});

describe('missingWorkflowDependencies: the preview of a project, before the selection', () => {
	type Condition = PromotionMissingDependency['condition'];
	const entry = (
		id: string,
		reason: PromotionMissingDependency['reason'],
		condition: Condition,
		...workflowIds: string[]
	) => ({
		kind: 'workflow',
		id,
		name: id,
		group: 'needs-action',
		reason,
		accessible: true,
		blocking: false,
		...(condition ? { condition } : {}),
		consumers: [consumer(ALPHA, ...workflowIds)],
	});

	/**
	 * The plan of the preview imports every workflow of the branch and deletes `removed`. The
	 * user selects among these workflows.
	 */
	const preview = (
		workflows: InventoryWorkflow[],
		{ removed = [], ...facts }: Partial<ApplyDependencyFacts> & { removed?: string[] } = {},
	) =>
		check(workflows, {
			removedWorkflowIds: new Set(removed),
			selectableWorkflowIds: new Set([...workflows.map(({ id }) => id), ...removed]),
			...facts,
		});

	describe('a sub-workflow that the branch adds', () => {
		const workflows = [workflow('caller', ALPHA.id, { calls: ['sub'] }), workflow('sub', ALPHA.id)];

		it('lists it for a selection without it', () => {
			expect(preview(workflows)).toEqual([
				entry('sub', 'not-on-instance', 'target-not-selected', 'caller'),
			]);
		});

		it('gives the result of each selection without a condition', () => {
			expect(check(workflows, { applied: ['caller'] })).toEqual([
				entry('sub', 'not-on-instance', undefined, 'caller'),
			]);
			expect(check(workflows, { applied: ['caller', 'sub'] })).toEqual([]);
		});
	});

	describe('a sub-workflow that the branch lacks and this instance holds in the project', () => {
		const workflows = [workflow('caller', ALPHA.id, { calls: ['sub'] })];
		const instanceWorkflows = new Map([['sub', onInstance(ALPHA.id)]]);

		it('lists it for a selection that deletes it', () => {
			expect(preview(workflows, { instanceWorkflows, removed: ['sub'] })).toEqual([
				entry('sub', 'not-on-instance', 'target-selected', 'caller'),
			]);
		});

		it('gives the result of each selection without a condition', () => {
			expect(check(workflows, { instanceWorkflows })).toEqual([]);
			expect(check(workflows, { instanceWorkflows, removedWorkflowIds: new Set(['sub']) })).toEqual(
				[entry('sub', 'not-on-instance', undefined, 'caller')],
			);
		});
	});

	it('gives no condition to an entry with the same reason for every selection', () => {
		const workflows = [
			workflow('caller', ALPHA.id, { calls: ['sub'] }),
			workflow('sub', ALPHA.id, { isArchived: true }),
		];

		expect(
			preview(workflows, {
				instanceWorkflows: new Map([['sub', onInstance(ALPHA.id, { isArchived: true })]]),
			}),
		).toEqual([entry('sub', 'archived', undefined, 'caller')]);
	});

	it('lists nothing for a sub-workflow that is usable for every selection', () => {
		const workflows = [workflow('caller', ALPHA.id, { calls: ['sub'] }), workflow('sub', ALPHA.id)];

		expect(
			preview(workflows, { instanceWorkflows: new Map([['sub', onInstance(ALPHA.id)]]) }),
		).toEqual([]);
	});

	it('lists a sub-workflow that only the branch archives for a selection with it', () => {
		const workflows = [
			workflow('caller', ALPHA.id, { calls: ['sub'] }),
			workflow('sub', ALPHA.id, { isArchived: true }),
		];

		expect(
			preview(workflows, { instanceWorkflows: new Map([['sub', onInstance(ALPHA.id)]]) }),
		).toEqual([entry('sub', 'archived', 'target-selected', 'caller')]);
	});

	it('gives two entries when the reason differs between the two selections', () => {
		const workflows = [
			workflow('caller', ALPHA.id, { calls: ['sub'] }),
			workflow('sub', ALPHA.id, { isArchived: true }),
		];

		expect(
			preview(workflows, {
				instanceWorkflows: new Map([
					['sub', onInstance(ALPHA.id, { settings: { callerPolicy: 'none' } })],
				]),
			}),
		).toEqual([
			entry('sub', 'archived', 'target-selected', 'caller'),
			entry('sub', 'caller-policy', 'target-not-selected', 'caller'),
		]);
	});

	it('splits the callers that the caller policy refuses on the branch, on this instance, or on both', () => {
		const list = (callerIds: string): IWorkflowSettings => ({
			callerPolicy: 'workflowsFromAList',
			callerIds,
		});
		const workflows = [
			workflow('a', ALPHA.id, { calls: ['sub'] }),
			workflow('b', ALPHA.id, { calls: ['sub'] }),
			workflow('c', ALPHA.id, { calls: ['sub'] }),
			workflow('d', ALPHA.id, { calls: ['sub'] }),
			// The branch accepts `a` and `b`. This instance accepts `a` and `c`.
			workflow('sub', ALPHA.id, { settings: list('a,b') }),
		];

		expect(
			preview(workflows, {
				instanceWorkflows: new Map([['sub', onInstance(ALPHA.id, { settings: list('a,c') })]]),
			}),
		).toEqual([
			entry('sub', 'caller-policy', undefined, 'd'),
			entry('sub', 'caller-policy', 'target-selected', 'c'),
			entry('sub', 'caller-policy', 'target-not-selected', 'b'),
		]);
	});

	it('gives two entries when only the group differs between the two selections', () => {
		// The branch holds the archived workflow in Alpha. This instance holds it in Beta.
		const workflows = [
			workflow('caller', ALPHA.id, { calls: ['sub'] }),
			workflow('sub', ALPHA.id, { isArchived: true }),
		];

		expect(
			preview(workflows, {
				instanceWorkflows: new Map([['sub', onInstance(BETA.id, { isArchived: true })]]),
			}),
		).toEqual([
			entry('sub', 'archived', 'target-selected', 'caller'),
			{
				...entry('sub', 'archived', 'target-not-selected', 'caller'),
				group: 'outside-access',
				accessible: false,
			},
		]);
	});

	it('gives no condition to a workflow that the Apply of the project cannot write or delete', () => {
		const workflows = [workflow('caller', ALPHA.id, { calls: ['other', 'nowhere'] })];

		expect(
			check(workflows, {
				selectableWorkflowIds: new Set(['caller']),
				instanceWorkflows: new Map([['other', onInstance(ALPHA.id, { isArchived: true })]]),
			}),
		).toEqual([
			{
				...entry('nowhere', 'not-on-branch', undefined, 'caller'),
				group: 'outside-access',
				accessible: false,
			},
			entry('other', 'archived', undefined, 'caller'),
		]);
	});

	it('lists a workflow that refuses itself as its error workflow only for a selection with it', () => {
		const own = workflow('own', ALPHA.id, {
			settings: { errorWorkflow: 'own', callerPolicy: 'none' },
		});
		const instanceWorkflows = new Map([
			['own', onInstance(ALPHA.id, { settings: { callerPolicy: 'none' } })],
		]);

		// Without the workflow in the selection, the Apply writes no reference of it.
		expect(preview([own], { instanceWorkflows })).toEqual([
			entry('own', 'caller-policy', 'target-selected', 'own'),
		]);
		expect(preview([own])).toEqual([entry('own', 'caller-policy', 'target-selected', 'own')]);
	});
});

describe('references that Promote marked as broken on the source instance', () => {
	it('reads only the rows with the reason `missing-on-source`', () => {
		expect([
			...idsMissingOnSource([
				{ id: 'broken', reason: 'missing-on-source' },
				{ id: 'confirmed', reason: 'confirmed-missing' },
				{ id: 'unmarked' },
			]),
		]).toEqual(['broken']);
		expect(idsMissingOnSource(undefined).size).toBe(0);
	});

	it('turns an entry into a warning that keeps the id, the name and the workflows only', () => {
		const consumers = [consumer(ALPHA, 'caller')];

		expect(
			toSourceWarning({
				kind: 'workflow',
				id: 'sub',
				name: 'Helper',
				group: 'outside-access',
				reason: 'not-on-instance',
				accessible: false,
				blocking: false,
				consumers,
			}),
		).toEqual({
			kind: 'workflow',
			code: 'missing-on-source',
			id: 'sub',
			name: 'Helper',
			consumers,
		});
	});
});

describe('sortDependencies', () => {
	const dependency = (
		kind: PromotionMissingDependency['kind'],
		name: string,
		extra: Partial<PromotionMissingDependency> = {},
	): PromotionMissingDependency => ({
		kind,
		name,
		group: 'needs-action',
		reason: 'not-on-instance',
		accessible: true,
		blocking: true,
		consumers: [consumer(ALPHA, 'wf-1')],
		...extra,
	});

	it('orders by kind, id, name, reason, condition and consumers, for any input order', () => {
		const sorted = [
			dependency('credential', 'Zeta', { id: 'c1' }),
			dependency('credential', 'Alpha', { id: 'c2', reason: 'not-shared' }),
			dependency('credential', 'Alpha', { id: 'c2', reason: 'type-mismatch' }),
			dependency('variable', 'REGION', { consumers: [consumer(ALPHA, 'wf-1')] }),
			dependency('variable', 'REGION', { consumers: [consumer(BETA, 'wf-2')] }),
			// The consumers do not decide the order of two conditions.
			dependency('workflow', 'Notify', { id: 'w1', consumers: [consumer(BETA, 'wf-9')] }),
			dependency('workflow', 'Notify', { id: 'w1', condition: 'target-not-selected' }),
			dependency('workflow', 'Notify', {
				id: 'w1',
				condition: 'target-selected',
				consumers: [consumer(ALPHA, 'wf-0')],
			}),
		];

		expect(sortDependencies([...sorted].reverse())).toEqual(sorted);
		expect(
			sortDependencies([
				sorted[3],
				sorted[7],
				sorted[5],
				sorted[0],
				sorted[6],
				sorted[4],
				sorted[2],
				sorted[1],
			]),
		).toEqual(sorted);
	});
});
