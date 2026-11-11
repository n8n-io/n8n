import type { BuiltTool, ToolContext } from '@n8n/agents';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { randomUUID } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import type { AgentPlanService } from '../../agent-plan.service';
import { AgentPlanWriteConflictError } from '../../repositories/agent-plan.repository';
import { createAgentPlanTools, presentPlan } from '../agent-plan-tools';
import {
	AgentPlanValidationError,
	parseAgentPlan,
	type AgentPlanDocument,
	type AgentPlanTask,
} from '../agent-plan.schema';
import { getAgentPlanReadiness } from '../agent-plan.validation';

const service = mock<AgentPlanService>();
const context: ToolContext = { persistence: { threadId: 'thread-1', resourceId: 'resource-1' } };
const task = (id = 'new:research') => ({
	id,
	kind: 'task' as const,
	title: 'Research',
	description: 'Find the facts',
	status: 'pending' as const,
	dependsOn: [] as string[],
});
const document = (...items: unknown[]) => ({ title: 'Plan', description: 'Goal', items });
const stored = (data: AgentPlanDocument) => ({
	id: randomUUID(),
	threadId: 'thread-1',
	revision: 1,
	formatVersion: 2,
	data,
	closedAt: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	readiness: getAgentPlanReadiness(data),
});
const original = stored(parseAgentPlan(document(task(randomUUID())), 2));
const write = { planId: original.id, expectedRevision: 1 };
let tools: BuiltTool[];

async function call(name: string, input: unknown, ctx = context) {
	const tool = tools.find((candidate) => candidate.name === name);
	if (!tool?.handler) throw new Error(`Missing handler: ${name}`);
	return await tool.handler(input, ctx);
}

beforeEach(() => {
	vi.resetAllMocks();
	tools = createAgentPlanTools(service);

	service.updatePlan.mockImplementation(async (input, update, ctx) => {
		const current = await service.findPlan(input.threadId, input.planId, ctx);

		if (!current || current.closedAt || current.revision !== input.expectedRevision)
			throw new AgentPlanWriteConflictError();

		return await service.replacePlan({ ...input, data: update(current.data) }, ctx);
	});

	service.createActivePlan.mockImplementation(async (input) => ({
		...stored(parseAgentPlan(input.data, input.formatVersion)),
		id: input.id,
		threadId: input.threadId,
	}));
	service.findPlan.mockResolvedValue(original);
	service.replacePlan.mockImplementation(async (input) => ({
		...original,
		data: parseAgentPlan(input.data, input.formatVersion),
		revision: input.expectedRevision + 1,
	}));
});

describe('Agent plan tools', () => {
	it('exports nullable update fields without undefined schema branches', () => {
		const tool = tools.find((candidate) => candidate.name === 'update_plan');
		const schema = zodToJsonSchema(tool?.inputSchema);
		expect(schema).not.toBeNull();
		expect(JSON.stringify(schema)).not.toContain('"not":{}');
	});

	it('updates only the supplied task fields and preserves omitted items', async () => {
		const done = { ...task(randomUUID()), status: 'done', resultSummary: 'Saved findings' };
		const running = { ...task(randomUUID()), status: 'in_progress' };
		const current = stored(parseAgentPlan(document(done, running), 2));
		service.findPlan.mockResolvedValue(current);

		expect(
			await call('update_plan', {
				planId: current.id,
				expectedRevision: 1,
				document: { items: [{ id: running.id, status: 'done', resultSummary: 'New findings' }] },
			}),
		).toMatchObject({ revision: 2 });
		expect(service.replacePlan.mock.calls[0][0].data).toEqual({
			...current.data,
			items: [
				current.data.items[0],
				{ ...current.data.items[1], status: 'done', resultSummary: 'New findings' },
			],
		});
		expect(current.data.items[1].status).toBe('in_progress');
	});

	it('merges presentation fields without changing the plan items', async () => {
		const current = {
			...original,
			data: { ...original.data, presentation: { label: 'Researching', detail: 'Saved note' } },
		};
		service.findPlan.mockResolvedValue(current);

		await call('update_plan', { ...write, document: { presentation: { label: 'Reviewing' } } });
		expect(service.replacePlan.mock.calls[0][0].data).toEqual({
			...current.data,
			presentation: { label: 'Reviewing', detail: 'Saved note' },
		});
	});

	it('updates a child by ID and preserves its group and siblings', async () => {
		const child = task(randomUUID());
		const sibling = task(randomUUID());
		const group = { ...task(randomUUID()), kind: 'group', tasks: [child, sibling] };
		const current = stored(parseAgentPlan(document(group), 2));
		service.findPlan.mockResolvedValue(current);

		await call('update_plan', {
			planId: current.id,
			expectedRevision: 1,
			document: { items: [{ id: group.id, tasks: [{ id: child.id, status: 'done' }] }] },
		});

		const savedGroup = current.data.items[0];

		if (savedGroup.kind !== 'group') throw new Error('Expected group');

		expect(service.replacePlan.mock.calls[0][0].data).toEqual({
			...current.data,
			items: [
				{ ...savedGroup, tasks: [{ ...savedGroup.tasks[0], status: 'done' }, savedGroup.tasks[1]] },
			],
		});
	});

	it('appends new items and resolves their references without resending existing items', async () => {
		await call('update_plan', {
			...write,
			document: {
				items: [
					{ ...task('new:dependent'), dependsOn: ['new:group'] },
					{ ...task('new:group'), kind: 'group', tasks: [task('new:child')] },
				],
			},
		});

		const data = parseAgentPlan(service.replacePlan.mock.calls[0][0].data, 2);

		expect(data.items[0]).toEqual(original.data.items[0]);
		expect(data.items[1].dependsOn).toEqual([data.items[2].id]);
		expect(data.items[2]).toMatchObject({ kind: 'group', tasks: [{ title: 'Research' }] });
		expect(JSON.stringify(data)).not.toContain('new:');
	});

	it('removes only explicitly selected items and preserves an empty group', async () => {
		const child = task(randomUUID());
		const removed = task(randomUUID());
		const group = { ...task(randomUUID()), kind: 'group', tasks: [child] };
		const current = stored(parseAgentPlan(document(removed, group), 2));
		service.findPlan.mockResolvedValue(current);

		await call('update_plan', {
			planId: current.id,
			expectedRevision: 1,
			document: {},
			removeItemIds: [removed.id, child.id],
		});

		expect(service.replacePlan.mock.calls[0][0].data).toEqual({
			...current.data,
			items: [{ ...current.data.items[1], tasks: [] }],
		});
	});

	it('preserves items when an update supplies an empty list', async () => {
		await call('update_plan', { ...write, document: { items: [] } });
		expect(service.replacePlan.mock.calls[0][0].data).toEqual(original.data);
	});

	it('clears optional fields only when the update supplies null', async () => {
		const failed = { ...task(randomUUID()), status: 'failed' };
		const pending = { ...task(randomUUID()), fallbackFor: failed.id, resultSummary: 'Old note' };
		const current = stored(
			parseAgentPlan(
				{
					...document(failed, pending),
					presentation: { label: 'Researching', detail: 'Old detail' },
				},
				2,
			),
		);
		service.findPlan.mockResolvedValue(current);

		await call('update_plan', {
			planId: current.id,
			expectedRevision: 1,
			document: {
				presentation: { detail: null },
				items: [{ id: pending.id, fallbackFor: null, resultSummary: null }],
			},
		});

		const data = parseAgentPlan(service.replacePlan.mock.calls[0][0].data, 2);

		expect(data.presentation).toEqual({ label: 'Researching' });
		expect(data.items[1]).not.toHaveProperty('fallbackFor');
		expect(data.items[1]).not.toHaveProperty('resultSummary');
		expect(data.items[0]).toEqual(current.data.items[0]);

		await call('update_plan', {
			planId: current.id,
			expectedRevision: 1,
			document: { presentation: null },
		});

		expect(
			parseAgentPlan(service.replacePlan.mock.calls[1][0].data, 2).presentation,
		).toBeUndefined();
	});

	it('replaces a supplied dependency list and preserves omitted lists', async () => {
		const first = task(randomUUID());
		const second = { ...task(randomUUID()), dependsOn: [first.id] };
		const third = { ...task(randomUUID()), dependsOn: [second.id] };
		const current = stored(parseAgentPlan(document(first, second, third), 2));
		service.findPlan.mockResolvedValue(current);

		await call('update_plan', {
			planId: current.id,
			expectedRevision: 1,
			document: {
				items: [
					{ id: third.id, title: 'Review' },
					{ id: second.id, dependsOn: [] },
				],
			},
		});

		const data = parseAgentPlan(service.replacePlan.mock.calls[0][0].data, 2);

		expect(data.items.map((item) => item.id)).toEqual([first.id, second.id, third.id]);
		expect(data.items[1].dependsOn).toEqual([]);
		expect(data.items[2].dependsOn).toEqual([second.id]);
	});

	it('rejects child updates in the wrong group and updates inside a removed group', async () => {
		const child = task(randomUUID());
		const group = { ...task(randomUUID()), kind: 'group', tasks: [child] };
		const current = stored(parseAgentPlan(document(group), 2));
		service.findPlan.mockResolvedValue(current);
		const input = { planId: current.id, expectedRevision: 1 };

		expect(
			await call('update_plan', {
				...input,
				document: { items: [{ id: child.id, status: 'done' }] },
			}),
		).toMatchObject({ error: 'invalid_plan' });
		expect(
			await call('update_plan', {
				...input,
				removeItemIds: [group.id],
				document: { items: [{ id: group.id, tasks: [{ id: child.id, status: 'done' }] }] },
			}),
		).toMatchObject({ error: 'invalid_plan' });
		expect(service.replacePlan).not.toHaveBeenCalled();
	});

	it.each([
		['unknown item', { document: { items: [{ id: randomUUID(), status: 'done' }] } }],
		[
			'duplicate item',
			{
				document: {
					items: [
						{ id: original.data.items[0].id, status: 'done' },
						{ id: original.data.items[0].id, title: 'Changed' },
					],
				},
			},
		],
		['unknown removal', { document: {}, removeItemIds: [randomUUID()] }],
		[
			'duplicate removal',
			{ document: {}, removeItemIds: [original.data.items[0].id, original.data.items[0].id] },
		],
		[
			'update and removal',
			{
				document: { items: [{ id: original.data.items[0].id, status: 'done' }] },
				removeItemIds: [original.data.items[0].id],
			},
		],
		['incomplete new item', { document: { items: [{ id: 'new:extra', status: 'pending' }] } }],
		['unknown field', { document: { items: [{ id: original.data.items[0].id, statuz: 'done' }] } }],
		['timestamp', { document: { items: [{ id: original.data.items[0].id, startedAt: null }] } }],
	])('rejects an update with %s', async (_label, input) => {
		expect(await call('update_plan', { ...write, ...input })).toMatchObject({
			error: 'invalid_plan',
		});
		expect(service.replacePlan).not.toHaveBeenCalled();
	});

	it('returns presentation text on creation and full-document updates', async () => {
		const presentation = { label: 'Researching', detail: 'Checking three sources.' };
		expect(
			await call('create_plan', { document: { ...document(task()), presentation } }),
		).toMatchObject({ document: { presentation } });
		const { startedAt, endedAt, ...existingTask } = original.data.items[0];
		const proposed = {
			...document(existingTask),
			presentation: { label: 'Research complete', detail: 'Found three sources.' },
		};
		expect(await call('update_plan', { ...write, document: proposed })).toMatchObject({
			revision: 2,
			document: proposed,
		});
		expect(service.replacePlan.mock.calls[0][0].data).toMatchObject({
			presentation: proposed.presentation,
			items: [{ ...existingTask, startedAt, endedAt }],
		});
	});

	it('generates permanent IDs and resolves forward, group, and child references', async () => {
		const result = await call('create_plan', {
			document: document(
				{ ...task('new:report'), dependsOn: ['new:phase'] },
				{
					...task('new:phase'),
					kind: 'group',
					tasks: [{ ...task('new:second'), dependsOn: ['new:first'] }, task('new:first')],
				},
			),
		});

		const [input, ctx] = service.createActivePlan.mock.calls[0];
		const data = parseAgentPlan(input.data, 2);
		const phase = data.items[1];

		if (phase.kind !== 'group') throw new Error('Expected a group');

		expect(data.items[0].dependsOn).toEqual([phase.id]);
		expect(phase.tasks[0].dependsOn).toEqual([phase.tasks[1].id]);
		expect(
			new Set([
				input.id,
				...data.items.map((item) => item.id),
				...phase.tasks.map((item) => item.id),
			]).size,
		).toBe(5);
		expect(input).toMatchObject({ threadId: 'thread-1', formatVersion: 2 });
		expect(ctx).toEqual({});
		expect(result).toMatchObject({
			planId: input.id,
			revision: 1,
			closed: false,
			startedAt: null,
			closedAt: null,
			readiness: { ready: [phase.id, phase.tasks[1].id] },
		});

		for (const hidden of ['endedAt', 'createdAt', 'updatedAt', 'threadId', 'formatVersion']) {
			expect(JSON.stringify(result)).not.toContain(`"${hidden}"`);
		}

		expect(JSON.stringify(result)).not.toContain('new:');
		expect(result).not.toHaveProperty('document.items.0.startedAt');
		expect(result).not.toHaveProperty('document.items.1.tasks.0.startedAt');
	});

	it('returns the earliest stored start and the plan closure time outside the document', async () => {
		const startedAt = '2026-10-01T10:00:00.000Z';
		const later = '2026-10-01T10:02:00.000Z';
		const closedAt = new Date('2026-10-01T10:05:00.000Z');
		const plan = {
			...stored(
				parseAgentPlan(
					document(
						{ ...task(randomUUID()), startedAt: later, status: 'done', endedAt: later },
						{
							...task(randomUUID()),
							kind: 'group',
							startedAt: later,
							tasks: [{ ...task(randomUUID()), startedAt, status: 'done', endedAt: later }],
						},
					),
					2,
				),
			),
			closedAt,
		};
		service.closePlan.mockResolvedValue(plan);

		expect(await call('close_plan', write)).toMatchObject({
			startedAt,
			closedAt: closedAt.toISOString(),
			closed: true,
		});

		service.findActivePlan.mockResolvedValue({ ...plan, closedAt: null });

		expect(await call('read_plan', {})).toMatchObject({ startedAt, closedAt: null, closed: false });
	});

	it.each([
		['duplicate aliases', document(task(), task())],
		[
			'aliases shared by a group and child',
			document({ ...task(), kind: 'group', tasks: [task()] }),
		],
		['missing aliases', document({ ...task(), dependsOn: ['new:missing'] })],
		['new UUIDs', document(task(randomUUID()))],
		['invalid aliases', document(task('new:'))],
		['unknown fields', { ...document(task()), extra: true }],
		['invalid presentation', { ...document(task()), presentation: { label: '' } }],
		['caller timestamps', document({ ...task(), startedAt: null })],
		[
			'child timestamps',
			document({ ...task(), kind: 'group', tasks: [{ ...task('new:child'), endedAt: null }] }),
		],
	])('rejects %s before creation', async (_label, proposed) => {
		expect(await call('create_plan', { document: proposed })).toMatchObject({
			error: 'invalid_plan',
		});
		expect(service.createActivePlan).not.toHaveBeenCalled();
	});

	it('restores group and task timestamps while preserving canonical IDs', async () => {
		const startedAt = '2026-09-24T10:00:00.000Z';
		const currentTask: AgentPlanTask = {
			...task(randomUUID()),
			status: 'in_progress',
			startedAt,
			endedAt: null,
		};
		const current = stored(
			parseAgentPlan(
				document({
					...task(randomUUID()),
					kind: 'group',
					status: 'in_progress',
					startedAt,
					tasks: [currentTask],
				}),
				2,
			),
		);
		service.findPlan.mockResolvedValue(current);
		const result = await call('update_plan', {
			planId: current.id,
			expectedRevision: 1,
			document: document({
				id: current.data.items[0].id,
				kind: 'group',
				tasks: [
					{ ...task(currentTask.id), status: 'done', resultSummary: 'Findings' },
					task('new:extra'),
				],
			}),
		});

		expect(result).toMatchObject({ revision: 2 });
		expect(service.findPlan).toHaveBeenCalledWith('thread-1', current.id, {});
		expect(service.replacePlan).toHaveBeenCalledWith(
			{
				planId: current.id,
				threadId: 'thread-1',
				expectedRevision: 1,
				formatVersion: 2,
				data: expect.objectContaining({
					items: [
						expect.objectContaining({
							startedAt,
							endedAt: null,
							tasks: [
								expect.objectContaining({ id: currentTask.id, startedAt, endedAt: null }),
								expect.objectContaining({ startedAt: null, endedAt: null }),
							],
						}),
					],
				}),
			},
			{},
		);
	});

	it('preserves fallback references and resolves new dependent references', async () => {
		const failed = {
			...original.data.items[0],
			status: 'failed',
			startedAt: '2026-09-24T10:00:00Z',
			endedAt: '2026-09-24T11:00:00Z',
		};
		service.findPlan.mockResolvedValue(stored(parseAgentPlan(document(failed), 2)));
		const current = await service.findPlan('thread-1', original.id, {});

		if (!current) throw new Error('Expected a plan');

		await call('update_plan', {
			planId: current.id,
			expectedRevision: 1,
			document: document(
				{ ...task(failed.id), status: 'failed' },
				{ ...task('new:fallback'), fallbackFor: failed.id },
				{ ...task('new:dependent'), dependsOn: ['new:fallback'] },
			),
		});

		const data = parseAgentPlan(service.replacePlan.mock.calls[0][0].data, 2);

		expect(data.items[1]).toMatchObject({ fallbackFor: failed.id });
		expect(data.items[2].dependsOn).toEqual([data.items[1].id]);
	});

	it('resolves fallback aliases before service validation', async () => {
		await call('create_plan', {
			document: document(task(), { ...task('new:replacement'), fallbackFor: 'new:research' }),
		});

		const data = parseAgentPlan(service.createActivePlan.mock.calls[0][0].data, 2);

		expect(data.items[1]).toMatchObject({ fallbackFor: data.items[0].id });
	});

	it.each([null, { ...original, revision: 2 }, { ...original, closedAt: new Date() }])(
		'rejects updates without the expected active revision',
		async (current) => {
			service.findPlan.mockResolvedValue(current);
			expect(await call('update_plan', { ...write, document: document() })).toMatchObject({
				error: 'conflict',
				message: expect.stringContaining('read_plan'),
			});
			expect(service.replacePlan).not.toHaveBeenCalled();
		},
	);

	it('returns service conflicts without retrying', async () => {
		service.replacePlan.mockRejectedValue(new AgentPlanWriteConflictError());
		expect(await call('update_plan', { ...write, document: document() })).toMatchObject({
			error: 'conflict',
		});
		expect(service.replacePlan).toHaveBeenCalledTimes(1);
	});

	it('returns validation errors but propagates unexpected errors', async () => {
		service.createActivePlan.mockRejectedValueOnce(
			new AgentPlanValidationError('New items must be pending'),
		);
		expect(await call('create_plan', { document: document(task()) })).toEqual({
			error: 'invalid_plan',
			message: 'New items must be pending',
		});
		service.findActivePlan.mockRejectedValueOnce(new Error('Database unavailable'));
		await expect(call('read_plan', {})).rejects.toThrow('Database unavailable');
	});

	it('reads each invocation scope without caching plan state', async () => {
		service.findActivePlan.mockResolvedValueOnce(original).mockResolvedValueOnce(null);
		expect(await call('read_plan', {})).toMatchObject({ planId: original.id });
		expect(
			await call(
				'read_plan',
				{},
				{ persistence: { threadId: 'thread-2', resourceId: 'resource-2' } },
			),
		).toBeNull();
		expect(service.findActivePlan.mock.calls).toEqual([
			['thread-1', {}],
			['thread-2', {}],
		]);
	});

	it('closes at the supplied revision and returns only the model-facing document', async () => {
		service.closePlan.mockResolvedValue({
			...original,
			revision: 2,
			closedAt: new Date(),
			readiness: { ready: [], blocked: [] },
		});
		expect(await call('close_plan', write)).toMatchObject({
			planId: original.id,
			revision: 2,
			closed: true,
			readiness: { ready: [], blocked: [] },
		});
		expect(service.closePlan).toHaveBeenCalledWith({ ...write, threadId: 'thread-1' }, {});
	});

	it.each(['create_plan', 'read_plan', 'update_plan', 'close_plan'])(
		'rejects %s without thread context',
		async (name) => {
			expect(await call(name, {}, {})).toMatchObject({ error: 'unavailable' });
			for (const method of [
				service.findPlan,
				service.findActivePlan,
				service.createActivePlan,
				service.replacePlan,
				service.closePlan,
			]) {
				expect(method).not.toHaveBeenCalled();
			}
		},
	);

	it('rejects thread and format overrides', async () => {
		expect(await call('read_plan', { threadId: 'other-thread' })).toMatchObject({
			error: 'invalid_plan',
		});
		expect(await call('create_plan', { document: document(), formatVersion: 2 })).toMatchObject({
			error: 'invalid_plan',
		});
		expect(service.findActivePlan).not.toHaveBeenCalled();
		expect(service.createActivePlan).not.toHaveBeenCalled();
	});
});

it('returns calculated task status without a display overlay', async () => {
	const data = {
		...original.data,
		items: [{ ...original.data.items[0], status: 'paused' as const }],
	};
	service.findActivePlan.mockResolvedValue({ ...original, data });

	expect(await call('read_plan', {})).toMatchObject({
		document: { items: [{ status: 'paused' }] },
	});
	expect(await call('read_plan', {})).not.toHaveProperty('workState');
});

it('uses the last task end time when all leaves finish before the plan closes', () => {
	const first = {
		...original.data.items[0],
		status: 'done' as const,
		endedAt: '2026-10-15T10:01:00.000Z',
	};
	const last = {
		...original.data.items[0],
		id: randomUUID(),
		status: 'failed' as const,
		endedAt: '2026-10-15T10:02:00.000Z',
	};
	const plan = { ...original, data: { ...original.data, items: [first, last] } };
	expect(presentPlan(plan)).toMatchObject({ closed: false, finishedAt: last.endedAt });
	expect(
		presentPlan({
			...plan,
			data: { ...plan.data, items: [first, { ...last, status: 'pending', endedAt: null }] },
		}),
	).toMatchObject({ finishedAt: null });
	expect(presentPlan({ ...plan, data: { ...plan.data, items: [] } })).toMatchObject({
		finishedAt: null,
	});
});

it.each(['pending', 'in_progress', 'done'] as const)(
	'uses child end times when a non-empty group is %s',
	(status) => {
		const childEnd = '2026-10-15T10:01:00.000Z';
		const group = {
			...task(randomUUID()),
			kind: 'group',
			status,
			endedAt: status === 'done' ? '2026-10-15T10:02:00.000Z' : null,
			tasks: [{ ...task(randomUUID()), status: 'done', endedAt: childEnd }],
		};
		const plan = stored(parseAgentPlan(document(group), 2));

		expect(presentPlan(plan)).toMatchObject({
			finishedAt: childEnd,
			readiness: { ready: status === 'pending' ? [group.id] : [], blocked: [] },
		});
	},
);

it('waits for an empty group before reporting a finish time', () => {
	const finished = { ...task(randomUUID()), status: 'done', endedAt: '2026-10-15T10:01:00.000Z' };
	const emptyGroup = { ...task(randomUUID()), kind: 'group', tasks: [] };

	expect(presentPlan(stored(parseAgentPlan(document(finished, emptyGroup), 2)))).toMatchObject({
		finishedAt: null,
	});

	const endedAt = '2026-10-15T10:02:00.000Z';
	const plan = stored(
		parseAgentPlan(document(finished, { ...emptyGroup, status: 'cancelled', endedAt }), 2),
	);

	expect(presentPlan(plan)).toMatchObject({ finishedAt: endedAt });
});
