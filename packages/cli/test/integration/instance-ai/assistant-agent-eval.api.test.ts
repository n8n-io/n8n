import { mockInstance, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';
import { SystemAgentRegistrationService } from '@/modules/agents/system-agents/system-agent-registration.service';
import type { SystemAgentProvider } from '@/modules/agents/system-agents/system-agent.types';
import { AssistantTurnOverrides } from '@/modules/instance-ai/assistant-agent/assistant-turn-overrides';
import { ASSISTANT_AGENT_ID } from '@/modules/instance-ai/assistant-agent/assistant-turn-options';
import '@/modules/instance-ai/assistant-agent/eval/assistant-agent-eval.controller';
import { EvalAssistantTurnOverrides } from '@/modules/instance-ai/assistant-agent/eval/eval-assistant-turn-overrides';
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
	mockInstance(EvalThreadRestoreService);
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

	it('creates a thread, sets it up, reads its memory and deletes it', async () => {
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
			.send({ mode: 'progressive', promptVersion: 'v2', observerThresholdTokens: 5_000 })
			.expect(200);
		await ownerAgent
			.put(`/assistant/eval/threads/${threadId}/overrides`)
			.send({ observerThresholdTokens: 2_000 })
			.expect(200);
		expect(Container.get(AssistantTurnOverrides).getBuildMode(threadId)).toBeUndefined();
		expect(Container.get(AssistantTurnOverrides).getObserverThresholdTokens(threadId)).toBe(2_000);

		await ownerAgent
			.post('/assistant/eval/thread-credential-allowlist')
			.send({ threadId, credentialIds: ['cred-1'], bypassCredentialTest: ['cred-1'] })
			.expect(200);
		expect(Container.get(AssistantTurnOverrides).getCredentialIdAllowlist(threadId)).toEqual([
			'cred-1',
		]);

		const emptyMemory = await ownerAgent
			.get(`/assistant/eval/threads/${threadId}/memory`)
			.expect(200);
		expect(emptyMemory.body.data).toEqual({ observations: [], cursor: null });

		const memory = Container.get(N8nMemory).getImplementation(ASSISTANT_AGENT_ID);
		const observedAt = new Date('2026-01-02T00:00:00.000Z');
		// The first message creates the memory thread that the observations belong to.
		await memory.saveThread({
			id: threadId,
			resourceId: Container.get(SystemAgentExecutionService).resourceIdFor(owner),
		});
		await memory.appendObservationLogEntries([
			{
				observationScopeId: threadId,
				marker: 'important',
				text: 'User builds a Slack bot',
				tokenCount: 7,
				createdAt: observedAt,
			},
		]);
		await memory.setCursor({
			observationScopeId: threadId,
			lastObservedMessageId: 'msg-1',
			lastObservedAt: observedAt,
			updatedAt: observedAt,
		});
		const observed = await ownerAgent.get(`/assistant/eval/threads/${threadId}/memory`).expect(200);
		expect(observed.body.data).toEqual({
			observations: [{ marker: 'important', text: 'User builds a Slack bot', tokenCount: 7 }],
			cursor: { lastObservedMessageId: 'msg-1', lastObservedAt: observedAt.toISOString() },
		});

		const deleted = await ownerAgent.delete(`/assistant/eval/threads/${threadId}`).expect(200);
		expect(deleted.body.data).toEqual({ ok: true });
		expect(
			Container.get(AssistantTurnOverrides).getCredentialIdAllowlist(threadId),
		).toBeUndefined();
		expect(
			Container.get(AssistantTurnOverrides).getObserverThresholdTokens(threadId),
		).toBeUndefined();
		await ownerAgent.get(`/assistant/eval/threads/${threadId}/memory`).expect(404);
	});

	it('rejects a thread of another user', async () => {
		const threadId = randomUUID();
		await ownerAgent.post('/assistant/eval/threads').send({ threadId, projectId }).expect(200);

		await otherAgent
			.put(`/assistant/eval/threads/${threadId}/overrides`)
			.send({ mode: 'progressive' })
			.expect(404);
		await otherAgent
			.post('/assistant/eval/thread-credential-allowlist')
			.send({ threadId, credentialIds: [] })
			.expect(404);
		await otherAgent.get(`/assistant/eval/threads/${threadId}/memory`).expect(404);
		await otherAgent.delete(`/assistant/eval/threads/${threadId}`).expect(404);

		expect(Container.get(AssistantTurnOverrides).getBuildMode(threadId)).toBeUndefined();
		await ownerAgent.get(`/assistant/eval/threads/${threadId}/memory`).expect(200);
	});

	it('rejects a caller without the instanceAi:manage scope', async () => {
		await memberAgent
			.post('/assistant/eval/threads')
			.send({ threadId: randomUUID(), projectId })
			.expect(403);
	});

	it('rejects an observer threshold outside the allowed range', async () => {
		const threadId = randomUUID();
		await ownerAgent.post('/assistant/eval/threads').send({ threadId, projectId }).expect(200);

		await ownerAgent
			.put(`/assistant/eval/threads/${threadId}/overrides`)
			.send({ observerThresholdTokens: 999 })
			.expect(400);
	});
});
