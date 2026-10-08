import { Agent, Tool } from '@n8n/agents';
import type { InstanceAiThreadInfo } from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { randomUUID } from 'node:crypto';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { AgentThreadGrantRepository } from '@/modules/agents/repositories/agent-thread-grant.repository';
import type {
	SystemAgentTurn,
	SystemAgentTurnHandle,
} from '@/modules/agents/system-agents/system-agent.types';
import { ASSISTANT_AGENT_ID } from '@/modules/instance-ai/assistant-turn-options';
import { toAssistantTool } from '@/modules/instance-ai/capabilities/assistant-capability-bridge';
import { InstanceAiMemoryService } from '@/modules/instance-ai/instance-ai-memory.service';
import { InstanceAiService } from '@/modules/instance-ai/instance-ai.service';
import { defineCapability } from '@/services/capabilities/capability';

import { createUser } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

/**
 * Shared Assistant chats: the owner shares a chat with its team project. Teammates read it
 * and answer its cards. Every turn runs as the owner. The model and the Assistant runtime are
 * scripted; the HTTP routes, the Agents queue, the checkpoints and the recording are real.
 */

const testServer = utils.setupTestServer({
	endpointGroups: ['instance-ai'],
	modules: ['agents', 'instance-ai'],
});

// ── Scripted Assistant turns ─────────────────────────────────────────────────

type StreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
type StreamPart = StreamResult['stream'] extends ReadableStream<infer Part> ? Part : never;

const usage: Extract<StreamPart, { type: 'finish' }>['usage'] = {
	inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 1, text: 1, reasoning: 0 },
};

const toolCallTurn = (toolName: string, input: Record<string, unknown>): StreamResult => ({
	stream: convertArrayToReadableStream<StreamPart>([
		{ type: 'stream-start', warnings: [] },
		{
			type: 'tool-call',
			toolCallId: `call-${randomUUID()}`,
			toolName,
			input: JSON.stringify(input),
		},
		{ type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage },
	]),
});

const textTurn = (text: string): StreamResult => ({
	stream: convertArrayToReadableStream<StreamPart>([
		{ type: 'stream-start', warnings: [] },
		{ type: 'text-start', id: 'text-1' },
		{ type: 'text-delta', id: 'text-1', delta: text },
		{ type: 'text-end', id: 'text-1' },
		{ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage },
	]),
});

const scriptedModel = (turns: StreamResult[]) => {
	let next = 0;
	return new MockLanguageModelV3({
		provider: 'mock',
		modelId: 'scripted',
		doStream: async () => await Promise.resolve(turns[next++] ?? textTurn('Done.')),
	});
};

/** The user of each deploy handler run, as the Assistant tool context gives it. */
const deployedAs: string[] = [];
/** The scope of each answer that the step tool received. */
const stepScopes: (string | undefined)[] = [];

/** A test capability that asks for confirmation before it deploys. */
const deployCapability = defineCapability({
	name: 'deploy_workflow',
	scope: 'workflow:execute',
	assistant: {
		confirm: async () =>
			await Promise.resolve({ message: 'Deploy "Invoices"?', severity: 'warning' }),
	},
	build: (context) => ({
		name: 'deploy_workflow',
		config: {
			description: 'Deploys a workflow',
			inputSchema: { workflowId: z.string() },
			annotations: { title: 'Deploy workflow', destructiveHint: true },
		},
		handler: async () => {
			deployedAs.push(context.user.id);
			return await Promise.resolve({ content: [{ type: 'text' as const, text: 'deployed' }] });
		},
	}),
});

/** A tool with an "always allow" answer, stored as a thread grant like the Assistant tools do. */
const stepTool = (threadId: string) =>
	new Tool('run_step')
		.description('Runs a step after approval')
		.input(z.object({}))
		.suspend(z.object({ message: z.string() }))
		.resume(z.object({ approved: z.boolean(), scope: z.enum(['once', 'session']).optional() }))
		.handler(async (_input, ctx) => {
			if (!ctx.resumeData) return await ctx.suspend({ message: 'Run the step?' });
			stepScopes.push(ctx.resumeData.scope);
			if (ctx.resumeData.approved && ctx.resumeData.scope === 'session') {
				await Container.get(AgentThreadGrantRepository).grant(threadId, 'steps:run');
			}
			return { done: true };
		});

/** The runtime of one Assistant turn: a start turn calls the tool that the message names. */
async function scriptedTurn(turn: SystemAgentTurn): Promise<SystemAgentTurnHandle> {
	const firstTurn =
		turn.type === 'start' && turn.message === 'step'
			? toolCallTurn('run_step', {})
			: toolCallTurn('deploy_workflow', { workflowId: 'wf-1' });
	const { tool } = toAssistantTool(deployCapability, { user: turn.user }, mock<EventService>());
	const agent = new Agent(ASSISTANT_AGENT_ID)
		.model(scriptedModel(turn.type === 'start' ? [firstTurn] : [textTurn('Done.')]))
		.instructions('Test Assistant')
		.tool(tool)
		.tool(stepTool(turn.thread.id))
		.checkpoint(Container.get(N8NCheckpointStorage).getStorage(ASSISTANT_AGENT_ID));
	return await Promise.resolve({ agent });
}

// ── Users and helpers ────────────────────────────────────────────────────────

let owner: User;
let teammate: User;
let viewer: User;
let outsider: User;
let project: Project;
let ownerAgent: SuperAgentTest;
let teammateAgent: SuperAgentTest;
let viewerAgent: SuperAgentTest;
let outsiderAgent: SuperAgentTest;

beforeAll(async () => {
	owner = await createUser({ firstName: 'Olivia', lastName: 'Owner' });
	teammate = await createUser({ firstName: 'Tom', lastName: 'Teammate' });
	viewer = await createUser({ firstName: 'Vera', lastName: 'Viewer' });
	outsider = await createUser({ firstName: 'Oscar', lastName: 'Outsider' });
	project = await createTeamProject('Finance', owner);
	await linkUserToProject(teammate, project, 'project:editor');
	await linkUserToProject(viewer, project, 'project:viewer');
	ownerAgent = testServer.authAgentFor(owner);
	teammateAgent = testServer.authAgentFor(teammate);
	viewerAgent = testServer.authAgentFor(viewer);
	outsiderAgent = testServer.authAgentFor(outsider);
});

beforeEach(() => {
	deployedAs.length = 0;
	stepScopes.length = 0;
	// The config restores spies before each test.
	vi.spyOn(Container.get(InstanceAiService), 'prepareAssistantTurn').mockImplementation(
		scriptedTurn,
	);
});

afterAll(async () => await testDb.terminate());

const chatUrl = (projectId = project.id) =>
	`/projects/${projectId}/agents/v2/${ASSISTANT_AGENT_ID}/chat`;

async function createThread(user: User, projectId = project.id): Promise<string> {
	const threadId = randomUUID();
	await Container.get(InstanceAiMemoryService).ensureThread(user.id, threadId, projectId, {
		source: 'assistant_page',
		origin: 'internal',
	});
	return threadId;
}

async function createSharedThread(): Promise<string> {
	const threadId = await createThread(owner);
	await ownerAgent.post(`/instance-ai/threads/${threadId}/share`).expect(200);
	return threadId;
}

/** The owner sends a message. The scripted turn suspends on a card. Returns that card. */
async function ownerOpensCard(threadId: string, message = 'deploy') {
	const response = await ownerAgent.post(chatUrl()).send({ message, sessionId: threadId });
	expect(response.status).toBe(200);
	expect(response.text).not.toContain('"type":"error"');
	return await vi.waitFor(async () => {
		const checkpoint = await Container.get(N8NCheckpointStorage).findSuspendedForThread(
			ASSISTANT_AGENT_ID,
			threadId,
		);
		const pending = Object.values(checkpoint?.pendingToolCalls ?? {}).find(
			(call) => call.suspended,
		);
		if (!pending?.suspended) throw new Error('The card is not open yet');
		return { runId: pending.runId, toolCallId: pending.toolCallId };
	});
}

const answer = async (
	agent: SuperAgentTest,
	card: { runId: string; toolCallId: string },
	resumeData: unknown = { kind: 'capabilityDecision', approved: true },
	projectId = project.id,
) => await agent.post(`${chatUrl(projectId)}/resume`).send({ ...card, resumeData });

const cardIsOpen = async (threadId: string) =>
	(await Container.get(N8NCheckpointStorage).findSuspendedForThread(
		ASSISTANT_AGENT_ID,
		threadId,
	)) !== null;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /instance-ai/threads/:threadId/share', () => {
	test('shares the chat with its team project and keeps the owner', async () => {
		const threadId = await createThread(owner);

		const response = await ownerAgent.post(`/instance-ai/threads/${threadId}/share`).expect(200);

		expect(response.body.data.thread).toMatchObject({
			id: threadId,
			resourceId: owner.id,
			sharedWith: { projectId: project.id, projectName: 'Finance' },
			owner: { id: owner.id, name: 'Olivia Owner' },
		});
		// Sharing again changes nothing.
		await ownerAgent.post(`/instance-ai/threads/${threadId}/share`).expect(200);
	});

	test('refuses a chat in a personal project', async () => {
		const threadId = await createThread(owner, (await getPersonalProject(owner)).id);

		const response = await ownerAgent.post(`/instance-ai/threads/${threadId}/share`).expect(400);

		expect(response.body.message).toBe('Move this chat to a team project to share it.');
		await teammateAgent.get(`/instance-ai/threads/${threadId}`).expect(404);
	});

	test('lets only the owner share', async () => {
		const threadId = await createSharedThread();
		const privateThreadId = await createThread(owner);

		await teammateAgent.post(`/instance-ai/threads/${threadId}/share`).expect(403);
		await outsiderAgent.post(`/instance-ai/threads/${threadId}/share`).expect(404);
		await teammateAgent.post(`/instance-ai/threads/${privateThreadId}/share`).expect(404);
	});
});

describe('reading a shared chat', () => {
	test('a teammate finds the chat in the list and in the history, marked as shared', async () => {
		const threadId = await createSharedThread();
		const privateThreadId = await createThread(owner);

		const list = await teammateAgent.get('/instance-ai/threads').expect(200);
		const listed = (list.body.data.threads as InstanceAiThreadInfo[]).filter(({ id }) =>
			[threadId, privateThreadId].includes(id),
		);
		expect(listed).toEqual([
			expect.objectContaining({
				id: threadId,
				sharedWith: { projectId: project.id, projectName: 'Finance' },
				owner: { id: owner.id, name: 'Olivia Owner' },
			}),
		]);

		const history = await teammateAgent.get('/instance-ai/threads/history').expect(200);
		expect(history.body.data.threads.map(({ id }: InstanceAiThreadInfo) => id)).toContain(threadId);

		// The owner still lists the chat after the share.
		const ownerList = await ownerAgent.get('/instance-ai/threads').expect(200);
		expect(ownerList.body.data.threads.map(({ id }: InstanceAiThreadInfo) => id)).toEqual(
			expect.arrayContaining([threadId, privateThreadId]),
		);
	});

	test('a teammate and a viewer read the chat, its messages and its open card', async () => {
		const threadId = await createSharedThread();
		await ownerOpensCard(threadId);
		// The turn defaults hold the push connection of the owner, which only the owner gets.
		await Container.get(InstanceAiMemoryService).updateThread(threadId, {
			metadata: { assistantTurnDefaults: { pushRef: 'owner-push-ref' } },
		});
		const ownView = await ownerAgent.get(`/instance-ai/threads/${threadId}`).expect(200);
		expect(ownView.body.data.thread.metadata.assistantTurnDefaults).toEqual({
			pushRef: 'owner-push-ref',
		});

		for (const agent of [teammateAgent, viewerAgent]) {
			const thread = await agent.get(`/instance-ai/threads/${threadId}`).expect(200);
			expect(thread.body.data.thread).toMatchObject({
				id: threadId,
				owner: { name: 'Olivia Owner' },
			});
			expect(JSON.stringify(thread.body.data)).not.toContain('owner-push-ref');
			const list = await agent.get('/instance-ai/threads').expect(200);
			expect(JSON.stringify(list.body.data)).not.toContain('owner-push-ref');
			await agent.get(`/instance-ai/threads/${threadId}/status`).expect(200);
			await agent.get(`/instance-ai/threads/${threadId}/tabs`).expect(200);
			await agent.get(`${chatUrl()}/${threadId}/queue`).expect(200);
			const messages = await agent.get(`${chatUrl()}/${threadId}/messages`).expect(200);
			expect(JSON.stringify(messages.body.data)).toContain('deploy_workflow');
		}
	});

	test('an outsider gets 404 on every read of the chat', async () => {
		const threadId = await createSharedThread();
		await ownerOpensCard(threadId);
		const ownProject = (await getPersonalProject(outsider)).id;

		for (const path of ['', '/status', '/tabs']) {
			await outsiderAgent.get(`/instance-ai/threads/${threadId}${path}`).expect(404);
		}
		for (const path of ['messages', 'queue', 'background-tasks']) {
			await outsiderAgent.get(`${chatUrl(ownProject)}/${threadId}/${path}`).expect(404);
		}
		// With the chat's project in the URL, the project check refuses before any chat lookup.
		await outsiderAgent.get(`${chatUrl()}/${threadId}/messages`).expect(403);
		const list = await outsiderAgent.get('/instance-ai/threads').expect(200);
		expect(list.body.data.threads.map(({ id }: InstanceAiThreadInfo) => id)).not.toContain(
			threadId,
		);
		const history = await outsiderAgent.get('/instance-ai/threads/history').expect(200);
		expect(history.body.data.threads.map(({ id }: InstanceAiThreadInfo) => id)).not.toContain(
			threadId,
		);
	});

	test('a teammate cannot delete the chat through the Agents session routes', async () => {
		const threadId = await createSharedThread();

		await teammateAgent
			.delete(`/projects/${project.id}/agents/v2/${ASSISTANT_AGENT_ID}/threads/${threadId}`)
			.expect(404);
		await ownerAgent.get(`/instance-ai/threads/${threadId}`).expect(200);
	});
});

describe('sending to a shared chat', () => {
	test('a teammate cannot send and the owner still can', async () => {
		const threadId = await createSharedThread();

		const refused = await teammateAgent
			.post(chatUrl())
			.send({ message: 'deploy', sessionId: threadId })
			.expect(403);
		expect(refused.body.message).toBe('Only Olivia Owner can send messages here.');

		const ownProject = (await getPersonalProject(outsider)).id;
		await outsiderAgent
			.post(chatUrl(ownProject))
			.send({ message: 'hi', sessionId: threadId })
			.expect(404);

		await ownerOpensCard(threadId);
		expect(await cardIsOpen(threadId)).toBe(true);
	});
});

describe('answering a card in a shared chat', () => {
	test('an editor approves; the action runs as the owner and records the approver', async () => {
		const threadId = await createSharedThread();
		const card = await ownerOpensCard(threadId);

		const response = await answer(teammateAgent, card);

		expect(response.status).toBe(200);
		expect(response.text).not.toContain('"type":"error"');
		expect(deployedAs).toEqual([owner.id]);
		expect(await cardIsOpen(threadId)).toBe(false);
		const messages = await viewerAgent.get(`${chatUrl()}/${threadId}/messages`).expect(200);
		type Message = { content: Record<string, unknown>[] };
		const parts = (messages.body.data.messages as Message[]).flatMap(({ content }) => content);
		expect(parts.find((part) => part.toolCallId === card.toolCallId)).toMatchObject({
			toolName: 'deploy_workflow',
			approvedBy: { id: teammate.id, name: 'Tom Teammate' },
		});
	});

	test('a viewer cannot approve, and the card stays open', async () => {
		const threadId = await createSharedThread();
		const card = await ownerOpensCard(threadId);

		const response = await answer(viewerAgent, card);

		expect(response.status).toBe(403);
		expect(response.body.message).toBe('Only editors in Finance can approve this.');
		expect(deployedAs).toEqual([]);
		expect(await cardIsOpen(threadId)).toBe(true);
	});

	test('an outsider gets 404 and a project mismatch gets 400', async () => {
		const threadId = await createSharedThread();
		const card = await ownerOpensCard(threadId);

		await answer(outsiderAgent, card, undefined, (await getPersonalProject(outsider)).id).then(
			(response) => expect(response.status).toBe(404),
		);
		const mismatch = await answer(
			ownerAgent,
			card,
			undefined,
			(await getPersonalProject(owner)).id,
		);
		expect(mismatch.status).toBe(400);
		expect(await cardIsOpen(threadId)).toBe(true);
	});

	test('a second answer to the same card gets 409 with the name of who answered', async () => {
		const threadId = await createSharedThread();
		const card = await ownerOpensCard(threadId);
		expect((await answer(teammateAgent, card)).status).toBe(200);

		const stale = await answer(ownerAgent, card);

		expect(stale.status).toBe(409);
		expect(stale.body.meta).toEqual({ answeredBy: { name: 'Tom Teammate' } });
		expect(deployedAs).toEqual([owner.id]);
	});

	test('"always allow" from a teammate is used once; from the owner it is kept', async () => {
		const threadId = await createSharedThread();
		const grants = Container.get(AgentThreadGrantRepository);
		const alwaysAllow = { kind: 'approval', approved: true, scope: 'session' };

		const teammateCard = await ownerOpensCard(threadId, 'step');
		expect((await answer(teammateAgent, teammateCard, alwaysAllow)).status).toBe(200);
		expect(stepScopes).toEqual(['once']);
		expect(await grants.findKeys(threadId)).toEqual(new Set());

		const ownerCard = await ownerOpensCard(threadId, 'step');
		expect((await answer(ownerAgent, ownerCard, alwaysAllow)).status).toBe(200);
		expect(stepScopes).toEqual(['once', 'session']);
		expect(await grants.findKeys(threadId)).toEqual(new Set(['steps:run']));
	});
});
