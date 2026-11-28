/**
 * REST contract of POST /rest/runtime-credential-rules/impact with workflows in the database.
 */

import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { IWorkflowDb, User } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS = 'true';

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials'],
	modules: ['runtime-credentials'],
});

const URL = '/runtime-credential-rules/impact';
const WEBHOOK = 'n8n-nodes-base.webhook';

const node = (name: string, type: string, parameters: INode['parameters'] = {}): INode => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters,
});

const reading = (trigger: string, expression: string) => ({
	nodes: [node('Trigger', trigger), node('Set', 'n8n-nodes-base.set', { value: expression })],
	connections: { Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] } },
});

describe('runtime credential rule impact REST', () => {
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;
	let owner: User;

	beforeAll(async () => {
		await utils.initCredentialsTypes();
		owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(await createMember());

		await createWorkflow(
			{
				name: 'Reads token',
				...reading(WEBHOOK, "={{ $json.headers['x-token'] }}"),
			} as Partial<IWorkflowDb>,
			owner,
		);
		await createWorkflow(
			{
				name: 'Reads similar header',
				...reading(WEBHOOK, "={{ $json.headers['x-token-other'] }}"),
			} as Partial<IWorkflowDb>,
			owner,
		);
		await createWorkflow(
			{
				name: 'Form reads token',
				...reading('n8n-nodes-base.formTrigger', "={{ $json.headers['x-token'] }}"),
			} as Partial<IWorkflowDb>,
			owner,
		);
		await createWorkflow(
			{
				name: 'Archived reads token',
				isArchived: true,
				...reading(WEBHOOK, "={{ $json.headers['x-token'] }}"),
			} as Partial<IWorkflowDb>,
			owner,
		);
	});

	afterAll(async () => {
		delete process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS;
		await testDb.terminate();
	});

	it('refuses a user without the securitySettings:manage scope', async () => {
		await memberAgent.post(URL).send({ nodeType: WEBHOOK, path: 'headers.x-token' }).expect(403);
	});

	it('returns 400 for a missing or unsafe path', async () => {
		await ownerAgent.post(URL).send({ nodeType: WEBHOOK }).expect(400);
		await ownerAgent.post(URL).send({ nodeType: WEBHOOK, path: 'a.__proto__' }).expect(400);
	});

	it('lists only workflows with a matching trigger that read the exact path', async () => {
		const { body } = await ownerAgent
			.post(URL)
			.send({ nodeType: WEBHOOK, path: 'headers.x-token' })
			.expect(200);

		expect(body.data).toEqual({
			workflows: [
				{
					id: expect.any(String),
					name: 'Reads token',
					projectId: expect.any(String),
					projectName: expect.any(String),
					nodeNames: ['Set'],
				},
			],
			truncated: false,
		});
	});

	it('lists every trigger type for nodeType *', async () => {
		const { body } = await ownerAgent
			.post(URL)
			.send({ nodeType: '*', path: 'headers.x-token' })
			.expect(200);

		expect(body.data.workflows.map((workflow: { name: string }) => workflow.name).sort()).toEqual([
			'Form reads token',
			'Reads token',
		]);
	});

	it('matches a glob in the path', async () => {
		const { body } = await ownerAgent
			.post(URL)
			.send({ nodeType: WEBHOOK, path: 'headers.x-token*' })
			.expect(200);

		expect(body.data.workflows.map((workflow: { name: string }) => workflow.name).sort()).toEqual([
			'Reads similar header',
			'Reads token',
		]);
	});
});
