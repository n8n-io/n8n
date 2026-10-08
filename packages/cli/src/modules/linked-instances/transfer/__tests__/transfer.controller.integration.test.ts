import { Logger } from '@n8n/backend-common';
import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { CredentialsEntity, Project, User } from '@n8n/db';
import { SharedWorkflowRepository, WorkflowHistoryRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { saveCredential } from '@test-integration/db/credentials';
import { createChatUser, createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';
import { randomBytes } from 'node:crypto';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialsService } from '@/credentials/credentials.service';
import { listCredentials } from '@/modules/mcp/tools/list-credentials.tool';
import {
	exportTool,
	httpNode,
	importTool,
	workflowCountIn,
} from '@/modules/n8n-packages/capabilities/__tests__/workflow-package-test-helpers';

import { CLOUD, fakeToken } from '../../__tests__/linked-instances.test-helpers';
import { LinkedInstanceRepository } from '../../database/repositories/linked-instance.repository';
import { LinkedInstanceStore } from '../../linked-instance.store';
import { LINK_NOT_FOUND_MESSAGE } from '../../linked-instances.service';
import {
	RemoteInstanceClientFactory,
	type RemoteInstanceClient,
} from '../../remote/remote-instance.client';
import { readToolResult } from '../../remote/remote-instance.outcome';
import { TRANSFER_MESSAGES } from '../transfer-errors';

const clientFactory = mockInstance(RemoteInstanceClientFactory);
mockInstance(ActiveWorkflowManager);

const testServer = utils.setupTestServer({
	endpointGroups: ['linked-instances'],
	modules: ['linked-instances', 'n8n-packages'],
	enabledFeatures: ['feat:projectRole:admin', 'feat:projectRole:editor', 'feat:projectRole:viewer'],
	quotas: { 'quota:maxTeamProjects': 100 },
});

const TOOLS = [
	'search_projects',
	'list_credentials',
	'publish_workflow',
	'export_workflow_package',
	'import_workflow_package',
];

/** Every token and ciphertext that this file made. No response or log line may hold one. */
const secrets = new Set<string>();
const responses: string[] = [];
const containsSecret = (text: string) => [...secrets].some((secret) => text.includes(secret));

type RecordedResponse = { status: number; text: string; headers: Record<string, unknown> };

async function recorded<T extends RecordedResponse>(request: PromiseLike<T>): Promise<T> {
	const response = await request;
	const text = JSON.stringify({ headers: response.headers, text: response.text });
	responses.push(text);
	expect(containsSecret(text)).toBe(false);
	return response;
}

/** The mock loggers of the test server: the root one and the one that every scope shares. */
let loggers: Logger[] = [];
let alice: User;
let bob: User;
/** The user of the access token in the linked instance. The test runs both instances in one database. */
let remoteUser: User;
let aliceAgent: SuperAgentTest;
let bobAgent: SuperAgentTest;
let chatAgent: SuperAgentTest;
let cloudProject: Project;
let salesProject: Project;
let aliceStripe: CredentialsEntity;
let client: MockProxy<RemoteInstanceClient>;
let token: string;
let linkId: string;

const headerCredential = async (name: string, project: Project) =>
	await saveCredential(
		{
			name,
			type: 'httpHeaderAuth',
			data: { name: 'Authorization', value: randomBytes(16).toString('hex') },
		},
		{ project, role: 'credential:owner' },
	);

/** The linked instance: the real package tools of n8n, called as the token's user. */
async function callRemoteTool(name: string, args: Record<string, unknown>): Promise<unknown> {
	if (name === 'import_workflow_package') {
		return readToolResult(await importTool(remoteUser, args), token);
	}
	if (name === 'export_workflow_package') {
		return readToolResult(await exportTool(remoteUser, String(args.workflowId)), token);
	}
	if (name === 'list_credentials') {
		const projectId = typeof args.projectId === 'string' ? args.projectId : undefined;
		return await listCredentials(remoteUser, Container.get(CredentialsService), {
			limit: 200,
			projectId,
		});
	}
	if (name === 'publish_workflow') {
		return { success: true, workflowId: args.workflowId, activeVersionId: 'v1' };
	}
	throw new Error(`Unexpected tool ${name}`);
}

const workflowsIn = async (project: Project) =>
	await Container.get(SharedWorkflowRepository).find({
		where: { projectId: project.id },
		relations: { workflow: true },
	});

const personalProjectOf = async (user: User) =>
	await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(user.id);

const post = async (agent: SuperAgentTest, path: string, body: Record<string, unknown>) =>
	await recorded(agent.post(`/linked-instances/${linkId}${path}`).send(body));

/** A workflow of Alice that calls Stripe with her credential. */
const aliceWorkflow = async () =>
	await createWorkflow({ name: 'Charge customers', nodes: [httpNode(aliceStripe)] }, alice);

beforeAll(async () => {
	const rootLogger = Container.get(Logger);
	loggers = [rootLogger, rootLogger.scoped('mcp')];
	await utils.initNodeTypes();
	await utils.initCredentialsTypes();
	const owner = await createOwner();
	alice = await createMember();
	bob = await createMember();
	remoteUser = await createMember();
	aliceAgent = testServer.authAgentFor(alice);
	bobAgent = testServer.authAgentFor(bob);
	chatAgent = testServer.authAgentFor(await createChatUser());
	cloudProject = await createTeamProject('Cloud automations', owner);
	await linkUserToProject(remoteUser, cloudProject, 'project:editor');
	salesProject = await createTeamProject('Sales', owner);
	await linkUserToProject(alice, salesProject, 'project:viewer');
	aliceStripe = await headerCredential('Stripe', await personalProjectOf(alice));
	await headerCredential('Stripe', cloudProject);
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowPublicationOutbox',
		'WorkflowPublishHistory',
		'WorkflowPublishedVersion',
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedWorkflow',
	]);
	await Container.get(LinkedInstanceRepository).delete({});
	token = fakeToken();
	secrets.add(token);
	const link = await Container.get(LinkedInstanceStore).create({
		userId: alice.id,
		name: 'Cloud',
		origin: CLOUD,
		token,
		status: 'online',
		verifiedAt: new Date(),
		defaultRemoteProject: { id: cloudProject.id, name: cloudProject.name },
	});
	if (!link) throw new Error('The link was not created');
	linkId = link.id;
	client = mock<RemoteInstanceClient>();
	client.probe.mockResolvedValue({ ok: true, toolNames: TOOLS });
	client.callTool.mockImplementation(callRemoteTool);
	clientFactory.create.mockReset();
	clientFactory.create.mockReturnValue(client);
});

/** Log lines of all tests: the mocks forget their calls after each test (`restoreMocks`). */
const logLines: unknown[][] = [];

afterEach(async () => {
	for (const row of await Container.get(LinkedInstanceRepository).find()) {
		secrets.add(row.tokenEncrypted);
	}
	for (const logger of loggers) {
		for (const method of [logger.debug, logger.info, logger.warn, logger.error]) {
			logLines.push(...vi.mocked(method).mock.calls);
		}
	}
});

afterAll(() => {
	expect(responses.length).toBeGreaterThan(20);
	expect(responses.filter(containsSecret)).toEqual([]);
	// The check covers the lines of the moves themselves.
	expect(logLines.map(([message]) => message)).toEqual(
		expect.arrayContaining([
			'Moved a workflow to a linked instance',
			'Brought a workflow from a linked instance',
			'A move with a linked instance failed',
		]),
	);
	expect(logLines.filter((line) => containsSecret(JSON.stringify(line)))).toEqual([]);
});

describe('POST /linked-instances/:id/transfer/preflight', () => {
	it('tells what moves and which credentials the linked instance has, and changes nothing', async () => {
		const workflow = await aliceWorkflow();

		const response = await post(aliceAgent, '/transfer/preflight', { workflowId: workflow.id });

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual({
			workflowName: 'Charge customers',
			moves: { nodes: 1 },
			nodeTypeCheck: 'unknown',
			missingNodeTypes: [],
			credentials: [{ name: 'Stripe', type: 'httpHeaderAuth', status: 'matched' }],
			targetProject: { id: cloudProject.id, name: 'Cloud automations' },
			subWorkflowCalls: [],
		});
		expect(await workflowCountIn(cloudProject)).toBe(0);
		expect(client.callTool.mock.calls.map(([name]) => name)).toEqual(['list_credentials']);
	});

	it('says needs-set-up for a credential that the target project does not have', async () => {
		const other = await headerCredential('Mailgun', await personalProjectOf(alice));
		const workflow = await createWorkflow({ name: 'Mail', nodes: [httpNode(other)] }, alice);

		const response = await post(aliceAgent, '/transfer/preflight', { workflowId: workflow.id });

		expect(response.body.data.credentials).toEqual([
			{ name: 'Mailgun', type: 'httpHeaderAuth', status: 'needs-set-up' },
		]);
	});
});

describe('POST /linked-instances/:id/transfer', () => {
	it('moves the workflow into the default project, and a second move updates the same copy', async () => {
		const workflow = await aliceWorkflow();

		const first = await post(aliceAgent, '/transfer', { workflowId: workflow.id });
		const second = await post(aliceAgent, '/transfer', { workflowId: workflow.id });

		expect(first.status).toBe(200);
		const { remoteWorkflowId } = first.body.data;
		expect(first.body.data).toMatchObject({
			remoteUrl: `${CLOUD}/workflow/${remoteWorkflowId}`,
			targetProject: { id: cloudProject.id, name: 'Cloud automations' },
			created: true,
			published: false,
			credentialsNeedingSetup: [],
			missingNodeTypes: [],
			localDeactivated: false,
		});
		expect(second.body.data).toMatchObject({ remoteWorkflowId, created: false });
		const copies = await workflowsIn(cloudProject);
		expect(copies.map(({ workflowId }) => workflowId)).toEqual([remoteWorkflowId]);
		expect(copies[0].workflow.nodes[0].credentials).not.toEqual(workflow.nodes[0].credentials);
	});

	it('moves a workflow that is not available in MCP here, because the REST route uses the normal access', async () => {
		const workflow = await aliceWorkflow();
		expect(workflow.settings?.availableInMCP).toBeFalsy();

		const response = await post(aliceAgent, '/transfer', { workflowId: workflow.id });

		expect(response.status).toBe(200);
	});

	it('publishes the copy and turns off the workflow here when asked', async () => {
		const workflow = await createActiveWorkflow({ name: 'Nightly sync' }, alice);

		const response = await post(aliceAgent, '/transfer', {
			workflowId: workflow.id,
			publish: true,
			deactivateLocal: true,
		});

		expect(response.status).toBe(200);
		expect(response.body.data).toMatchObject({ published: true, localDeactivated: true });
		const stored = await Container.get(WorkflowRepository).findOneByOrFail({ id: workflow.id });
		expect(stored.activeVersionId).toBeNull();
	});

	it('answers 403 and moves nothing when the user cannot turn off the workflow here', async () => {
		const workflow = await createWorkflow({ name: 'Sales report', nodes: [] }, salesProject);

		const response = await post(aliceAgent, '/transfer', {
			workflowId: workflow.id,
			deactivateLocal: true,
		});

		expect(response.status).toBe(403);
		expect(response.body.message).toBe(TRANSFER_MESSAGES.cannotTurnOff);
		expect(clientFactory.create).not.toHaveBeenCalled();
		expect(await workflowCountIn(cloudProject)).toBe(0);
	});

	it('lets a project viewer move a workflow that they can read, without turning it off', async () => {
		const workflow = await createWorkflow({ name: 'Sales report', nodes: [] }, salesProject);

		const response = await post(aliceAgent, '/transfer', { workflowId: workflow.id });

		expect(response.status).toBe(200);
		expect(await workflowCountIn(cloudProject)).toBe(1);
	});

	it('answers 404 for a workflow that the user cannot read', async () => {
		const workflow = await createWorkflow({ name: 'Bob only', nodes: [] }, bob);

		const response = await post(aliceAgent, '/transfer', { workflowId: workflow.id });

		expect(response.status).toBe(404);
		expect(response.body.message).toBe(TRANSFER_MESSAGES.workflowNotFound);
		expect(clientFactory.create).not.toHaveBeenCalled();
	});

	it('maps an unreachable instance to a 400 with an en-GB message', async () => {
		const workflow = await aliceWorkflow();
		client.probe.mockResolvedValue({ ok: false, reason: 'unreachable' });

		const response = await post(aliceAgent, '/transfer', { workflowId: workflow.id });

		expect(response.status).toBe(400);
		expect(response.body.message).toBe(
			"Can't reach Cloud. Check that it's running, then try again.",
		);
	});

	it('asks for MCP access when someone made the copy there unavailable in MCP', async () => {
		const workflow = await aliceWorkflow();
		const { remoteWorkflowId } = (await post(aliceAgent, '/transfer', { workflowId: workflow.id }))
			.body.data;
		await Container.get(WorkflowRepository).update(
			{ id: remoteWorkflowId },
			{ settings: { availableInMCP: false } },
		);

		const response = await post(aliceAgent, '/transfer', { workflowId: workflow.id });

		expect(response.status).toBe(400);
		expect(response.body.message).toBe(
			'Turn on MCP access for this workflow in Cloud automations on Cloud, then try again.',
		);
	});
});

describe('POST /linked-instances/:id/pull', () => {
	const remoteWorkflow = async () =>
		await createWorkflow(
			{ name: 'Cloud report', nodes: [], settings: { availableInMCP: true } },
			cloudProject,
		);

	it('brings the workflow into the personal project, and a second pull updates the same workflow', async () => {
		const source = await remoteWorkflow();
		const personal = await personalProjectOf(alice);

		const first = await post(aliceAgent, '/pull', { remoteWorkflowId: source.id });
		const second = await post(aliceAgent, '/pull', { remoteWorkflowId: source.id });

		expect(first.status).toBe(200);
		expect(first.body.data).toMatchObject({ workflowName: 'Cloud report', created: true });
		expect(second.body.data).toMatchObject({
			workflowId: first.body.data.workflowId,
			created: false,
		});
		const local = await Container.get(SharedWorkflowRepository).findBy({ projectId: personal.id });
		expect(local.map(({ workflowId }) => workflowId)).toEqual([first.body.data.workflowId]);
		expect(
			await Container.get(WorkflowHistoryRepository).countBy({
				workflowId: first.body.data.workflowId,
			}),
		).toBeGreaterThan(0);
	});

	it('answers 403 before any request when the user cannot create workflows in the project', async () => {
		const source = await remoteWorkflow();

		const response = await post(aliceAgent, '/pull', {
			remoteWorkflowId: source.id,
			projectId: salesProject.id,
		});

		expect(response.status).toBe(403);
		expect(response.body.message).toBe(TRANSFER_MESSAGES.cannotCreateInProject);
		expect(clientFactory.create).not.toHaveBeenCalled();
		expect(await workflowCountIn(salesProject)).toBe(0);
	});

	it('asks for MCP access when the workflow there is not available in MCP', async () => {
		const source = await createWorkflow({ name: 'Hidden', nodes: [] }, cloudProject);

		const response = await post(aliceAgent, '/pull', { remoteWorkflowId: source.id });

		expect(response.status).toBe(400);
		expect(response.body.message).toBe(
			'Turn on MCP access for this workflow in Cloud, then try again.',
		);
	});
});

describe('access to the routes', () => {
	const routes = [
		['/transfer/preflight', { workflowId: 'wf1' }],
		['/transfer', { workflowId: 'wf1' }],
		['/pull', { remoteWorkflowId: 'r1' }],
	] as const;

	it.each(routes)('answers 404 on %s for a link of another user', async (path, body) => {
		const response = await post(bobAgent, path, body);

		expect(response.status).toBe(404);
		expect(response.body.message).toBe(LINK_NOT_FOUND_MESSAGE);
		expect(clientFactory.create).not.toHaveBeenCalled();
	});

	it.each(routes)('refuses %s to a user without the Assistant scope', async (path, body) => {
		const response = await post(chatAgent, path, body);

		expect(response.status).toBe(403);
		expect(clientFactory.create).not.toHaveBeenCalled();
	});

	it.each([
		['/transfer/preflight', { workflowId: '../x' }],
		['/transfer', { workflowId: 'wf1', publish: 'yes' }],
		['/pull', { remoteWorkflowId: 'r1', projectId: 'a b' }],
	])('validates the body of %s', async (path, body) => {
		const response = await post(aliceAgent, path, body);

		expect(response.status).toBe(400);
		expect(clientFactory.create).not.toHaveBeenCalled();
	});
});
