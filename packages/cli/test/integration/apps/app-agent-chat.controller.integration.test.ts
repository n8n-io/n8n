import type { StreamChunk } from '@n8n/agents';
import type { AppBlock, AppVersionSnapshot } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import {
	AgentExecutionOrchestratorService,
	type ExecuteForChatPublishedConfig,
} from '@/modules/agents/agent-execution-orchestrator.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AppRepository } from '@/modules/apps/app.repository';
import { AppVersionRepository } from '@/modules/apps/app-version.repository';
import { PageRepository } from '@/modules/apps/page.repository';
import { AppTokenService } from '@/modules/apps/serving/app-token.service';
import { createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let owner: User;
let ownerProject: Project;
/** No session: the access token in the Authorization header is this endpoint's only credential. */
let visitor: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['apps'],
	modules: ['apps'],
});

let appRepository: AppRepository;
let pageRepository: PageRepository;
let appVersionRepository: AppVersionRepository;
let appTokenService: AppTokenService;

const agentRepository = mock<AgentRepository>();
const orchestrator = mock<AgentExecutionOrchestratorService>();
let agentsModuleActive = true;

beforeAll(async () => {
	appRepository = Container.get(AppRepository);
	pageRepository = Container.get(PageRepository);
	appVersionRepository = Container.get(AppVersionRepository);
	appTokenService = Container.get(AppTokenService);
	Container.set(AgentRepository, agentRepository);
	Container.set(AgentExecutionOrchestratorService, orchestrator);

	owner = await createOwner();
	ownerProject = await getPersonalProject(owner);
	visitor = testServer.restlessAgent;
});

beforeEach(async () => {
	await testDb.truncate(['App', 'Page', 'AppVersion']);
	agentsModuleActive = true;
	// Restored between tests by the vitest config, so the spy is set here.
	vi.spyOn(Container.get(ModuleRegistry), 'isActive').mockImplementation(
		(name) => name === 'agents' && agentsModuleActive,
	);
	agentRepository.findByIdAndProjectId.mockReset();
	orchestrator.executeForChatPublished.mockReset();
	agentRepository.findByIdAndProjectId.mockResolvedValue(
		mock<Agent>({ id: 'agent-1', activeVersionId: 'version-1' }),
	);
	orchestrator.executeForChatPublished.mockImplementation(async function* () {
		yield { type: 'text-delta', id: 't1', delta: 'Hello ' } as StreamChunk;
		yield { type: 'text-delta', id: 't1', delta: 'world' } as StreamChunk;
	});
});

const chatBlock: AppBlock = {
	id: 'chat-1',
	type: 'agent-chat',
	data: { agentId: 'agent-1', welcome: 'Hi' },
};
const paragraphBlock: AppBlock = { id: 'p1', type: 'paragraph', data: { text: 'Hello' } };

/** Creates a published App with one page holding `blocks`, and an access token for it. */
async function publishAppWithBlocks(blocks: AppBlock[], auth: 'public' | 'n8n' = 'public') {
	const app = await appRepository.createApp(ownerProject.id, 'Acme Portal', 'acme');
	await appRepository.updateApp(app, { auth });
	const page = await pageRepository.createPage(app.id, null, '', blocks);

	const snapshot: AppVersionSnapshot = {
		pages: [
			{ id: page.id, route: '', title: null, parentPageId: null, content: blocks, layout: null },
		],
		theme: null,
		components: null,
	};
	const version = await appVersionRepository.createFromSnapshot(app.id, snapshot, owner.id);
	await appRepository.setActiveVersionId(app, version.id);

	const pair = await appTokenService.exchangeCode(
		await appTokenService.issueCode({
			appId: app.id,
			viewerId: auth === 'n8n' ? owner.id : null,
			sessionToken: null,
		}),
	);
	if (!pair) throw new Error('Code exchange failed');

	return { app, page, bearer: `Bearer ${pair.accessToken}` };
}

const chatUrl = (pageId: string, blockId: string) => `/apps/acme/_agents/${pageId}/${blockId}/chat`;

const parseEvents = (text: string): Array<Record<string, unknown>> =>
	text
		.split('\n')
		.filter((line) => line.startsWith('data: '))
		.map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>);

const lastConfig = (): ExecuteForChatPublishedConfig => {
	const call = orchestrator.executeForChatPublished.mock.calls.at(-1);
	if (!call) throw new Error('executeForChatPublished was not called');
	return call[0];
};

describe('POST /apps/:namespace/_agents/:pageId/:blockId/chat', () => {
	test('answers 401 without a bearer token', async () => {
		const { page } = await publishAppWithBlocks([chatBlock]);

		const response = await visitor
			.post(chatUrl(page.id, chatBlock.id))
			.send({ message: 'Hi' })
			.expect(401);

		expect(response.body).toEqual({ error: 'Invalid access token' });
		expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
	});

	test('answers 400 for a body without a message or with a bad thread id', async () => {
		const { page, bearer } = await publishAppWithBlocks([chatBlock]);

		await visitor
			.post(chatUrl(page.id, chatBlock.id))
			.set('Authorization', bearer)
			.send({})
			.expect(400);
		await visitor
			.post(chatUrl(page.id, chatBlock.id))
			.set('Authorization', bearer)
			.send({ message: 'Hi', threadId: 'not-a-uuid' })
			.expect(400);

		expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
	});

	test('answers 404 for a block that is not an agent-chat block', async () => {
		const { page, bearer } = await publishAppWithBlocks([paragraphBlock]);

		const response = await visitor
			.post(chatUrl(page.id, paragraphBlock.id))
			.set('Authorization', bearer)
			.send({ message: 'Hi' })
			.expect(404);

		expect(response.body).toEqual({ error: 'Chat not found' });
	});

	test('answers 404 when the agents module is inactive', async () => {
		agentsModuleActive = false;
		const { page, bearer } = await publishAppWithBlocks([chatBlock]);

		const response = await visitor
			.post(chatUrl(page.id, chatBlock.id))
			.set('Authorization', bearer)
			.send({ message: 'Hi' })
			.expect(404);

		expect(response.body).toEqual({ error: 'Agents are not enabled' });
		expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
	});

	test('answers 404 for an unpublished or foreign agent', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			mock<Agent>({ id: 'agent-1', activeVersionId: null }),
		);
		const { app, page, bearer } = await publishAppWithBlocks([chatBlock]);

		const response = await visitor
			.post(chatUrl(page.id, chatBlock.id))
			.set('Authorization', bearer)
			.send({ message: 'Hi' })
			.expect(404);

		expect(response.body).toEqual({ error: 'Agent is not published' });
		expect(agentRepository.findByIdAndProjectId).toHaveBeenCalledWith('agent-1', app.projectId);
		expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
	});

	test('streams the agent reply as SSE and ends with done carrying a new thread id', async () => {
		const { app, page, bearer } = await publishAppWithBlocks([chatBlock]);

		const response = await visitor
			.post(chatUrl(page.id, chatBlock.id))
			.set('Authorization', bearer)
			.send({ message: 'Hi there' })
			.expect(200)
			.expect('Content-Type', /text\/event-stream/);

		const events = parseEvents(response.text);
		expect(events).toEqual([
			{ type: 'text-delta', id: 't1', delta: 'Hello ' },
			{ type: 'text-delta', id: 't1', delta: 'world' },
			{ type: 'done', sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/) },
		]);

		const config = lastConfig();
		const threadId = events[2].sessionId;
		expect(config).toMatchObject({
			agentId: 'agent-1',
			projectId: app.projectId,
			message: 'Hi there',
			integrationType: 'n8n-app',
			memory: { threadId, resourceId: `app:${app.id}:session:${threadId}` },
		});
		expect(config.sandboxPrincipalHash).toMatch(/^[A-Za-z0-9_-]{43}$/);
	});

	test('continues a client-supplied thread and scopes memory to the viewer on an n8n app', async () => {
		const { app, page, bearer } = await publishAppWithBlocks([chatBlock], 'n8n');
		const threadId = '4c1d2e3f-0000-4000-8000-000000000001';

		const response = await visitor
			.post(chatUrl(page.id, chatBlock.id))
			.set('Authorization', bearer)
			.send({ message: 'Again', threadId })
			.expect(200);

		expect(parseEvents(response.text).at(-1)).toEqual({ type: 'done', sessionId: threadId });
		expect(lastConfig().memory).toEqual({
			threadId,
			resourceId: `app:${app.id}:viewer:${owner.id}`,
		});
	});

	test('reports a failure while streaming as an error event', async () => {
		orchestrator.executeForChatPublished.mockImplementation(async function* () {
			yield { type: 'text-delta', id: 't1', delta: 'Partial' } as StreamChunk;
			throw new Error('Model unavailable');
		});
		const { page, bearer } = await publishAppWithBlocks([chatBlock]);

		const response = await visitor
			.post(chatUrl(page.id, chatBlock.id))
			.set('Authorization', bearer)
			.send({ message: 'Hi' })
			.expect(200);

		expect(parseEvents(response.text)).toEqual([
			{ type: 'text-delta', id: 't1', delta: 'Partial' },
			{ type: 'error', message: 'Model unavailable' },
		]);
	});

	test('answers the CORS pre-flight', async () => {
		await visitor
			.options(chatUrl('page', 'block'))
			.set('Origin', 'null')
			.set('Access-Control-Request-Method', 'POST')
			.expect(204)
			.expect('Access-Control-Allow-Headers', /Authorization/);
	});
});
