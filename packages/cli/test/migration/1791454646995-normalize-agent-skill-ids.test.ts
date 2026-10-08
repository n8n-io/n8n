import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const migration = 'NormalizeAgentSkillIds1791454646995';
const agentId = 'Agent00000000001';
const projectId = 'Project000000001';
const skillId = 'skill_1111111111111111';
const taskId = 'task_2222222222222222';
const inlineSkillId = 'skill_3333333333333333';
const now = new Date('2026-01-01T00:00:00.000Z');
const skill = {
	name: 'Triage',
	description: 'Triage requests',
	instructions: 'Use lookup_customer.',
};
const tool = {
	code: 'export default new Tool("lookup_customer")',
	descriptor: { name: 'lookup_customer' },
};
const schema = {
	name: 'Agent',
	instructions: `Keep this text: ${skillId} ${taskId} lookup_customer.`,
	tools: [{ type: 'custom', id: 'lookup_customer', enabled: false }],
	skills: [{ type: 'skill', id: skillId }],
	tasks: [{ type: 'task', id: taskId, enabled: true }],
};
const backgroundRuntimeSnapshot = {
	source: {
		sourceId: agentId,
		config: {
			...schema,
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'credential-1',
			memory: { enabled: false, storage: 'n8n' },
		},
	},
	toolDescriptors: { lookup_customer: tool.descriptor },
	toolCodeByName: { lookup_customer: tool.code },
	skills: { [skillId]: skill },
};

type AgentConfig = typeof schema;
type AgentRow = {
	schema: AgentConfig;
	tools: Record<string, typeof tool>;
	skills: Record<string, typeof skill>;
};
type CheckpointState = {
	persistence: {
		hostMetadata: { n8nBackgroundSubAgent: { runtimeSnapshot: string } };
	};
	messageList: unknown;
};

function parse<T>(value: unknown): T {
	return (typeof value === 'string' ? JSON.parse(value) : value) as T;
}

describe('NormalizeAgentSkillIds migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(run: (ctx: TestMigrationContext) => Promise<T>): Promise<T> {
		const ctx = createTestMigrationContext(dataSource);
		try {
			return await run(ctx);
		} finally {
			await ctx.queryRunner.release();
		}
	}

	async function insert(table: string, values: Record<string, unknown>) {
		const columns = Object.keys(values);
		await withContext(
			async (ctx) =>
				await ctx.runQuery(
					`INSERT INTO ${ctx.escape.tableName(table)} (${columns.map(ctx.escape.columnName).join(', ')})
			 VALUES (${columns.map((column) => `:${column}`).join(', ')})`,
					values,
				),
		);
	}

	async function rows(table: string) {
		return await withContext(
			async (ctx) =>
				await ctx.runQuery<Array<Record<string, unknown>>>(
					`SELECT * FROM ${ctx.escape.tableName(table)}`,
				),
		);
	}

	async function insertAgent(id = agentId, values: Record<string, unknown> = {}) {
		await insert('agents', {
			id,
			projectId,
			name: 'Agent',
			integrations: '[]',
			schema: JSON.stringify(schema),
			tools: JSON.stringify({ lookup_customer: tool }),
			skills: JSON.stringify({ [skillId]: skill }),
			createdAt: now,
			updatedAt: now,
			...values,
		});
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (ctx) => await ctx.queryRunner.clearDatabase());
		await initDbUpToMigration(migration);
		await insert('project', {
			id: projectId,
			name: 'Project',
			type: 'team',
			createdAt: now,
			updatedAt: now,
		});
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function seedTask(versionId: string) {
		const body = {
			name: 'Daily summary',
			objective: 'Summarize activity',
			cronExpression: '0 9 * * *',
		};
		await insert('agent_task_definition', {
			id: taskId,
			agentId,
			...body,
			createdAt: now,
			updatedAt: now,
		});
		await insert('agent_task_snapshot', {
			taskId,
			versionId,
			enabled: true,
			...body,
			createdAt: now,
			updatedAt: now,
		});
		await insert('agent_task_run_lock', {
			taskId,
			agentId,
			holderId: randomUUID(),
			heldUntil: now,
			createdAt: now,
			updatedAt: now,
		});
		await insert('agent_execution_threads', {
			id: 'task-session',
			agentId,
			projectId,
			agentName: 'Agent',
			taskId,
			taskVersionId: versionId,
			createdAt: now,
			updatedAt: now,
		});
		await insert('scheduled_job', {
			id: 1,
			name: `agent-task:${agentId}:${taskId}`,
			ownerType: 'agent',
			ownerId: agentId,
			ownerMemberId: taskId,
			taskType: 'agent:scheduled-task',
			kind: 'cron',
			cronExpression: body.cronExpression,
			payload: JSON.stringify({ agentId, taskId }),
			createdAt: now,
			updatedAt: now,
		});
		await insert('scheduled_task', {
			id: 1,
			jobId: 1,
			taskType: 'agent:scheduled-task',
			payload: JSON.stringify({ agentId, taskId }),
			scheduledFor: now,
			runAt: now,
			createdAt: now,
		});
	}

	async function seedMemory(
		runtimeSource: Omit<typeof backgroundRuntimeSnapshot, 'skills'> & {
			skills: Record<string, typeof skill>;
		} = backgroundRuntimeSnapshot,
		skillInput: Record<string, string> = { skillId },
		pendingSkillInput: Record<string, string> = { skillId, name: skillId },
	) {
		const resourceId = `task:${taskId}`;
		const message = {
			role: 'assistant',
			content: [
				{ type: 'text', text: `Keep ${skillId} and ${taskId} in user text.` },
				{
					type: 'tool-call',
					toolName: 'load_skill',
					toolCallId: 'load-1',
					input: skillInput,
					output: { success: true, skillId },
					activatedSkillIds: [skillId],
					state: 'resolved',
				},
				{
					type: 'tool-call',
					toolName: 'lookup_customer',
					toolCallId: 'custom-1',
					input: { skillId },
					state: 'resolved',
				},
			],
		};
		await insert('agents_resources', { id: resourceId, createdAt: now, updatedAt: now });
		await insert('agents_threads', {
			id: 'task-session',
			resourceId,
			createdAt: now,
			updatedAt: now,
		});
		await insert('agents_messages', {
			id: 'message-1',
			threadId: 'task-session',
			resourceId,
			role: 'assistant',
			content: JSON.stringify(message),
			modelContent: JSON.stringify(message),
			createdAt: now,
			updatedAt: now,
		});
		await insert('agents_memory_entries', {
			id: 'memory-1',
			agentId,
			resourceId,
			content: 'A durable note',
			contentHash: 'hash',
			status: 'active',
			lastSeenAt: now,
			createdAt: now,
			updatedAt: now,
		});
		await insert('agents_memory_entry_candidates', {
			id: 'candidate-1',
			agentId,
			resourceId,
			threadId: 'task-session',
			runId: 'run-1',
			toolCallId: 'call-1',
			content: 'A new note',
			evidenceText: 'User input',
			kind: 'preference',
			createdAt: now,
			updatedAt: now,
		});
		await insert('agents_memory_entry_locks', {
			agentId,
			resourceId,
			holderId: 'holder',
			heldUntil: now,
			createdAt: now,
			updatedAt: now,
		});
		await insert('agent_background_job', {
			id: 'background-1',
			kind: 'subagent',
			status: 'running',
			title: 'Work',
			parentAgentId: agentId,
			parentThreadId: 'task-session',
			parentResourceId: resourceId,
			parentPrincipalHash: 'hash',
			createdAt: now,
			updatedAt: now,
		});
		await insert('agent_chat_attachments', {
			id: 'attachment-1',
			agentId,
			projectId,
			threadId: 'task-session',
			resourceId,
			binaryDataId: 'binary-1',
			fileName: 'notes.txt',
			mimeType: 'text/plain',
			fileSizeBytes: 5,
			source: 'chat',
			createdAt: now,
			updatedAt: now,
		});
		for (const [runId, runtimeSnapshot] of [
			['run-1', JSON.stringify(runtimeSource)],
			['invalid-background', '{'],
		]) {
			await insert('agent_checkpoints', {
				runId,
				agentId,
				threadId: 'task-session',
				expired: false,
				createdAt: now,
				updatedAt: now,
				state: JSON.stringify({
					status: 'suspended',
					persistence: {
						threadId: 'task-session',
						resourceId,
						hostMetadata: {
							n8nBackgroundSubAgent: {
								jobId: 'background-1',
								taskPath: '/root/research_0',
								resumeContext: { agentId },
								runtimeSnapshot,
								sharedWorkspace: false,
								messageContext: null,
							},
						},
					},
					messageList: {
						messages: [message],
						activeSkillIds: [skillId],
						historyIds: [],
						inputIds: [],
						responseIds: [],
					},
					pendingToolCalls: {
						'load-2': {
							toolName: 'load_skill',
							input: pendingSkillInput,
							activatedSkillIds: [skillId],
						},
					},
				}),
			});
		}
		await insert('agent_checkpoints', {
			runId: 'invalid',
			agentId,
			state: '{',
			expired: true,
			createdAt: now,
			updatedAt: now,
		});
	}

	async function seedInlineAgent() {
		const workflowId = 'Workflow00000001';
		const inlineAgent = {
			config: { skills: [{ type: 'skill', id: inlineSkillId }] },
			skills: { [inlineSkillId]: skill },
		};
		const node = {
			id: 'node-1',
			type: 'n8n-nodes-base.messageAnAgent',
			parameters: { agentSource: 'inline', inlineAgent },
		};
		const historyNode = {
			...node,
			parameters: { ...node.parameters, inlineAgent: JSON.stringify(inlineAgent) },
		};
		const unrelatedNode = { ...node, type: 'n8n-nodes-base.noOp' };
		for (let index = 1; index <= 101; index++) {
			const id = `Workflow${String(index).padStart(8, '0')}`;
			const hasInlineAgent = index === 1 || index === 101;
			await insert('workflow_entity', {
				id,
				name: 'Workflow',
				nodes: JSON.stringify([hasInlineAgent ? node : unrelatedNode]),
				connections: '{}',
				active: false,
				versionId: randomUUID(),
				createdAt: now,
				updatedAt: now,
			});
			await insert('workflow_history', {
				versionId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
				workflowId: id,
				authors: 'Test',
				connections: '{}',
				nodes: JSON.stringify([hasInlineAgent ? historyNode : unrelatedNode]),
				createdAt: now,
				updatedAt: now,
			});
		}
		for (const [id, status] of [
			[1, 'waiting'],
			[2, 'success'],
		]) {
			await insert('execution_entity', {
				id,
				workflowId,
				status,
				mode: 'manual',
				finished: status === 'success',
				createdAt: now,
			});
			await insert('execution_data', {
				executionId: id,
				data: '[]',
				workflowData: JSON.stringify({ nodes: [node] }),
			});
		}
		return unrelatedNode;
	}

	it('normalizes skills across batches and preserves task IDs and runtime state', async () => {
		const versionIds = Array.from({ length: 101 }, () => randomUUID());
		await insertAgent();
		for (const versionId of versionIds) {
			await insert('agent_history', {
				versionId,
				agentId,
				author: 'Test',
				schema: JSON.stringify(schema),
				tools: JSON.stringify({ lookup_customer: tool }),
				skills: JSON.stringify({ [skillId]: skill }),
				createdAt: now,
				updatedAt: now,
			});
		}
		await withContext(
			async (ctx) =>
				await ctx.runQuery(
					`UPDATE ${ctx.escape.tableName('agents')} SET ${ctx.escape.columnName('activeVersionId')} = :versionId`,
					{ versionId: versionIds[0] },
				),
		);
		await seedTask(versionIds[0]);
		await seedMemory();
		const unrelatedNode = await seedInlineAgent();

		await runSingleMigration(migration);

		const [agent] = await rows('agents');
		const tools = parse<AgentRow['tools']>(agent.tools);
		expect(tools).toEqual({ lookup_customer: tool });
		const expectedSchema = {
			...schema,
			skills: [{ type: 'skill', id: '1111111111111111' }],
		};
		expect(parse(agent.schema)).toEqual(expectedSchema);
		expect(parse(agent.skills)).toEqual({ '1111111111111111': skill });
		expect(agent.activeVersionId).toBe(versionIds[0]);
		const history = await rows('agent_history');
		expect(history).toHaveLength(101);
		for (const version of history) {
			expect(parse(version.schema)).toEqual(expectedSchema);
			expect(parse(version.tools)).toEqual(tools);
			expect(parse(version.skills)).toEqual({ '1111111111111111': skill });
		}
		expect(await rows('agent_task_definition')).toEqual([
			expect.objectContaining({ id: taskId, agentId, objective: 'Summarize activity' }),
		]);
		for (const table of ['agent_task_snapshot', 'agent_task_run_lock', 'agent_execution_threads']) {
			expect(await rows(table)).toEqual([expect.objectContaining({ taskId })]);
		}
		const [job] = await rows('scheduled_job');
		expect(job).toMatchObject({
			id: 1,
			name: `agent-task:${agentId}:${taskId}`,
			ownerMemberId: taskId,
		});
		expect(parse(job.payload)).toEqual({ agentId, taskId });
		const [occurrence] = await rows('scheduled_task');
		expect(parse(occurrence.payload)).toEqual({ agentId, taskId });
		expect(occurrence.status).toBe('pending');
		expect(await rows('agents_resources')).toEqual([
			expect.objectContaining({ id: `task:${taskId}` }),
		]);
		for (const table of [
			'agents_threads',
			'agents_messages',
			'agents_memory_entries',
			'agents_memory_entry_candidates',
			'agents_memory_entry_locks',
			'agent_chat_attachments',
		]) {
			expect(await rows(table)).toEqual([
				expect.objectContaining({ resourceId: `task:${taskId}` }),
			]);
		}
		expect(await rows('agent_background_job')).toEqual([
			expect.objectContaining({
				parentResourceId: `task:${taskId}`,
				parentPrincipalHash: 'hash',
			}),
		]);
		const checkpoints = await rows('agent_checkpoints');
		expect(checkpoints.find((row) => row.runId === 'invalid')?.state).toBe('{');
		const checkpoint = parse<CheckpointState>(
			checkpoints.find((row) => row.runId === 'run-1')?.state,
		);
		expect(checkpoint).toMatchObject({
			status: 'suspended',
			persistence: { resourceId: `task:${taskId}`, threadId: 'task-session' },
			messageList: { activeSkillIds: ['1111111111111111'] },
			pendingToolCalls: {
				'load-2': { input: { skillId: '1111111111111111', name: skillId } },
			},
		});
		expect(
			parse(checkpoint.persistence.hostMetadata.n8nBackgroundSubAgent.runtimeSnapshot),
		).toEqual({
			...backgroundRuntimeSnapshot,
			source: {
				...backgroundRuntimeSnapshot.source,
				config: {
					...backgroundRuntimeSnapshot.source.config,
					skills: [{ type: 'skill', id: '1111111111111111' }],
				},
			},
			skills: { '1111111111111111': skill },
		});
		const invalidBackground = parse<CheckpointState>(
			checkpoints.find((row) => row.runId === 'invalid-background')?.state,
		);
		expect(invalidBackground.persistence.hostMetadata.n8nBackgroundSubAgent.runtimeSnapshot).toBe(
			'{',
		);
		const expectedContent = [
			{ type: 'text', text: `Keep ${skillId} and ${taskId} in user text.` },
			{
				type: 'tool-call',
				toolName: 'load_skill',
				toolCallId: 'load-1',
				input: { skillId: '1111111111111111' },
				output: { success: true, skillId: '1111111111111111' },
				activatedSkillIds: ['1111111111111111'],
				state: 'resolved',
			},
			{
				type: 'tool-call',
				toolName: 'lookup_customer',
				toolCallId: 'custom-1',
				input: { skillId },
				state: 'resolved',
			},
		];
		expect(checkpoint.messageList).toMatchObject({
			messages: [{ role: 'assistant', content: expectedContent }],
		});
		const [message] = await rows('agents_messages');
		for (const column of ['content', 'modelContent'])
			expect(parse(message[column])).toEqual({ role: 'assistant', content: expectedContent });
		const expectedInline = {
			config: { skills: [{ type: 'skill', id: '3333333333333333' }] },
			skills: { '3333333333333333': skill },
		};
		for (const table of ['workflow_entity', 'workflow_history']) {
			const workflows = await rows(table);
			expect(workflows).toHaveLength(101);
			for (const workflow of workflows) {
				const id = table === 'workflow_entity' ? workflow.id : workflow.workflowId;
				if (id !== 'Workflow00000001' && id !== 'Workflow00000101') {
					expect(parse(workflow.nodes)).toEqual([unrelatedNode]);
					continue;
				}
				const [node] = parse<Array<{ parameters: { inlineAgent: unknown } }>>(workflow.nodes);
				expect(parse(node.parameters.inlineAgent)).toEqual(expectedInline);
			}
		}
		const executions = await rows('execution_data');
		const waiting = executions.find((row) => Number(row.executionId) === 1)!;
		const finished = executions.find((row) => Number(row.executionId) === 2)!;
		expect(parse(waiting.workflowData)).toMatchObject({
			nodes: [{ parameters: { inlineAgent: expectedInline } }],
		});
		expect(parse(finished.workflowData)).toMatchObject({
			nodes: [{ parameters: { inlineAgent: { skills: { [inlineSkillId]: skill } } } }],
		});
	});

	it('normalizes skills retained only in checkpoints and messages', async () => {
		const otherRetainedSkillId = 'skill_4444444444444444';
		const retainedSkill = { ...skill, name: otherRetainedSkillId };
		const otherRetainedSkill = { ...skill, name: 'Another retained skill' };
		await insertAgent(agentId, {
			schema: JSON.stringify({ ...schema, skills: [] }),
			skills: '{}',
		});
		await seedMemory(
			{
				...backgroundRuntimeSnapshot,
				source: {
					...backgroundRuntimeSnapshot.source,
					config: {
						...backgroundRuntimeSnapshot.source.config,
						skills: [
							...backgroundRuntimeSnapshot.source.config.skills,
							{ type: 'skill', id: otherRetainedSkillId },
						],
					},
				},
				skills: { [skillId]: retainedSkill, [otherRetainedSkillId]: otherRetainedSkill },
			},
			{ name: retainedSkill.name },
			{ name: retainedSkill.name },
		);

		await runSingleMigration(migration);

		const [agent] = await rows('agents');
		expect(parse(agent.schema)).toEqual({ ...schema, skills: [] });
		expect(parse(agent.skills)).toEqual({});
		const checkpoint = parse<CheckpointState>(
			(await rows('agent_checkpoints')).find((row) => row.runId === 'run-1')?.state,
		);
		const expectedCall = expect.objectContaining({
			toolName: 'load_skill',
			input: { name: retainedSkill.name },
			output: { success: true, skillId: '1111111111111111' },
			activatedSkillIds: ['1111111111111111'],
		});
		const expectedMessage = {
			role: 'assistant',
			content: [
				expect.objectContaining({ type: 'text' }),
				expectedCall,
				expect.objectContaining({ toolName: 'lookup_customer', input: { skillId } }),
			],
		};
		expect(checkpoint).toMatchObject({
			messageList: { activeSkillIds: ['1111111111111111'], messages: [expectedMessage] },
			pendingToolCalls: {
				'load-2': {
					input: { name: retainedSkill.name },
					activatedSkillIds: ['1111111111111111'],
				},
			},
		});
		const runtimeSnapshot =
			checkpoint.persistence.hostMetadata.n8nBackgroundSubAgent.runtimeSnapshot;
		expect(runtimeSnapshot).toEqual(expect.any(String));
		expect(parse(runtimeSnapshot)).toMatchObject({
			source: {
				config: {
					skills: [
						{ type: 'skill', id: '1111111111111111' },
						{ type: 'skill', id: '4444444444444444' },
					],
				},
			},
			skills: {
				'1111111111111111': retainedSkill,
				'4444444444444444': otherRetainedSkill,
			},
		});
		const [message] = await rows('agents_messages');
		for (const column of ['content', 'modelContent']) {
			expect(parse(message[column])).toEqual(expectedMessage);
		}
	});

	it.each(['configuration', 'retained snapshot'])(
		'preserves plain IDs from %s when removing a prefix would collide',
		async (location) => {
			const plainSkillId = skillId.slice('skill_'.length);
			const plainTaskId = taskId.slice('task_'.length);
			const collisionSchema = {
				...schema,
				skills: [...schema.skills, { type: 'skill', id: plainSkillId }],
				tasks: [...schema.tasks, { type: 'task', id: plainTaskId, enabled: false }],
			};
			const collisionSkills = {
				[skillId]: skill,
				[plainSkillId]: { ...skill, name: 'Another skill' },
			};
			await insertAgent(agentId, {
				schema: JSON.stringify({
					...collisionSchema,
					skills: location === 'configuration' ? collisionSchema.skills : schema.skills,
				}),
				skills: JSON.stringify(
					location === 'configuration' ? collisionSkills : { [skillId]: skill },
				),
			});
			for (const id of [taskId, plainTaskId]) {
				await insert('agent_task_definition', {
					id,
					agentId,
					name: id,
					objective: id,
					cronExpression: '0 9 * * *',
					createdAt: now,
					updatedAt: now,
				});
			}
			await seedMemory({
				...backgroundRuntimeSnapshot,
				source: {
					...backgroundRuntimeSnapshot.source,
					config: { ...backgroundRuntimeSnapshot.source.config, skills: collisionSchema.skills },
				},
				skills: collisionSkills,
			});

			await runSingleMigration(migration);

			const [agent] = await rows('agents');
			const config = parse<AgentConfig>(agent.schema);
			const newSkillId = config.skills[0].id;
			expect(newSkillId).toMatch(/^[A-Za-z0-9]{16}$/);
			expect(newSkillId).not.toBe(plainSkillId);
			const expectedSkills = {
				[newSkillId]: skill,
				[plainSkillId]: { ...skill, name: 'Another skill' },
			};
			if (location === 'configuration') {
				expect(config.skills[1].id).toBe(plainSkillId);
				expect(parse(agent.skills)).toEqual(expectedSkills);
			} else {
				expect(config.skills).toEqual([{ type: 'skill', id: newSkillId }]);
				expect(parse(agent.skills)).toEqual({ [newSkillId]: skill });
			}
			const checkpoint = parse<CheckpointState>(
				(await rows('agent_checkpoints')).find((row) => row.runId === 'run-1')?.state,
			);
			expect(
				parse(checkpoint.persistence.hostMetadata.n8nBackgroundSubAgent.runtimeSnapshot),
			).toMatchObject({
				source: {
					config: {
						skills: [
							{ type: 'skill', id: newSkillId },
							{ type: 'skill', id: plainSkillId },
						],
					},
				},
				skills: expectedSkills,
			});
			expect(config.tasks).toEqual(collisionSchema.tasks);
			expect(await rows('agent_task_definition')).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: taskId, objective: taskId }),
					expect.objectContaining({ id: plainTaskId, objective: plainTaskId }),
				]),
			);
		},
	);
});
