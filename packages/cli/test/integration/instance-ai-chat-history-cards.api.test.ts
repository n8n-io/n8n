import { Agent, Memory, Tool } from '@n8n/agents';
import type { AgentChatMessagesResponse, AgentPersistedMessageContentPart } from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
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
import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
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
 * A card that waits for the user stays in the Assistant chat history, with its open suspension,
 * until the user answers it. Some models count their tool call ids from 1 in each response, so
 * a card can have the id of an earlier call in the same chat. The model and the Assistant
 * runtime are scripted. The HTTP routes, the Agents queue, the checkpoints and the recording
 * are real.
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

const toolCallTurn = (
	toolName: string,
	input: Record<string, unknown>,
	toolCallId: string,
): StreamResult => ({
	stream: convertArrayToReadableStream<StreamPart>([
		{ type: 'stream-start', warnings: [] },
		{ type: 'tool-call', toolCallId, toolName, input: JSON.stringify(input) },
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

/** The id that the scripted model gives to the first tool call of each response. */
const REUSED_ID = 'toolu_scripted_1';
const PROPOSAL_MESSAGE = 'Want "Invoices" to run automatically?';
const RUN_MESSAGE = 'Run "Invoices"?';

let workflowId = '';

/** A capability card, built the way the Assistant builds it. */
const proposalCapability = defineCapability({
	name: 'propose_automation',
	scope: 'workflow:write',
	assistant: {
		confirm: async () =>
			await Promise.resolve({
				message: PROPOSAL_MESSAGE,
				severity: 'info',
				fields: { automationProposal: { archived: false } },
				offered: { activate: [true, false] },
			}),
	},
	build: () => ({
		name: 'propose_automation',
		config: {
			description: 'Keeps a workflow and turns it on',
			inputSchema: { workflowId: z.string() },
			annotations: { title: 'Propose automation' },
		},
		handler: async () =>
			await Promise.resolve({ content: [{ type: 'text' as const, text: 'kept' }] }),
	}),
});

/** A native tool that answers at once. */
const lookupTool = new Tool('lookup')
	.description('Looks up a workflow')
	.input(z.object({ workflowId: z.string() }))
	.handler(async ({ workflowId: id }) => await Promise.resolve({ found: id }));

/** A native tool that suspends on an approval card. */
const runTool = new Tool('executions')
	.description('Runs a workflow after approval')
	.input(z.object({ action: z.literal('run'), workflowId: z.string() }))
	.suspend(z.object({ requestId: z.string(), message: z.string(), severity: z.string() }))
	.resume(z.object({ approved: z.boolean() }))
	.handler(async (_input, ctx) => {
		if (!ctx.resumeData) {
			return await ctx.suspend({
				requestId: randomUUID(),
				message: RUN_MESSAGE,
				severity: 'warning',
			});
		}
		return { ran: ctx.resumeData.approved };
	});

/** The message names the tool of the first call and whether the call gets the repeated id. */
function firstCall(message: string): StreamResult {
	const [toolName, idMode] = message.split(' ');
	const toolCallId = idMode === 'fresh' ? `call-${randomUUID()}` : REUSED_ID;
	if (toolName === 'lookup') return toolCallTurn('lookup', { workflowId }, toolCallId);
	if (toolName === 'run') {
		return toolCallTurn('executions', { action: 'run', workflowId }, toolCallId);
	}
	return toolCallTurn('propose_automation', { workflowId }, toolCallId);
}

async function scriptedTurn(turn: SystemAgentTurn): Promise<SystemAgentTurnHandle> {
	const { tool } = toAssistantTool(proposalCapability, { user: turn.user }, mock<EventService>());
	const agent = new Agent(ASSISTANT_AGENT_ID)
		.model(scriptedModel(turn.type === 'start' ? [firstCall(turn.message)] : [textTurn('Done.')]))
		.instructions('Test Assistant')
		.tool(tool)
		.tool(lookupTool)
		.tool(runTool)
		.memory(new Memory().storage(Container.get(N8nMemory).getImplementation(ASSISTANT_AGENT_ID)))
		.checkpoint(Container.get(N8NCheckpointStorage).getStorage(ASSISTANT_AGENT_ID));
	return await Promise.resolve({ agent });
}

// ── Users and helpers ────────────────────────────────────────────────────────

let owner: User;
let project: Project;
let ownerAgent: SuperAgentTest;
let teammateAgent: SuperAgentTest;
let viewerAgent: SuperAgentTest;

beforeAll(async () => {
	owner = await createUser({ firstName: 'Olivia', lastName: 'Owner' });
	const teammate = await createUser({ firstName: 'Tom', lastName: 'Teammate' });
	const viewer = await createUser({ firstName: 'Vera', lastName: 'Viewer' });
	project = await createTeamProject('Finance', owner);
	await linkUserToProject(teammate, project, 'project:editor');
	await linkUserToProject(viewer, project, 'project:viewer');
	workflowId = (await createWorkflow({ name: 'Invoices' }, project)).id;
	ownerAgent = testServer.authAgentFor(owner);
	teammateAgent = testServer.authAgentFor(teammate);
	viewerAgent = testServer.authAgentFor(viewer);
});

beforeEach(() => {
	// The config restores spies before each test.
	vi.spyOn(Container.get(InstanceAiService), 'prepareAssistantTurn').mockImplementation(
		scriptedTurn,
	);
});

afterAll(async () => {
	await testDb.terminate();
});

const chatUrl = `/projects/:projectId/agents/v2/${ASSISTANT_AGENT_ID}/chat`;
const url = (path = '') => `${chatUrl.replace(':projectId', project.id)}${path}`;

/** A chat in the team project, shared with it, so that teammates read it too. */
async function createSharedThread(): Promise<string> {
	const threadId = randomUUID();
	await Container.get(InstanceAiMemoryService).ensureThread(owner.id, threadId, project.id, {
		source: 'assistant_page',
		origin: 'internal',
	});
	await ownerAgent.post(`/instance-ai/threads/${threadId}/share`).expect(200);
	return threadId;
}

async function readMessages(
	agent: SuperAgentTest,
	threadId: string,
): Promise<AgentChatMessagesResponse> {
	const response = await agent.get(url(`/${threadId}/messages`)).expect(200);
	return response.body.data as AgentChatMessagesResponse;
}

const toolParts = ({ messages }: AgentChatMessagesResponse): AgentPersistedMessageContentPart[] =>
	messages.flatMap(({ content }) => content).filter((part) => part.type === 'tool-call');

/** The owner sends a message and waits until the turn ends without a card. */
async function ownerRunsTurn(threadId: string, message: string): Promise<void> {
	const response = await ownerAgent.post(url()).send({ message, sessionId: threadId });
	expect(response.text).not.toContain('"type":"error"');
	await vi.waitFor(async () => {
		const history = await readMessages(ownerAgent, threadId);
		if (history.activeExecutionId !== null) throw new Error('The turn still runs');
		expect(toolParts(history)).toContainEqual(expect.objectContaining({ state: 'resolved' }));
	});
}

/** The owner sends a message. The scripted turn suspends on a card. Returns that card. */
async function ownerOpensCard(threadId: string, message: string) {
	const response = await ownerAgent.post(url()).send({ message, sessionId: threadId });
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

// ── Tests ────────────────────────────────────────────────────────────────────

const cards = [
	{
		kind: 'capability card',
		message: 'propose',
		toolName: 'propose_automation',
		payload: {
			capability: true,
			message: PROPOSAL_MESSAGE,
			automationProposal: { archived: false },
		},
		resumeData: { kind: 'capabilityDecision', approved: true },
	},
	{
		kind: 'native approval card',
		message: 'run',
		toolName: 'executions',
		payload: { message: RUN_MESSAGE, severity: 'warning' },
		resumeData: { kind: 'approval', approved: true },
	},
];

describe('a card that waits in the Assistant chat history', () => {
	describe.each(cards)('$kind', ({ message, toolName, payload, resumeData }) => {
		test('stays in the history with its open suspension when its id repeats an earlier call', async () => {
			const threadId = await createSharedThread();
			await ownerRunsTurn(threadId, 'lookup');
			const card = await ownerOpensCard(threadId, message);
			expect(card.toolCallId).toBe(REUSED_ID);

			// The owner, an editor and a viewer of the shared chat read the same history.
			for (const agent of [ownerAgent, teammateAgent, viewerAgent]) {
				const history = await readMessages(agent, threadId);
				expect(toolParts(history)).toEqual([
					expect.objectContaining({
						toolName: 'lookup',
						toolCallId: REUSED_ID,
						state: 'resolved',
						output: { found: workflowId },
					}),
					expect.objectContaining({
						toolName,
						toolCallId: REUSED_ID,
						input: expect.objectContaining({ workflowId }),
						suspendPayload: expect.objectContaining(payload),
					}),
				]);
				const [, waiting] = toolParts(history);
				expect(waiting).not.toHaveProperty('output');
				expect(waiting.state).not.toBe('resolved');
				expect(history.openSuspensions).toEqual([
					{
						toolCallId: REUSED_ID,
						runId: card.runId,
						suspendPayload: expect.objectContaining(payload),
					},
				]);
			}

			const answer = await ownerAgent.post(url('/resume')).send({ ...card, resumeData });
			expect(answer.status).toBe(200);
			expect(answer.text).not.toContain('"type":"error"');

			const answered = await readMessages(viewerAgent, threadId);
			const [lookup, settled] = toolParts(answered);
			expect(toolParts(answered)).toHaveLength(2);
			expect(lookup).toMatchObject({ toolName: 'lookup', output: { found: workflowId } });
			expect(lookup).not.toHaveProperty('approvedBy');
			expect(settled).toMatchObject({
				toolName,
				toolCallId: REUSED_ID,
				state: 'resolved',
				approvedBy: { id: owner.id, name: 'Olivia Owner' },
			});
			expect(answered.openSuspensions).toEqual([]);
		});

		test('stays in the history with its open suspension when its id is new', async () => {
			const threadId = await createSharedThread();
			await ownerRunsTurn(threadId, 'lookup');
			const card = await ownerOpensCard(threadId, `${message} fresh`);
			expect(card.toolCallId).not.toBe(REUSED_ID);

			for (const agent of [ownerAgent, viewerAgent]) {
				const history = await readMessages(agent, threadId);
				expect(toolParts(history)).toEqual([
					expect.objectContaining({ toolName: 'lookup', toolCallId: REUSED_ID }),
					expect.objectContaining({
						toolName,
						toolCallId: card.toolCallId,
						suspendPayload: expect.objectContaining(payload),
					}),
				]);
				expect(history.openSuspensions).toEqual([
					{
						toolCallId: card.toolCallId,
						runId: card.runId,
						suspendPayload: expect.objectContaining(payload),
					},
				]);
			}
		});
	});
});

describe('a card that the user stopped, and a later card with its id and tool', () => {
	/** The owner sends a message, and the turn suspends on a card of another run. */
	async function ownerOpensAnotherCard(threadId: string, message: string, runIdBefore: string) {
		const response = await ownerAgent.post(url()).send({ message, sessionId: threadId });
		expect(response.text).not.toContain('"type":"error"');
		return await vi.waitFor(async () => {
			const checkpoint = await Container.get(N8NCheckpointStorage).findSuspendedForThread(
				ASSISTANT_AGENT_ID,
				threadId,
			);
			const pending = Object.values(checkpoint?.pendingToolCalls ?? {}).find(
				(call) => call.suspended && call.runId !== runIdBefore,
			);
			if (!pending?.suspended) throw new Error('The new card is not open yet');
			return { runId: pending.runId, toolCallId: pending.toolCallId };
		});
	}

	test('keeps the stopped card cancelled, and the answer settles the later card only', async () => {
		const threadId = await createSharedThread();
		const stopped = await ownerOpensCard(threadId, 'propose');
		const stop = await ownerAgent.delete(url(`/runs/${stopped.runId}`)).expect(200);
		expect(stop.body.data).toEqual({ cancelled: true });

		const card = await ownerOpensAnotherCard(threadId, 'propose', stopped.runId);
		expect(card.toolCallId).toBe(stopped.toolCallId);

		const waiting = await readMessages(viewerAgent, threadId);
		const [stoppedPart, openPart] = toolParts(waiting);
		expect(toolParts(waiting)).toHaveLength(2);
		expect(stoppedPart).toMatchObject({ toolName: 'propose_automation', canceled: true });
		expect(openPart).toMatchObject({ toolName: 'propose_automation', toolCallId: REUSED_ID });
		expect(openPart.canceled).toBeUndefined();
		expect(waiting.openSuspensions).toEqual([
			expect.objectContaining({ toolCallId: REUSED_ID, runId: card.runId }),
		]);

		const answer = await ownerAgent
			.post(url('/resume'))
			.send({ ...card, resumeData: { kind: 'capabilityDecision', approved: true } });
		expect(answer.status).toBe(200);
		expect(answer.text).not.toContain('"type":"error"');

		const answered = await readMessages(viewerAgent, threadId);
		const [stoppedAfter, settled] = toolParts(answered);
		expect(toolParts(answered)).toHaveLength(2);
		expect(stoppedAfter).toMatchObject({ canceled: true });
		expect(stoppedAfter).not.toHaveProperty('output');
		expect(stoppedAfter).not.toHaveProperty('approvedBy');
		expect(settled).toMatchObject({
			toolName: 'propose_automation',
			state: 'resolved',
			approvedBy: { id: owner.id, name: 'Olivia Owner' },
		});
		expect(answered.openSuspensions).toEqual([]);
	});
});
