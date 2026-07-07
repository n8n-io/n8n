import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { createFolder } from '@test-integration/db/folders';
import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

let owner: User;
let authOwnerAgent: SuperAgentTest;

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	Container.get(InstanceSettings).markAsLeader();
});

beforeEach(async () => {
	authOwnerAgent = testServer.publicApiAgentFor(owner);
});

afterEach(async () => {
	await testDb.truncate([
		'Folder',
		'WorkflowEntity',
		'SharedWorkflow',
		'ProjectRelation',
		'Project',
	]);
});

describe('POST /n8n-packages/export', () => {
	test('rejects requests that provide both workflowIds and projectIds', async () => {
		const response = await authOwnerAgent.post('/n8n-packages/export').send({
			workflowIds: ['wf-1'],
			projectIds: ['project-1'],
		});

		expect(response.statusCode).toBe(400);
		expect(response.body).toEqual({
			message: 'Provide either workflowIds/folderIds or projectIds, not both',
		});
	});

	test('rejects requests that provide both folderIds and projectIds', async () => {
		const response = await authOwnerAgent.post('/n8n-packages/export').send({
			folderIds: ['fld-1'],
			projectIds: ['project-1'],
		});

		expect(response.statusCode).toBe(400);
		expect(response.body).toEqual({
			message: 'Provide either workflowIds/folderIds or projectIds, not both',
		});
	});

	test('streams a gzipped package when exporting a folder', async () => {
		const project = await createTeamProject('Export project', owner);
		const folder = await createFolder(project, { name: 'to_production' });

		const response = await authOwnerAgent
			.post('/n8n-packages/export')
			.send({ folderIds: [folder.id] });

		expect(response.statusCode).toBe(200);
		expect(response.headers['content-type']).toContain('application/gzip');
		expect(response.headers['content-disposition']).toContain('export.n8np');
	});
});
