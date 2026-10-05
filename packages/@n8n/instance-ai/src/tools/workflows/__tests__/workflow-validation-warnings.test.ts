import type { WorkflowJSON } from '@n8n/workflow-sdk';
import {
	forEach,
	group,
	loop,
	manual,
	merge,
	paginate,
	pollUntil,
	set,
	steps,
	workflow,
} from '@n8n/workflow-sdk/next';
import type { IConnections } from 'n8n-workflow';

import {
	contractLoopsOf,
	groupingDecisionBlocker,
	partitionWarnings,
	regionDroppedBlocker,
	summarizeWorkflowTopLevelItems,
	topLevelItemsWarning,
	type ValidationWarning,
} from '../workflow-validation-warnings';

describe('partitionWarnings', () => {
	it('keeps informational severity soft and treats other issues as blocking', () => {
		const warnings: ValidationWarning[] = [
			{ code: 'MISSING_TRIGGER', message: 'No trigger', severity: 'informational' },
			{ code: 'DISCONNECTED_NODE', message: 'Node is disconnected', severity: 'informational' },
			{
				code: 'INVALID_PARAMETER',
				message: 'Bad parameter',
				nodeName: 'HTTP Request',
				severity: 'warning',
			},
		];

		expect(partitionWarnings(warnings)).toEqual({
			informational: warnings.slice(0, 2),
			blocking: [warnings[2]],
		});
	});

	it('treats missing severity as blocking', () => {
		const warnings: ValidationWarning[] = [{ code: 'UNKNOWN_CONFIG_KEY', message: 'Unknown key' }];
		expect(partitionWarnings(warnings)).toEqual({
			informational: [],
			blocking: warnings,
		});
	});
});

describe('topLevelItemsWarning', () => {
	const node = (name: string, type = 'n8n-nodes-base.noOp') => ({
		id: name,
		name,
		type,
		typeVersion: 1,
		position: [0, 0] as [number, number],
	});

	const workflow = (nodes: string[], extra: Partial<WorkflowJSON> = {}): WorkflowJSON => ({
		name: 'wf',
		nodes: nodes.map((n) => node(n)),
		connections: {},
		...extra,
	});

	it('says nothing while the canvas is at or under the ceiling', () => {
		expect(topLevelItemsWarning(workflow(['a', 'b', 'c', 'd', 'e', 'f', 'g']))).toBeUndefined();
	});

	it('names the count and the ungrouped nodes once the canvas goes over', () => {
		const warning = topLevelItemsWarning(workflow(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']));

		expect(warning?.code).toBe('TOP_LEVEL_ITEMS_OVER_CEILING');
		expect(warning?.severity).toBe('informational');
		expect(warning?.message).toContain('8 boxes');
		expect(warning?.message).toContain('a, b, c, d, e, f, g, h');
	});

	it('counts the trigger but leaves it out of the list, since no group can hold one', () => {
		const withTrigger: WorkflowJSON = {
			name: 'wf',
			connections: {},
			nodes: [
				node('When chat message received', 'n8n-nodes-base.chatTrigger'),
				...['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((n) => node(n)),
			],
		};

		const warning = topLevelItemsWarning(withTrigger);

		expect(warning?.message).toContain('8 boxes');
		expect(warning?.message).toContain('a, b, c, d, e, f, g');
		expect(warning?.message).not.toContain('When chat message received');
	});

	it('counts a group as one box', () => {
		const grouped = workflow(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], {
			nodeGroups: [{ id: 'g1', name: 'Stage', nodeIds: ['a', 'b', 'c'] }],
		});

		// 1 group + 5 ungrouped nodes.
		expect(topLevelItemsWarning(grouped)).toBeUndefined();
	});

	it('counts an agent and its sub-nodes as one box', () => {
		// Sub-nodes reach their parent over non-main connections only, so they are not
		// boxes the agent could group away.
		const connections: IConnections = {
			Model: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
			Memory: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
			Tool: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
			Agent: { main: [[{ node: 'a', type: 'main', index: 0 }]] },
		};
		const withAgent = workflow(['Agent', 'Model', 'Memory', 'Tool', 'a', 'b', 'c', 'd', 'e', 'f'], {
			connections,
		});

		// Agent + 6 plain nodes = 7 boxes; the three sub-nodes do not count.
		expect(topLevelItemsWarning(withAgent)).toBeUndefined();
	});

	it('does not count sticky notes', () => {
		const withSticky: WorkflowJSON = {
			name: 'wf',
			connections: {},
			nodes: [
				...['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((n) => node(n)),
				node('Note', 'n8n-nodes-base.stickyNote'),
			],
		};

		expect(topLevelItemsWarning(withSticky)).toBeUndefined();
	});
});

describe('groupingDecisionBlocker', () => {
	const node = (name: string) => ({
		id: name,
		name,
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0] as [number, number],
	});
	const names = (count: number) => Array.from({ length: count }, (_, i) => `n${i}`);
	const workflow = (count: number, extra: Partial<WorkflowJSON> = {}): WorkflowJSON => ({
		name: 'wf',
		nodes: names(count).map(node),
		connections: {},
		...extra,
	});
	const dropped = [
		{
			code: 'NODE_GROUP_DROPPED',
			severity: 'informational' as const,
			message: 'Node group "Body" was removed: reason.',
		},
	];

	it('says nothing under the ceiling', () => {
		const summary = summarizeWorkflowTopLevelItems(workflow(7));

		expect(
			groupingDecisionBlocker({ summary, declaredGroupCount: 0, droppedGroupWarnings: [] }),
		).toBeUndefined();
	});

	it('says nothing when a group survived, even over the ceiling', () => {
		const summary = summarizeWorkflowTopLevelItems(
			workflow(9, { nodeGroups: [{ id: 'g', name: 'Stage', nodeIds: ['n0', 'n1'] }] }),
		);

		expect(
			groupingDecisionBlocker({ summary, declaredGroupCount: 1, droppedGroupWarnings: [] }),
		).toBeUndefined();
	});

	it('blocks an over-ceiling canvas with no group declared, naming the groupable nodes', () => {
		const summary = summarizeWorkflowTopLevelItems(workflow(8));

		const blocker = groupingDecisionBlocker({
			summary,
			declaredGroupCount: 0,
			droppedGroupWarnings: [],
		});

		expect(blocker?.code).toBe('GROUPING_DECISION_MISSING');
		expect(blocker?.severity).toBe('warning');
		expect(blocker?.message).toContain('8 boxes');
		expect(blocker?.message).toContain('n0, n1');
		expect(blocker?.message).toContain("groupingDecision: 'not_warranted'");
	});

	it('names group() for a next source, and .group() for a legacy one', () => {
		const summary = summarizeWorkflowTopLevelItems(workflow(8));
		const messageOf = (nextSource: boolean) =>
			groupingDecisionBlocker({
				summary,
				declaredGroupCount: 0,
				droppedGroupWarnings: [],
				nextSource,
			})?.message ?? '';

		expect(messageOf(true)).toContain(
			'Wrap each stage in `group({ name, description }, steps(…))` and build again. Each loop counts as one box.',
		);
		expect(messageOf(true)).not.toContain('.group(');
		expect(messageOf(false)).toContain(
			'Wrap each stage in `.group(name, members, { description })` and build again. If no valid',
		);
		expect(topLevelItemsWarning(workflow(8), summary, true)?.message).toMatch(
			/cannot join one\. Frame a stage with `group\(\{ name, description \}, steps\(…\)\)`\. Each loop counts as one box\.$/,
		);
	});

	it('lets the explicit opt-out through', () => {
		const summary = summarizeWorkflowTopLevelItems(workflow(8));

		expect(
			groupingDecisionBlocker({
				summary,
				declaredGroupCount: 0,
				droppedGroupWarnings: [],
				groupingDecision: 'not_warranted',
			}),
		).toBeUndefined();
	});

	it('blocks when every declared group was dropped, and the opt-out does not excuse it', () => {
		const summary = summarizeWorkflowTopLevelItems(workflow(8));

		const blocker = groupingDecisionBlocker({
			summary,
			declaredGroupCount: 1,
			droppedGroupWarnings: dropped,
			groupingDecision: 'not_warranted',
		});

		expect(blocker?.code).toBe('GROUP_DROPPED_OVER_CEILING');
		expect(blocker?.severity).toBe('warning');
		expect(blocker?.message).toContain('Node group "Body" was removed: reason.');
	});

	it('blocks when one declared group was dropped and another survived, while still over the ceiling', () => {
		const summary = summarizeWorkflowTopLevelItems(
			workflow(10, { nodeGroups: [{ id: 'g1', name: 'Kept', nodeIds: ['n0', 'n1'] }] }),
		);

		const blocker = groupingDecisionBlocker({
			summary,
			declaredGroupCount: 2,
			droppedGroupWarnings: dropped,
		});

		expect(blocker?.code).toBe('GROUP_DROPPED_OVER_CEILING');
		expect(blocker?.message).toContain('1 of 2 declared node group(s) were removed');
	});

	it('names the join step of a branch for a next source only', () => {
		const summary = summarizeWorkflowTopLevelItems(workflow(8));
		const boundary = 'the paths of a `when` or `switchOn` join at the next step';
		const messageOf = (nextSource: boolean, droppedGroupWarnings: typeof dropped) =>
			groupingDecisionBlocker({
				summary,
				declaredGroupCount: droppedGroupWarnings.length,
				droppedGroupWarnings,
				nextSource,
			})?.message ?? '';

		expect(messageOf(true, dropped)).toMatch(/do not remove the groups\. A group has one entry/);
		expect(messageOf(true, [])).toContain(boundary);
		expect(messageOf(false, dropped)).not.toContain(boundary);
		expect(messageOf(false, [])).not.toContain(boundary);
	});

	it('does not block a dropped group when the canvas is within the ceiling', () => {
		const summary = summarizeWorkflowTopLevelItems(workflow(6));

		expect(
			groupingDecisionBlocker({ summary, declaredGroupCount: 1, droppedGroupWarnings: dropped }),
		).toBeUndefined();
	});
});

describe('contractLoopsOf', () => {
	const field = (name: string) => set({ name, fields: { n: 1 } });
	const boxesOf = async (json: WorkflowJSON) =>
		summarizeWorkflowTopLevelItems(json, await contractLoopsOf(json)).total;
	const nameOf = (json: WorkflowJSON) => (id: string) =>
		json.nodes.find((node) => node.id === id)?.name;

	it('holds the head, the body and the nodes the loop adds', async () => {
		const json = workflow(
			'Walk',
			manual({ sample: [{ n: 1 }] }),
			loop(
				{ name: 'Walk', maxIterations: 5, until: (out) => out.n > 1, next: (out) => out },
				field('Fetch'),
			),
			field('After'),
		).toJSON();

		const loops = await contractLoopsOf(json);

		expect(loops.map(({ nodeIds }) => nodeIds.map(nameOf(json)))).toEqual([
			['Walk', 'Fetch', 'Walk until', 'Walk next', 'Walk limit'],
		]);
		expect(summarizeWorkflowTopLevelItems(json).total).toBe(7);
		expect(await boxesOf(json)).toBe(3);
	});

	it('counts paginate, pollUntil with its wait, and a loop in a loop as one box each', async () => {
		const json = workflow(
			'Many',
			manual({ sample: [{ n: 1 }] }),
			paginate(
				{ name: 'Pages', maxPages: 3, next: (page) => (page.n > 1 ? null : page) },
				field('Page'),
			),
			pollUntil(
				{
					name: 'Poll',
					maxAttempts: 3,
					every: { amount: 1, unit: 'seconds' },
					until: (out) => out.n > 1,
				},
				field('Status'),
			),
			loop(
				{ name: 'Outer', maxIterations: 3, until: (out) => out.n > 1, next: (out) => out },
				loop(
					{ name: 'Inner', maxIterations: 3, until: (out) => out.n > 1, next: (out) => out },
					field('Step'),
				),
			),
		).toJSON();

		expect(await boxesOf(json)).toBe(4);
		expect(summarizeWorkflowTopLevelItems(json, await contractLoopsOf(json)).groupCount).toBe(0);
	});

	it('adds no box for a forEach region inside a loop', async () => {
		const json = workflow(
			'Batched',
			manual({ sample: [{ n: 1 }] }),
			loop(
				{ name: 'Retry', maxIterations: 3, until: (out) => out.n > 1, next: (out) => out },
				forEach({ name: 'Batches', batchSize: 10 }, field('Send')),
			),
		).toJSON();

		expect(await boxesOf(json)).toBe(2);
		expect(summarizeWorkflowTopLevelItems(json, await contractLoopsOf(json)).groupCount).toBe(1);
	});

	it('holds a loop that ends at its limit, with no next and no limit node', async () => {
		const json = workflow(
			'Walk',
			manual({ sample: [{ n: 1 }] }),
			loop(
				{ name: 'Walk', maxIterations: 5, onLimit: 'continue', until: (out) => out.n > 1 },
				field('Fetch'),
			),
			field('After'),
		).toJSON();

		const loops = await contractLoopsOf(json);

		expect(loops.map(({ nodeIds }) => nodeIds.map(nameOf(json)))).toEqual([
			['Walk', 'Fetch', 'Walk until', 'Walk next'],
		]);
		expect(await boxesOf(json)).toBe(3);
	});

	it('counts a group around a forEach as one group box', async () => {
		const json = workflow(
			'Grouped',
			manual({ sample: [{ n: 1 }] }),
			group(
				{ name: 'Send' },
				steps(forEach({ name: 'Each', batchSize: 1 }, field('Post')), field('Mark')),
			),
			loop(
				{ name: 'Walk', maxIterations: 5, until: (out) => out.n > 1, next: (out) => out },
				field('Fetch'),
			),
		).toJSON();

		expect(summarizeWorkflowTopLevelItems(json)).toMatchObject({ total: 7, groupCount: 1 });
		expect(summarizeWorkflowTopLevelItems(json, await contractLoopsOf(json))).toMatchObject({
			total: 3,
			groupCount: 1,
		});
	});

	it('counts a forEach whose body starts with branches as one box, also in a loop', async () => {
		const each = () =>
			forEach(
				{ name: 'Each', batchSize: 1 },
				merge({ name: 'Parts', join: 'position' }, [field('A'), field('B'), field('C')]),
			);
		const flat = workflow('Flat', manual({ sample: [{ n: 1 }] }), each(), field('After')).toJSON();
		const looped = workflow(
			'Looped',
			manual({ sample: [{ n: 1 }] }),
			loop(
				{ name: 'Walk', maxIterations: 5, onLimit: 'continue', until: (out) => out.n > 1 },
				each(),
			),
		).toJSON();

		expect(flat.nodeGroups?.[0]?.nodeIds.map(nameOf(flat))).toContain('Each start');
		expect(await boxesOf(flat)).toBe(3);
		expect((await contractLoopsOf(looped))[0]?.nodeIds.map(nameOf(looped))).toEqual(
			expect.arrayContaining(['Each start', 'A', 'B', 'C', 'Parts', 'Walk next']),
		);
		expect(await boxesOf(looped)).toBe(2);
	});
});

describe('regionDroppedBlocker', () => {
	it('refuses with each drop reason, and passes when no region was dropped', () => {
		const violation = {
			groupId: 'g1',
			groupName: 'Batches',
			code: 'unknown-node-id' as const,
			message: 'Group "Batches" references node ID "stale" that does not exist in the workflow.',
		};

		expect(regionDroppedBlocker([violation])).toEqual({
			code: 'REGION_DROPPED',
			severity: 'error',
			message: expect.stringContaining('references node ID "stale"'),
		});
		expect(regionDroppedBlocker([])).toBeUndefined();
	});
});
