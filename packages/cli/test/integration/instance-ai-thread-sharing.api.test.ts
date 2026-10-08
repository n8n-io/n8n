import { Agent, Memory, Tool } from '@n8n/agents';
import type { AgentPersistedMessageDto, InstanceAiThreadInfo } from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { BinaryDataConfig, BinaryDataService } from 'n8n-core';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import { AgentChatAttachmentService } from '@/modules/agents/agent-chat-attachment.service';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentMessageRepository } from '@/modules/agents/repositories/agent-message.repository';
import { AgentThreadGrantRepository } from '@/modules/agents/repositories/agent-thread-grant.repository';
import type {
	SystemAgentTurn,
	SystemAgentTurnHandle,
} from '@/modules/agents/system-agents/system-agent.types';
import { draftChatMemoryResourceId } from '@/modules/agents/utils/agent-memory-scope';
import { ASSISTANT_AGENT_ID } from '@/modules/instance-ai/assistant-turn-options';
import { toAssistantTool } from '@/modules/instance-ai/capabilities/assistant-capability-bridge';
import { InstanceAiMemoryService } from '@/modules/instance-ai/instance-ai-memory.service';
import { InstanceAiService } from '@/modules/instance-ai/instance-ai.service';
import {
	buildPastConversationsBlock,
	buildThreadContextBlock,
} from '@/modules/instance-ai/internal-messages';
import { defineCapability } from '@/services/capabilities/capability';
import { UserService } from '@/services/user.service';

import { createCredentials } from './shared/db/credentials';
import { createChatUser, createOwner, createUser } from './shared/db/users';
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

/** The user of each automation the proposal card kept, as the Assistant tool context gives it. */
const appliedAs: string[] = [];
/** The workflow that the next proposal card is about. */
let proposalWorkflowId = '';
/** The scope of each answer that the run tool received. */
const runScopes: (string | undefined)[] = [];
/** The credential that the next delete card is about, and the deletes that ran. */
let cardCredentialId = '';
const deletedCredentials: { by: string; credentialId: string }[] = [];
/** Context that the next start turn stores in front of the message, as the Assistant does. */
let storedContext = '';

/** A proposal card, as the real capability shows it: a capability card about a workflow. */
const proposalCapability = defineCapability({
	name: 'propose_automation',
	scope: 'workflow:write',
	assistant: {
		confirm: async () =>
			await Promise.resolve({
				message: 'Want "Invoices" to run automatically?',
				severity: 'info',
				fields: { automationProposal: { archived: false } },
			}),
	},
	build: (context) => ({
		name: 'propose_automation',
		config: {
			description: 'Keeps a workflow and turns it on',
			inputSchema: { workflowId: z.string() },
			annotations: { title: 'Propose automation' },
		},
		handler: async () => {
			appliedAs.push(context.user.id);
			return await Promise.resolve({ content: [{ type: 'text' as const, text: 'kept' }] });
		},
	}),
});

const approvalCard = z.object({ requestId: z.string(), message: z.string(), severity: z.string() });
const cardFor = (message: string) => ({ requestId: randomUUID(), message, severity: 'warning' });

/** A run card with "always allow", stored as a thread grant like the Assistant tools do. */
const runTool = (threadId: string) =>
	new Tool('executions')
		.description('Runs a workflow after approval')
		.input(z.object({ action: z.literal('run'), workflowId: z.string() }))
		.suspend(approvalCard)
		.resume(z.object({ approved: z.boolean(), scope: z.enum(['once', 'session']).optional() }))
		.handler(async (_input, ctx) => {
			if (!ctx.resumeData) return await ctx.suspend(cardFor('Run "Invoices"?'));
			runScopes.push(ctx.resumeData.scope);
			if (ctx.resumeData.approved && ctx.resumeData.scope === 'session') {
				await Container.get(AgentThreadGrantRepository).grant(threadId, 'executions:run');
			}
			return { done: true };
		});

/** A delete card about a credential. The delete runs as the user of the turn. */
const credentialsTool = (user: User) =>
	new Tool('credentials')
		.description('Deletes a credential after approval')
		.input(z.object({ action: z.literal('delete'), credentialId: z.string() }))
		.suspend(approvalCard)
		.resume(z.object({ approved: z.boolean() }))
		.handler(async ({ credentialId }, ctx) => {
			if (!ctx.resumeData) return await ctx.suspend(cardFor('Delete the credential?'));
			if (ctx.resumeData.approved) deletedCredentials.push({ by: user.id, credentialId });
			return { success: ctx.resumeData.approved };
		});

/** A card that no teammate rule lists, so only the owner answers it. */
const ownerOnlyTool = new Tool('run_step')
	.description('Runs a step after approval')
	.input(z.object({}))
	.suspend(approvalCard)
	.resume(z.object({ approved: z.boolean() }))
	.handler(async (_input, ctx) => {
		if (!ctx.resumeData) return await ctx.suspend(cardFor('Run the step?'));
		return { done: true };
	});

const firstCall = (message: string): StreamResult => {
	if (message === 'hello') return textTurn('Hi.');
	if (message === 'step') return toolCallTurn('run_step', {});
	if (message === 'run') {
		return toolCallTurn('executions', { action: 'run', workflowId: teamWorkflowId });
	}
	if (message === 'delete credential') {
		return toolCallTurn('credentials', { action: 'delete', credentialId: cardCredentialId });
	}
	return toolCallTurn('propose_automation', { workflowId: proposalWorkflowId });
};

/** The runtime of one Assistant turn: a start turn calls the tool that the message names. */
async function scriptedTurn(turn: SystemAgentTurn): Promise<SystemAgentTurnHandle> {
	const { tool } = toAssistantTool(proposalCapability, { user: turn.user }, mock<EventService>());
	const agent = new Agent(ASSISTANT_AGENT_ID)
		.model(scriptedModel(turn.type === 'start' ? [firstCall(turn.message)] : [textTurn('Done.')]))
		.instructions('Test Assistant')
		.tool(tool)
		.tool(runTool(turn.thread.id))
		.tool(credentialsTool(turn.user))
		.tool(ownerOnlyTool)
		.memory(new Memory().storage(Container.get(N8nMemory).getImplementation(ASSISTANT_AGENT_ID)))
		.checkpoint(Container.get(N8NCheckpointStorage).getStorage(ASSISTANT_AGENT_ID));
	const input =
		turn.type === 'start' && storedContext ? `${storedContext}\n\n${turn.message}` : undefined;
	return await Promise.resolve({ agent, ...(input ? { input } : {}) });
}

// ── Users and helpers ────────────────────────────────────────────────────────

let owner: User;
let teammate: User;
let viewer: User;
let outsider: User;
let chatUser: User;
let project: Project;
let teamWorkflowId: string;
let personalWorkflowId: string;
let ownerAgent: SuperAgentTest;
let teammateAgent: SuperAgentTest;
let viewerAgent: SuperAgentTest;
let outsiderAgent: SuperAgentTest;
let chatUserAgent: SuperAgentTest;
let storageFolder: string;

beforeAll(async () => {
	// Chat attachments need a binary data mode that keeps the files.
	storageFolder = mkdtempSync(path.join(tmpdir(), 'n8n-shared-chat-'));
	const binaryDataConfig = Container.get(BinaryDataConfig);
	binaryDataConfig.mode = 'filesystem';
	binaryDataConfig.localStoragePath = storageFolder;
	await Container.get(BinaryDataService).init();

	owner = await createUser({ firstName: 'Olivia', lastName: 'Owner' });
	teammate = await createUser({ firstName: 'Tom', lastName: 'Teammate' });
	viewer = await createUser({ firstName: 'Vera', lastName: 'Viewer' });
	outsider = await createUser({ firstName: 'Oscar', lastName: 'Outsider' });
	// A chat user is a project member without the Assistant scope.
	chatUser = await createChatUser();
	project = await createTeamProject('Finance', owner);
	await linkUserToProject(teammate, project, 'project:editor');
	await linkUserToProject(viewer, project, 'project:viewer');
	await linkUserToProject(chatUser, project, 'project:viewer');
	teamWorkflowId = (await createWorkflow({ name: 'Invoices' }, project)).id;
	personalWorkflowId = (await createWorkflow({ name: 'Private notes' }, owner)).id;
	ownerAgent = testServer.authAgentFor(owner);
	teammateAgent = testServer.authAgentFor(teammate);
	viewerAgent = testServer.authAgentFor(viewer);
	outsiderAgent = testServer.authAgentFor(outsider);
	chatUserAgent = testServer.authAgentFor(chatUser);
});

beforeEach(() => {
	appliedAs.length = 0;
	runScopes.length = 0;
	deletedCredentials.length = 0;
	proposalWorkflowId = teamWorkflowId;
	storedContext = '';
	// The config restores spies before each test.
	vi.spyOn(Container.get(InstanceAiService), 'prepareAssistantTurn').mockImplementation(
		scriptedTurn,
	);
});

afterAll(async () => {
	await testDb.terminate();
	rmSync(storageFolder, { recursive: true, force: true });
});

const agentUrl = (projectId = project.id) =>
	`/projects/${projectId}/agents/v2/${ASSISTANT_AGENT_ID}`;
const chatUrl = (projectId = project.id) => `${agentUrl(projectId)}/chat`;

async function createThread(user: User, projectId = project.id): Promise<string> {
	const threadId = randomUUID();
	await Container.get(InstanceAiMemoryService).ensureThread(user.id, threadId, projectId, {
		source: 'assistant_page',
		origin: 'internal',
	});
	return threadId;
}

async function createSharedThread(user = owner): Promise<string> {
	const threadId = await createThread(user);
	await testServer.authAgentFor(user).post(`/instance-ai/threads/${threadId}/share`).expect(200);
	return threadId;
}

/** The owner sends a message. The scripted turn suspends on a card. Returns that card. */
async function ownerOpensCard(threadId: string, message = 'propose') {
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

const approve = { kind: 'approval', approved: true };

const cardIsOpen = async (threadId: string) =>
	(await Container.get(N8NCheckpointStorage).findSuspendedForThread(
		ASSISTANT_AGENT_ID,
		threadId,
	)) !== null;

const userTexts = (messages: AgentPersistedMessageDto[]) =>
	messages
		.filter(({ role }) => role === 'user')
		.flatMap(({ content }) => content.flatMap((part) => (part.text ? [part.text] : [])));

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
			expect(JSON.stringify(messages.body.data)).toContain('propose_automation');
		}
	});

	test('a teammate reads what the owner wrote, without the context the Assistant added', async () => {
		storedContext = buildThreadContextBlock([
			buildPastConversationsBlock('- "Salary review" (yesterday)'),
		]);
		const threadId = await createSharedThread();
		const sent = await ownerAgent.post(chatUrl()).send({ message: 'hello', sessionId: threadId });
		expect(sent.text).not.toContain('"type":"error"');
		// The model read the context: the thread keeps it as the model content of the input.
		await vi.waitFor(async () => {
			const stored = await Container.get(AgentMessageRepository).findBy({ threadId });
			const modelInput = JSON.stringify(stored.map(({ modelContent }) => modelContent));
			expect(modelInput).toContain('Salary review');
		});
		// The open card keeps the model input of its turn in the checkpoint.
		await ownerOpensCard(threadId, 'propose this one');

		for (const agent of [teammateAgent, ownerAgent]) {
			const messages = await agent.get(`${chatUrl()}/${threadId}/messages`).expect(200);
			expect(JSON.stringify(messages.body.data)).not.toContain('Salary review');
			expect(userTexts(messages.body.data.messages)).toEqual(['hello', 'propose this one']);
			const detail = await agent.get(`${agentUrl()}/threads/${threadId}`).expect(200);
			expect(JSON.stringify(detail.body.data)).not.toContain('Salary review');
			const sessions = await agent.get(`${agentUrl()}/threads`).expect(200);
			const session = sessions.body.data.threads.find(({ id }: { id: string }) => id === threadId);
			expect(session.firstMessage).toBe('hello');
		}
	});

	test('an outsider gets 404 on every read of the chat', async () => {
		const threadId = await createSharedThread();
		await ownerOpensCard(threadId);
		const attachment = await Container.get(AgentChatAttachmentService).storeInbound({
			agentId: ASSISTANT_AGENT_ID,
			projectId: project.id,
			threadId,
			resourceId: draftChatMemoryResourceId(owner.id),
			source: 'chat',
			fileName: 'invoices.txt',
			mimeType: 'text/plain',
			data: Buffer.from('Invoice 42'),
		});
		const ownProject = (await getPersonalProject(outsider)).id;

		for (const path of ['', '/status', '/tabs']) {
			await outsiderAgent.get(`/instance-ai/threads/${threadId}${path}`).expect(404);
		}
		for (const path of ['messages', 'queue', 'background-tasks']) {
			await outsiderAgent.get(`${chatUrl(ownProject)}/${threadId}/${path}`).expect(404);
		}
		await outsiderAgent.get(`${chatUrl(ownProject)}/attachments/${attachment.id}`).expect(404);
		await outsiderAgent.get(`${agentUrl(ownProject)}/threads/${threadId}`).expect(404);
		const sessions = await outsiderAgent.get(`${agentUrl(ownProject)}/threads`).expect(200);
		expect(JSON.stringify(sessions.body.data)).not.toContain(threadId);
		// With the chat's project in the URL, the project check refuses before any chat lookup.
		await outsiderAgent.get(`${chatUrl()}/${threadId}/messages`).expect(403);
		await outsiderAgent.get(`${chatUrl()}/attachments/${attachment.id}`).expect(403);
		const list = await outsiderAgent.get('/instance-ai/threads').expect(200);
		expect(list.body.data.threads.map(({ id }: InstanceAiThreadInfo) => id)).not.toContain(
			threadId,
		);
		const history = await outsiderAgent.get('/instance-ai/threads/history').expect(200);
		expect(history.body.data.threads.map(({ id }: InstanceAiThreadInfo) => id)).not.toContain(
			threadId,
		);
		// The same file opens for a teammate, so the refusals above are about access.
		const file = await teammateAgent.get(`${chatUrl()}/attachments/${attachment.id}`).expect(200);
		expect(file.text).toBe('Invoice 42');
	});

	test('a project member without the Assistant scope reads nothing of the chat', async () => {
		const threadId = await createSharedThread();
		const card = await ownerOpensCard(threadId);

		for (const path of ['messages', 'queue', 'background-tasks']) {
			await chatUserAgent.get(`${chatUrl()}/${threadId}/${path}`).expect(404);
		}
		await chatUserAgent.get(`${agentUrl()}/threads/${threadId}`).expect(404);
		await chatUserAgent.get(`${agentUrl()}/threads`).expect(404);
		await chatUserAgent.get(`/instance-ai/threads/${threadId}`).expect(403);
		expect((await answer(chatUserAgent, card)).status).toBe(404);
		expect(await cardIsOpen(threadId)).toBe(true);
		// A teammate with the Assistant scope sees the same chat in the Agents session list.
		const sessions = await teammateAgent.get(`${agentUrl()}/threads`).expect(200);
		expect(JSON.stringify(sessions.body.data)).toContain(threadId);
	});

	test('a teammate cannot delete the chat through the Agents session routes', async () => {
		const threadId = await createSharedThread();

		await teammateAgent.delete(`${agentUrl()}/threads/${threadId}`).expect(404);
		await ownerAgent.get(`/instance-ai/threads/${threadId}`).expect(200);
	});

	test('deleting the owner deletes the shared chat, so no member reads it afterwards', async () => {
		const departing = await createUser({ firstName: 'Dana', lastName: 'Departing' });
		await linkUserToProject(departing, project, 'project:editor');
		const threadId = await createSharedThread(departing);
		await teammateAgent.get(`/instance-ai/threads/${threadId}`).expect(200);

		await Container.get(UserService).deleteUser(await createOwner(), departing.id);

		await vi.waitFor(async () => {
			const row = await Container.get(AgentExecutionThreadRepository).findOneBy({ id: threadId });
			expect(row).toBeNull();
		});
		await teammateAgent.get(`/instance-ai/threads/${threadId}`).expect(404);
		await teammateAgent.get(`${agentUrl()}/threads/${threadId}`).expect(404);
	});
});

describe('sending to a shared chat', () => {
	test('a teammate cannot send and the owner still can', async () => {
		const threadId = await createSharedThread();

		const refused = await teammateAgent
			.post(chatUrl())
			.send({ message: 'propose', sessionId: threadId })
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
		expect(appliedAs).toEqual([owner.id]);
		expect(await cardIsOpen(threadId)).toBe(false);
		const messages = await viewerAgent.get(`${chatUrl()}/${threadId}/messages`).expect(200);
		type Message = { content: Record<string, unknown>[] };
		const parts = (messages.body.data.messages as Message[]).flatMap(({ content }) => content);
		expect(parts.find((part) => part.toolCallId === card.toolCallId)).toMatchObject({
			toolName: 'propose_automation',
			approvedBy: { id: teammate.id, name: 'Tom Teammate' },
		});
	});

	test('a viewer cannot approve, and the card stays open', async () => {
		const threadId = await createSharedThread();
		const card = await ownerOpensCard(threadId);

		const response = await answer(viewerAgent, card);

		expect(response.status).toBe(403);
		expect(response.body.message).toBe('Only editors in Finance can approve this.');
		expect(appliedAs).toEqual([]);
		expect(await cardIsOpen(threadId)).toBe(true);
	});

	test('an editor cannot approve a card about a workflow outside their reach', async () => {
		proposalWorkflowId = personalWorkflowId;
		const threadId = await createSharedThread();
		const card = await ownerOpensCard(threadId);

		const response = await answer(teammateAgent, card);

		expect(response.status).toBe(403);
		expect(response.body.message).toBe('Only editors of this workflow can approve this.');
		expect(appliedAs).toEqual([]);
		expect(await cardIsOpen(threadId)).toBe(true);
		// The owner can still answer it.
		expect((await answer(ownerAgent, card)).status).toBe(200);
		expect(appliedAs).toEqual([owner.id]);
	});

	test("an editor cannot approve deleting the owner's personal credential", async () => {
		const personal = await createCredentials(
			{ name: 'Private key', type: 'githubApi', data: '' },
			await getPersonalProject(owner),
		);
		cardCredentialId = personal.id;
		const threadId = await createSharedThread();
		const card = await ownerOpensCard(threadId, 'delete credential');

		const response = await answer(teammateAgent, card, approve);

		expect(response.status).toBe(403);
		expect(response.body.message).toBe('Only editors of this credential can approve this.');
		expect(deletedCredentials).toEqual([]);
		expect(await cardIsOpen(threadId)).toBe(true);
		// The owner can still answer it.
		expect((await answer(ownerAgent, card, approve)).status).toBe(200);
		expect(deletedCredentials).toEqual([{ by: owner.id, credentialId: personal.id }]);
	});

	test('an editor approves deleting a credential of the project, which runs as the owner', async () => {
		const shared = await createCredentials(
			{ name: 'Team key', type: 'githubApi', data: '' },
			project,
		);
		cardCredentialId = shared.id;
		const threadId = await createSharedThread();
		const card = await ownerOpensCard(threadId, 'delete credential');

		expect((await answer(teammateAgent, card, approve)).status).toBe(200);
		expect(deletedCredentials).toEqual([{ by: owner.id, credentialId: shared.id }]);
	});

	test('a teammate cannot answer a card that only the owner answers', async () => {
		const threadId = await createSharedThread();
		const card = await ownerOpensCard(threadId, 'step');

		const response = await answer(teammateAgent, card, approve);

		expect(response.status).toBe(403);
		expect(response.body.message).toBe('Only Olivia Owner can answer this.');
		expect(await cardIsOpen(threadId)).toBe(true);
		expect((await answer(ownerAgent, card, approve)).status).toBe(200);
		expect(await cardIsOpen(threadId)).toBe(false);
	});

	test('a teammate cannot answer with text, which only the owner sends', async () => {
		const threadId = await createSharedThread();
		const card = await ownerOpensCard(threadId);

		for (const resumeData of [
			{ kind: 'approval', approved: false, userInput: 'Propose the other workflow instead' },
			{ _type: 'agent.cancellation', message: 'Stop and delete it' },
		]) {
			const response = await answer(teammateAgent, card, resumeData);
			expect(response.status).toBe(403);
			expect(response.body.message).toBe('Only Olivia Owner can answer this.');
		}
		expect(appliedAs).toEqual([]);
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
		expect(appliedAs).toEqual([owner.id]);
	});

	test('"always allow" from a teammate is used once; from the owner it is kept', async () => {
		const threadId = await createSharedThread();
		const grants = Container.get(AgentThreadGrantRepository);
		const alwaysAllow = { ...approve, scope: 'session' };

		const teammateCard = await ownerOpensCard(threadId, 'run');
		expect((await answer(teammateAgent, teammateCard, alwaysAllow)).status).toBe(200);
		expect(runScopes).toEqual(['once']);
		expect(await grants.findKeys(threadId)).toEqual(new Set());

		const ownerCard = await ownerOpensCard(threadId, 'run');
		expect((await answer(ownerAgent, ownerCard, alwaysAllow)).status).toBe(200);
		expect(runScopes).toEqual(['once', 'session']);
		expect(await grants.findKeys(threadId)).toEqual(new Set(['executions:run']));
	});
});
