import type { BuiltTool, ToolContext } from '@n8n/agents';
import { randomUUID } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import type { AgentPlanService } from '../../agent-plan.service';
import { AgentPlanWriteConflictError } from '../../repositories/agent-plan.repository';
import { createAgentPlanTools } from '../agent-plan-tools';
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
	formatVersion: 1,
	data,
	closedAt: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	readiness: getAgentPlanReadiness(data),
});
const original = stored(parseAgentPlan(document(task(randomUUID())), 1));
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
		const data = parseAgentPlan(input.data, 1);
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
		expect(input).toMatchObject({ threadId: 'thread-1', formatVersion: 1 });
		expect(ctx).toEqual({});
		expect(result).toMatchObject({
			planId: input.id,
			revision: 1,
			closed: false,
			readiness: { ready: [phase.id, phase.tasks[1].id] },
		});
		for (const hidden of [
			'startedAt',
			'endedAt',
			'createdAt',
			'updatedAt',
			'threadId',
			'formatVersion',
		]) {
			expect(JSON.stringify(result)).not.toContain(`"${hidden}"`);
		}
		expect(JSON.stringify(result)).not.toContain('new:');
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
				1,
			),
		);
		service.findPlan.mockResolvedValue(current);
		const result = await call('update_plan', {
			planId: current.id,
			expectedRevision: 1,
			document: document({
				...task(current.data.items[0].id),
				kind: 'group',
				status: 'in_progress',
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
				formatVersion: 1,
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
		service.findPlan.mockResolvedValue(stored(parseAgentPlan(document(failed), 1)));
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
		const data = parseAgentPlan(service.replacePlan.mock.calls[0][0].data, 1);
		expect(data.items[1]).toMatchObject({ fallbackFor: failed.id });
		expect(data.items[2].dependsOn).toEqual([data.items[1].id]);
	});

	it('resolves fallback aliases before service validation', async () => {
		await call('create_plan', {
			document: document(task(), { ...task('new:replacement'), fallbackFor: 'new:research' }),
		});
		const data = parseAgentPlan(service.createActivePlan.mock.calls[0][0].data, 1);
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
