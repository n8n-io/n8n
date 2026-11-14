import { mockInstance, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { agentBuilderTargetMetadata, readAgentTargetsMetadata } from '@n8n/instance-ai';
import { randomUUID } from 'node:crypto';

import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { SystemAgentEvalService } from '@/modules/agents/system-agents/system-agent-eval.service';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';
import { SystemAgentRegistrationService } from '@/modules/agents/system-agents/system-agent-registration.service';
import type { SystemAgentProvider } from '@/modules/agents/system-agents/system-agent.types';
import { AssistantTurnOverrides } from '@/modules/instance-ai/turn-setup/assistant-turn-overrides';
import { ASSISTANT_AGENT_ID } from '@/modules/instance-ai/assistant-agent/assistant-turn-options';
import '@/modules/instance-ai/eval/assistant-agent-eval.controller';
import { EvalAssistantTurnOverrides } from '@/modules/instance-ai/eval/eval-assistant-turn-overrides';
import { FailedExecutionPortabilityService } from '@/modules/instance-ai/eval/failed-execution-portability.service';
import { EvalThreadRestoreService } from '@/modules/instance-ai/eval/thread-restore.service';
import { InstanceAiSettingsService } from '@/modules/instance-ai/instance-ai-settings.service';

import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

// A stand-in for the Assistant agent: these routes only need a registered provider.
const provider: SystemAgentProvider = {
	agentId: ASSISTANT_AGENT_ID,
	name: 'n8n Assistant',
	authorize: async () => true,
	prepareTurn: async () => {
		throw new Error('No turn runs in this test');
	},
};

beforeAll(async () => {
	await testModules.loadModules(['agents']);
});

describe('Assistant agent eval routes', () => {
	mockInstance(InstanceAiSettingsService).isInstanceAiEnabled.mockReturnValue(true);
	const evalThreadRestore = mockInstance(EvalThreadRestoreService);
	mockInstance(FailedExecutionPortabilityService);
	const server = setupTestServer({ endpointGroups: ['module-settings'] });

	let owner: User;
	let ownerAgent: SuperAgentTest;
	let otherAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;
	let projectId: string;
	let overrides: EvalAssistantTurnOverrides;

	beforeAll(async () => {
		// As the module does on an eval instance: the eval overrides replace the default.
		overrides = Container.get(EvalAssistantTurnOverrides);
		Container.set(AssistantTurnOverrides, overrides);
		await Container.get(SystemAgentRegistrationService).register(provider);
		owner = await createOwner();
		ownerAgent = server.authAgentFor(owner);
		otherAgent = server.authAgentFor(await createOwner());
		memberAgent = server.authAgentFor(await createMember());
		projectId = (await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id))
			.id;
	});

	it('creates a thread, sets it up and deletes it', async () => {
		const threadId = randomUUID();

		const created = await ownerAgent
			.post('/assistant/eval/threads')
			.send({ threadId, projectId })
			.expect(200);
		expect(created.body.data).toEqual({ threadId, projectId });
		// Creating the same thread again returns it.
		await ownerAgent.post('/assistant/eval/threads').send({ threadId, projectId }).expect(200);

		await ownerAgent
			.put(`/assistant/eval/threads/${threadId}/overrides`)
			.send({ promptVersion: 'v2' })
			.expect(200);
		await ownerAgent
			.put(`/assistant/eval/threads/${threadId}/overrides`)
			.send({ promptVersion: 'v3' })
			.expect(200);
		expect(Container.get(AssistantTurnOverrides).getPromptVersion(threadId)).toBe('v3');

		await ownerAgent
			.post('/assistant/eval/thread-credential-allowlist')
			.send({ threadId, credentialIds: ['cred-1'], bypassCredentialTest: ['cred-1'] })
			.expect(200);
		expect(Container.get(AssistantTurnOverrides).getCredentialIdAllowlist(threadId)).toEqual([
			'cred-1',
		]);

		const deleted = await ownerAgent.delete(`/assistant/eval/threads/${threadId}`).expect(200);
		expect(deleted.body.data).toEqual({ ok: true });
		expect(
			Container.get(AssistantTurnOverrides).getCredentialIdAllowlist(threadId),
		).toBeUndefined();
		expect(Container.get(AssistantTurnOverrides).getPromptVersion(threadId)).toBeUndefined();
		await ownerAgent.put(`/assistant/eval/threads/${threadId}/overrides`).send({}).expect(404);
	});

	it('restores a seeded conversation that the next turn loads as history', async () => {
		const threadId = randomUUID();
		await ownerAgent.post('/assistant/eval/threads').send({ threadId, projectId }).expect(200);
		const messages = [
			{
				id: 'msg-1',
				createdAt: '2026-01-01T00:00:00.000Z',
				role: 'user',
				content: [{ type: 'text', text: 'Build a workflow that posts to Slack' }],
			},
			{
				id: 'msg-2',
				createdAt: '2026-01-01T00:00:01.000Z',
				role: 'assistant',
				content: [{ type: 'text', text: 'I built the workflow.' }],
			},
			{
				id: 'msg-3',
				createdAt: '2026-01-01T00:00:02.000Z',
				role: 'user',
				content: [{ type: 'text', text: 'Thanks' }],
			},
		];
		const workflow = { id: 'wf-seed-1', name: 'Post to Slack', nodes: [], connections: {} };
		// The artifact restore has its own tests. Here it returns what a real restore returns.
		const rollback = vi.fn(async () => {});
		evalThreadRestore.restoreSeedArtifacts.mockResolvedValueOnce({
			folderIds: [],
			dataTableIds: [],
			workflowIds: [workflow.id],
			createdWorkflowIds: [workflow.id],
			publishedWorkflowIds: [],
			agentIds: ['agent-seed-1'],
			agentBuilderBinding: agentBuilderTargetMetadata([
				{ agentId: 'agent-seed-1', projectId, name: 'Slack bot', ref: 'Slack bot' },
			]),
			rollback,
		});

		const restored = await ownerAgent
			.post('/assistant/eval/restore-thread')
			.send({ threadId, messages, workflows: [workflow] })
			.expect(200);

		expect(restored.body.data).toEqual({
			ok: true,
			threadId,
			restored: 3,
			workflowIds: [workflow.id],
			dataTableIds: [],
			agentIds: ['agent-seed-1'],
			folderIds: [],
		});
		expect(rollback).not.toHaveBeenCalled();
		// The runtime loads the history of a turn with this read.
		const memory = Container.get(N8nMemory).getImplementation(ASSISTANT_AGENT_ID);
		const resourceId = Container.get(SystemAgentExecutionService).resourceIdFor(owner);
		const history = await memory.getMessages(threadId, { resourceId });
		// The order, roles and content stay as in the seed. The ids are new.
		expect(history).toMatchObject(messages.map(({ role, content }) => ({ role, content })));
		expect(history.map(({ id }) => id)).not.toContain('msg-1');
		// The builder tools of the next turn read the binding from the memory row.
		const thread = await memory.getThread(threadId);
		expect(thread?.resourceId).toBe(resourceId);
		expect(readAgentTargetsMetadata(thread?.metadata).bound).toMatchObject({
			agentId: 'agent-seed-1',
			projectId,
		});

		await ownerAgent.delete(`/assistant/eval/threads/${threadId}`).expect(200);
		await expect(memory.getMessages(threadId, { resourceId })).resolves.toEqual([]);
	});

	it('undoes the binding and rolls back the artifacts when the message write fails', async () => {
		const threadId = randomUUID();
		await ownerAgent.post('/assistant/eval/threads').send({ threadId, projectId }).expect(200);
		const memory = Container.get(N8nMemory).getImplementation(ASSISTANT_AGENT_ID);
		const resourceId = Container.get(SystemAgentExecutionService).resourceIdFor(owner);
		// Metadata that the thread already has. The undo must keep it.
		await memory.saveThread({ id: threadId, resourceId, metadata: { openTabs: ['wf-1'] } });
		const rollback = vi.fn(async () => {});
		evalThreadRestore.restoreSeedArtifacts.mockResolvedValueOnce({
			folderIds: [],
			dataTableIds: [],
			workflowIds: [],
			createdWorkflowIds: [],
			publishedWorkflowIds: [],
			agentIds: ['agent-seed-1'],
			agentBuilderBinding: agentBuilderTargetMetadata([
				{ agentId: 'agent-seed-1', projectId, name: 'Slack bot', ref: 'Slack bot' },
			]),
			rollback,
		});
		// The real binding write runs. The message write after it fails.
		const saveMessages = vi
			.spyOn(Container.get(SystemAgentEvalService), 'saveMessages')
			.mockRejectedValueOnce(new Error('The message write failed'));

		await ownerAgent
			.post('/assistant/eval/restore-thread')
			.send({
				threadId,
				messages: [
					{
						id: randomUUID(),
						createdAt: '2026-01-01T00:00:00.000Z',
						role: 'user',
						content: [{ type: 'text', text: 'Hi' }],
					},
				],
			})
			.expect(500);

		expect(saveMessages).toHaveBeenCalledTimes(1);
		expect(rollback).toHaveBeenCalledTimes(1);
		const thread = await memory.getThread(threadId);
		expect(readAgentTargetsMetadata(thread?.metadata).bound).toBeUndefined();
		expect(thread?.metadata).toMatchObject({ openTabs: ['wf-1'] });
		await expect(memory.getMessages(threadId, { resourceId })).resolves.toEqual([]);
	});

	it('restores the same seed into two threads', async () => {
		// A seed with only messages, as when the harness runs one case more than once.
		const messages = [
			{
				id: 'msg-1',
				createdAt: '2026-01-01T00:00:00.000Z',
				role: 'user',
				content: [{ type: 'text', text: 'Build a workflow' }],
			},
			{
				id: 'msg-2',
				createdAt: '2026-01-01T00:00:01.000Z',
				role: 'assistant',
				content: [{ type: 'text', text: 'Done' }],
			},
		];
		const memory = Container.get(N8nMemory).getImplementation(ASSISTANT_AGENT_ID);
		const resourceId = Container.get(SystemAgentExecutionService).resourceIdFor(owner);
		const threadIds = [randomUUID(), randomUUID()];

		for (const threadId of threadIds) {
			await ownerAgent.post('/assistant/eval/threads').send({ threadId, projectId }).expect(200);
			evalThreadRestore.restoreSeedArtifacts.mockResolvedValueOnce({
				folderIds: [],
				dataTableIds: [],
				workflowIds: [],
				createdWorkflowIds: [],
				publishedWorkflowIds: [],
				agentIds: [],
				agentBuilderBinding: undefined,
				rollback: async () => {},
			});
			const restored = await ownerAgent
				.post('/assistant/eval/restore-thread')
				.send({ threadId, messages })
				.expect(200);
			expect(restored.body.data).toMatchObject({ ok: true, restored: 2 });
		}

		const [first, second] = await Promise.all(
			threadIds.map(async (threadId) => await memory.getMessages(threadId, { resourceId })),
		);
		expect(first).toHaveLength(2);
		expect(second).toHaveLength(2);
		// Each thread keeps its own copy.
		const ids = [...first, ...second].map(({ id }) => id);
		expect(new Set(ids).size).toBe(4);

		for (const threadId of threadIds) {
			await ownerAgent.delete(`/assistant/eval/threads/${threadId}`).expect(200);
		}
	});

	it('stores the thread provenance in the thread metadata', async () => {
		const threadId = randomUUID();
		const provenance = {
			source: 'evals',
			sourceContext: { evalCase: 'slack-digest', evalIteration: 2 },
		};

		await ownerAgent
			.post('/assistant/eval/threads')
			.send({ threadId, projectId, ...provenance })
			.expect(200);
		// Creating the same thread again keeps one row with the same metadata.
		await ownerAgent
			.post('/assistant/eval/threads')
			.send({ threadId, projectId, ...provenance })
			.expect(200);

		// The trace of each turn reads the provenance with this read.
		const memory = Container.get(N8nMemory).getImplementation(ASSISTANT_AGENT_ID);
		const thread = await memory.getThread(threadId);
		expect(thread?.resourceId).toBe(
			Container.get(SystemAgentExecutionService).resourceIdFor(owner),
		);
		expect(thread?.metadata).toMatchObject(provenance);

		await ownerAgent.delete(`/assistant/eval/threads/${threadId}`).expect(200);
	});

	it('does not create the memory row when the request has no provenance', async () => {
		const threadId = randomUUID();

		await ownerAgent.post('/assistant/eval/threads').send({ threadId, projectId }).expect(200);

		const memory = Container.get(N8nMemory).getImplementation(ASSISTANT_AGENT_ID);
		await expect(memory.getThread(threadId)).resolves.toBeNull();

		await ownerAgent.delete(`/assistant/eval/threads/${threadId}`).expect(200);
	});

	it('rejects a thread source that is not known', async () => {
		await ownerAgent
			.post('/assistant/eval/threads')
			.send({ threadId: randomUUID(), projectId, source: 'not-a-source' })
			.expect(400);
	});

	it('rejects a seed message that is not valid before it creates any artifact', async () => {
		const threadId = randomUUID();
		await ownerAgent.post('/assistant/eval/threads').send({ threadId, projectId }).expect(200);
		evalThreadRestore.restoreSeedArtifacts.mockClear();

		await ownerAgent
			.post('/assistant/eval/restore-thread')
			.send({ threadId, messages: [{ id: 'msg-1', role: 'user' }] })
			.expect(400);

		expect(evalThreadRestore.restoreSeedArtifacts).not.toHaveBeenCalled();
	});

	it('rejects a thread of another user', async () => {
		const threadId = randomUUID();
		await ownerAgent.post('/assistant/eval/threads').send({ threadId, projectId }).expect(200);

		await otherAgent
			.put(`/assistant/eval/threads/${threadId}/overrides`)
			.send({ promptVersion: 'v2' })
			.expect(404);
		await otherAgent
			.post('/assistant/eval/thread-credential-allowlist')
			.send({ threadId, credentialIds: [] })
			.expect(404);
		await otherAgent
			.post('/assistant/eval/restore-thread')
			.send({ threadId, messages: [] })
			.expect(404);
		await otherAgent.delete(`/assistant/eval/threads/${threadId}`).expect(404);

		expect(Container.get(AssistantTurnOverrides).getPromptVersion(threadId)).toBeUndefined();
		// The thread still exists for its owner.
		await ownerAgent.put(`/assistant/eval/threads/${threadId}/overrides`).send({}).expect(200);
	});

	it('rejects a caller without the instanceAi:manage scope', async () => {
		await memberAgent
			.post('/assistant/eval/threads')
			.send({ threadId: randomUUID(), projectId })
			.expect(403);
	});

	it('ignores unknown override fields', async () => {
		const threadId = randomUUID();
		await ownerAgent.post('/assistant/eval/threads').send({ threadId, projectId }).expect(200);

		await ownerAgent
			.put(`/assistant/eval/threads/${threadId}/overrides`)
			.send({ promptVersion: 'v2', mode: 'progressive', observerThresholdTokens: 5_000 })
			.expect(200);

		expect(Container.get(AssistantTurnOverrides).getPromptVersion(threadId)).toBe('v2');
	});
});
