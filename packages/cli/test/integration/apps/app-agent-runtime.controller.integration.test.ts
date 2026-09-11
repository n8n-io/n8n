import type { SerializableAgentState, StreamChunk } from '@n8n/agents';
import type { AgentSseEvent } from '@n8n/api-types';
import { getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import { UserError } from 'n8n-workflow';
import type { MockInstance } from 'vitest';

import { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import { ChatIntegrationRegistry } from '@/modules/agents/integrations/agent-chat-integration';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AppRepository } from '@/modules/apps/app.repository';
import { createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let owner: User;
let ownerProject: Project;
/** The served page calls the runtime API without a session and without the `/rest` prefix. */
let visitor: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['apps'],
	modules: ['apps', 'agents'],
});

let appRepository: AppRepository;
let agentRepository: AgentRepository;
let agentHistoryRepository: AgentHistoryRepository;
let orchestrator: AgentExecutionOrchestratorService;
let executeForChatPublished: MockInstance;
let hasSuspendedRun: MockInstance;

const CHAT = '/apps/help/api/agents/support/chat';
const RESUME = '/apps/help/api/agents/support/chat/resume';
const MESSAGES = '/apps/help/api/agents/support/messages';

const AGENT_ID = 'a0000000-0000-4000-8000-000000000001';
const VERSION_ID = 'b0000000-0000-4000-8000-000000000001';

async function* reply(text: string): AsyncGenerator<StreamChunk> {
	yield { type: 'text-start', id: 'msg-1' } as StreamChunk;
	yield { type: 'text-delta', id: 'msg-1', delta: text } as StreamChunk;
	yield { type: 'text-end', id: 'msg-1' } as StreamChunk;
	yield { type: 'finish', finishReason: 'stop' } as StreamChunk;
}

/** `data:` lines of an SSE body, parsed; comment lines (`:ok`, `:ping`) are skipped. */
const events = (body: string): AgentSseEvent[] =>
	body
		.split('\n')
		.filter((line) => line.startsWith('data: '))
		.map((line) => JSON.parse(line.slice('data: '.length)) as AgentSseEvent);

const createAgent = async (published = true) => {
	await agentRepository.save(
		agentRepository.create({
			id: AGENT_ID,
			name: 'Support',
			projectId: ownerProject.id,
			schema: { name: 'Support', model: 'm', instructions: 'i' },
			integrations: [],
			tools: {},
			skills: {},
			versionId: VERSION_ID,
			activeVersionId: null,
		}),
	);
	if (!published) return;
	await agentHistoryRepository.insert({
		versionId: VERSION_ID,
		agentId: AGENT_ID,
		author: 'test',
		schema: { name: 'Support', model: 'm', instructions: 'i' },
		tools: {},
		skills: {},
	});
	await agentRepository.update({ id: AGENT_ID }, { activeVersionId: VERSION_ID });
};

const createBoundApp = async (permissions: Array<'chat' | 'history'> = ['chat', 'history']) => {
	const app = await appRepository.createApp(ownerProject.id, 'Help', 'help');
	return await appRepository.updateBindings(app, [
		{ key: 'support', kind: 'agent', agentId: AGENT_ID, permissions },
	]);
};

const threadOf = (appId: string, sessionId: string) => `${AGENT_ID}:app:${appId}:${sessionId}`;

/** A parked approval on `threadId`, as the runtime leaves it when a tool suspends. */
const parkRun = async (threadId: string, runId: string) => {
	const state = {
		status: 'suspended',
		persistence: { threadId, resourceId: `app:${threadId}` },
		messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
		pendingToolCalls: {
			'call-1': {
				toolCallId: 'call-1',
				toolName: 'delete_ticket',
				input: { id: 7 },
				suspended: true,
				suspendPayload: { type: 'approval', toolName: 'delete_ticket', args: { id: 7 } },
				resumeSchema: { type: 'object' },
				runId,
			},
		},
	} as unknown as SerializableAgentState;
	await Container.get(N8NCheckpointStorage).save(runId, state, AGENT_ID);
	// The execution row only rules a thread out; the checkpoint above is the authority.
	hasSuspendedRun.mockResolvedValue(true);
};

beforeAll(async () => {
	appRepository = Container.get(AppRepository);
	agentRepository = Container.get(AgentRepository);
	agentHistoryRepository = Container.get(AgentHistoryRepository);
	orchestrator = Container.get(AgentExecutionOrchestratorService);
	owner = await createOwner();
	ownerProject = await getPersonalProject(owner);
	visitor = testServer.restlessAgent;
});

beforeEach(async () => {
	await testDb.truncate(['App']);
	await agentRepository.delete({});
	await agentHistoryRepository.delete({});
	executeForChatPublished = vi
		.spyOn(orchestrator, 'executeForChatPublished')
		.mockImplementation(() => reply('Hello from Support'));
	hasSuspendedRun = vi
		.spyOn(Container.get(AgentExecutionService), 'hasSuspendedRun')
		.mockResolvedValue(false);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('POST /apps/:namespace/api/agents/:key/chat', () => {
	test('streams the published agent reply and ends with done', async () => {
		await createAgent();
		const app = await createBoundApp();
		const sessionId = randomUUID();

		const response = await visitor
			.post(CHAT)
			.set('Origin', 'null')
			.send({ message: 'Hi', sessionId })
			.expect(200);

		expect(response.headers['content-type']).toMatch(/^text\/event-stream/);
		expect(response.headers['access-control-allow-origin']).toBe('null');
		expect(response.headers['access-control-allow-credentials']).toBeUndefined();
		expect(events(response.text)).toEqual([
			{ type: 'text-start', id: 'msg-1' },
			{ type: 'text-delta', id: 'msg-1', delta: 'Hello from Support' },
			{ type: 'text-end', id: 'msg-1' },
			{ type: 'done', sessionId },
		]);
		expect(executeForChatPublished).toHaveBeenCalledWith(
			expect.objectContaining({
				agentId: AGENT_ID,
				projectId: ownerProject.id,
				message: 'Hi',
				memory: {
					threadId: threadOf(app.id, sessionId),
					resourceId: `app:${app.id}:${sessionId}`,
				},
				integrationType: 'app',
				sandboxPrincipalHash: expect.any(String),
			}),
		);
	});

	test('replaces an internal failure of the run with a fixed message', async () => {
		await createAgent();
		await createBoundApp();
		executeForChatPublished.mockImplementation(async function* () {
			yield { type: 'error', error: new Error('ECONNREFUSED 10.0.0.7:5432') } as StreamChunk;
		});

		const response = await visitor
			.post(CHAT)
			.send({ message: 'Hi', sessionId: randomUUID() })
			.expect(200);

		expect(events(response.text)).toEqual([
			{ type: 'error', message: 'The agent could not answer.' },
			{ type: 'done', sessionId: expect.any(String) },
		]);
	});

	test('forwards a user error of the run as is', async () => {
		await createAgent();
		await createBoundApp();
		executeForChatPublished.mockImplementation(async function* () {
			yield { type: 'text-start', id: 'msg-1' } as StreamChunk;
			throw new UserError('The agent has no model configured');
		});

		const response = await visitor
			.post(CHAT)
			.send({ message: 'Hi', sessionId: randomUUID() })
			.expect(200);

		expect(events(response.text)).toEqual([
			{ type: 'text-start', id: 'msg-1' },
			{ type: 'error', message: 'The agent has no model configured' },
		]);
	});

	test('answers 403 permission_denied for a history-only binding', async () => {
		await createAgent();
		await createBoundApp(['history']);

		const response = await visitor
			.post(CHAT)
			.send({ message: 'Hi', sessionId: randomUUID() })
			.expect(403);

		expect(response.body).toMatchObject({ code: 'permission_denied' });
		expect(executeForChatPublished).not.toHaveBeenCalled();
	});

	test('answers 409 agent_not_published as JSON while the agent has no active version', async () => {
		await createAgent(false);
		await createBoundApp();

		const response = await visitor
			.post(CHAT)
			.send({ message: 'Hi', sessionId: randomUUID() })
			.expect(409);

		expect(response.headers['content-type']).toMatch(/^application\/json/);
		expect(response.body).toMatchObject({ code: 'agent_not_published' });
		expect(executeForChatPublished).not.toHaveBeenCalled();
	});

	test('answers 409 run_in_progress while the session waits for an answer', async () => {
		await createAgent();
		const app = await createBoundApp();
		const sessionId = randomUUID();
		await parkRun(threadOf(app.id, sessionId), 'run-parked');

		const response = await visitor.post(CHAT).send({ message: 'Hi', sessionId }).expect(409);

		expect(response.body).toMatchObject({ code: 'run_in_progress' });
		expect(executeForChatPublished).not.toHaveBeenCalled();
	});

	test('answers 400 invalid_input for a message over the cap', async () => {
		await createAgent();
		await createBoundApp();

		const response = await visitor
			.post(CHAT)
			.send({ message: 'x'.repeat(8001), sessionId: randomUUID() })
			.expect(400);

		expect(response.body).toMatchObject({
			code: 'invalid_input',
			issues: [{ path: ['message'], code: 'too_big' }],
		});
	});

	test('answers 404 binding_not_found for a key the app has not bound', async () => {
		await createAgent();
		await createBoundApp();

		const response = await visitor
			.post('/apps/help/api/agents/nope/chat')
			.send({ message: 'Hi', sessionId: randomUUID() })
			.expect(404);

		expect(response.body).toMatchObject({ code: 'binding_not_found' });
	});

	test('answers 403 forbidden_origin to another site', async () => {
		await createAgent();
		await createBoundApp();

		const response = await visitor
			.post(CHAT)
			.set('Origin', 'https://evil.example')
			.send({ message: 'Hi', sessionId: randomUUID() })
			.expect(403);

		expect(response.body).toMatchObject({ code: 'forbidden_origin' });
		expect(response.headers['access-control-allow-origin']).toBeUndefined();
	});
});

describe('POST /apps/:namespace/api/agents/:key/chat/resume', () => {
	test('rejects a resume from a session the run does not belong to', async () => {
		await createAgent();
		const app = await createBoundApp();
		await parkRun(threadOf(app.id, randomUUID()), 'run-parked');

		const response = await visitor
			.post(RESUME)
			.send({
				sessionId: randomUUID(),
				runId: 'run-parked',
				toolCallId: 'call-1',
				resumeData: { approved: true },
			})
			.expect(200);

		expect(events(response.text)).toEqual([
			{ type: 'error', message: 'Checkpoint run-parked does not belong to this chat' },
		]);
	});

	test('answers 400 invalid_input without a runId', async () => {
		await createAgent();
		await createBoundApp();

		const response = await visitor
			.post(RESUME)
			.send({ sessionId: randomUUID(), toolCallId: 'call-1', resumeData: {} })
			.expect(400);

		expect(response.body).toMatchObject({ code: 'invalid_input' });
	});
});

describe('GET /apps/:namespace/api/agents/:key/messages', () => {
	test('answers an empty history for a session nobody chatted in', async () => {
		await createAgent();
		await createBoundApp();

		const response = await visitor
			.get(MESSAGES)
			.query({ sessionId: randomUUID() })
			.set('Origin', 'null')
			.expect(200);

		expect(response.body).toEqual({ messages: [], openSuspensions: [] });
	});

	test('lists the open suspension of a parked run so the app can render its card', async () => {
		await createAgent();
		const app = await createBoundApp();
		const sessionId = randomUUID();
		await parkRun(threadOf(app.id, sessionId), 'run-parked');

		const response = await visitor.get(MESSAGES).query({ sessionId }).expect(200);

		expect(response.body).toEqual({
			messages: [],
			openSuspensions: [
				{
					toolCallId: 'call-1',
					runId: 'run-parked',
					suspendPayload: { type: 'approval', toolName: 'delete_ticket', args: { id: 7 } },
				},
			],
		});
	});

	test('answers 403 permission_denied for a chat-only binding', async () => {
		await createAgent();
		await createBoundApp(['chat']);

		const response = await visitor.get(MESSAGES).query({ sessionId: randomUUID() }).expect(403);

		expect(response.body).toMatchObject({ code: 'permission_denied' });
	});

	test('answers 400 invalid_input without a session id', async () => {
		await createAgent();
		await createBoundApp();

		const response = await visitor.get(MESSAGES).expect(400);

		expect(response.body).toMatchObject({ code: 'invalid_input' });
	});
});

describe('app chat channel', () => {
	test('is registered as an internal integration', () => {
		const registry = Container.get(ChatIntegrationRegistry);

		expect(registry.get('app')).toMatchObject({ type: 'app', internal: true, displayLabel: 'App' });
		expect(registry.listPublic().map((integration) => integration.type)).not.toContain('app');
	});
});
