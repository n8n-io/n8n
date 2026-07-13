import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { EventService } from '@/events/event.service';
import { createFolder } from '@test-integration/db/folders';

import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
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
		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

		const response = await authOwnerAgent.post('/n8n-packages/export').send({
			workflowIds: ['wf-1'],
			projectIds: ['project-1'],
		});

		expect(response.statusCode).toBe(400);
		expect(response.body).toEqual({
			message: 'Provide either workflowIds/folderIds or projectIds, not both',
		});
		expect(emitSpy).toHaveBeenCalledWith(
			'n8n-package-export-failed',
			expect.objectContaining({
				reason: 'validation',
				workflowIds: ['wf-1'],
				projectIds: ['project-1'],
			}),
		);
	});

	test('rejects export when the API key lacks workflow:export scope', async () => {
		const limitedOwner = await createOwnerWithApiKey({ scopes: ['project:export'] });
		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

		const response = await testServer
			.publicApiAgentFor(limitedOwner)
			.post('/n8n-packages/export')
			.send({ workflowIds: ['wf-1'] });

		expect(response.statusCode).toBe(403);
		expect(emitSpy).toHaveBeenCalledWith(
			'n8n-package-export-failed',
			expect.objectContaining({ reason: 'access-denied', workflowIds: ['wf-1'] }),
		);
	});

	test('returns the same response whether a workflow is inaccessible or missing, but tells them apart in the audit trail', async () => {
		const workflowOwner = await createOwnerWithApiKey();
		const project = await createTeamProject('Someone else project', workflowOwner);
		const workflow = await createWorkflow({ name: 'Private' }, project);
		const outsider = await createMemberWithApiKey();
		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

		const deniedResponse = await testServer
			.publicApiAgentFor(outsider)
			.post('/n8n-packages/export')
			.send({ workflowIds: [workflow.id] });

		const notFoundResponse = await authOwnerAgent
			.post('/n8n-packages/export')
			.send({ workflowIds: ['does-not-exist'] });

		expect(deniedResponse.statusCode).toBe(notFoundResponse.statusCode);
		expect(deniedResponse.body).toEqual(notFoundResponse.body);

		expect(emitSpy).toHaveBeenCalledWith(
			'n8n-package-export-failed',
			expect.objectContaining({ reason: 'access-denied', workflowIds: [workflow.id] }),
		);
		expect(emitSpy).toHaveBeenCalledWith(
			'n8n-package-export-failed',
			expect.objectContaining({ reason: 'entity-not-found', workflowIds: ['does-not-exist'] }),
		);
	});

	test('returns the same response whether a project is inaccessible or missing, but tells them apart in the audit trail', async () => {
		const projectOwner = await createOwnerWithApiKey();
		const project = await createTeamProject('Someone else project', projectOwner);
		const outsider = await createMemberWithApiKey();
		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

		const deniedResponse = await testServer
			.publicApiAgentFor(outsider)
			.post('/n8n-packages/export')
			.send({ projectIds: [project.id] });

		const notFoundResponse = await authOwnerAgent
			.post('/n8n-packages/export')
			.send({ projectIds: ['does-not-exist'] });

		expect(deniedResponse.statusCode).toBe(notFoundResponse.statusCode);
		expect(deniedResponse.body).toEqual(notFoundResponse.body);

		expect(emitSpy).toHaveBeenCalledWith(
			'n8n-package-export-failed',
			expect.objectContaining({ reason: 'access-denied', projectIds: [project.id] }),
		);
		expect(emitSpy).toHaveBeenCalledWith(
			'n8n-package-export-failed',
			expect.objectContaining({ reason: 'entity-not-found', projectIds: ['does-not-exist'] }),
		);
	});

	test('returns the same response whether a folder is inaccessible or missing, but tells them apart in the audit trail', async () => {
		const folderOwner = await createOwnerWithApiKey();
		const project = await createTeamProject('Someone else project', folderOwner);
		const folder = await createFolder(project, { name: 'secret' });
		const outsider = await createMemberWithApiKey();
		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

		const deniedResponse = await testServer
			.publicApiAgentFor(outsider)
			.post('/n8n-packages/export')
			.send({ folderIds: [folder.id] });

		const notFoundResponse = await authOwnerAgent
			.post('/n8n-packages/export')
			.send({ folderIds: ['does-not-exist'] });

		expect(deniedResponse.statusCode).toBe(notFoundResponse.statusCode);
		expect(deniedResponse.body).toEqual(notFoundResponse.body);

		expect(emitSpy).toHaveBeenCalledWith(
			'n8n-package-export-failed',
			expect.objectContaining({ reason: 'access-denied', folderIds: [folder.id] }),
		);
		expect(emitSpy).toHaveBeenCalledWith(
			'n8n-package-export-failed',
			expect.objectContaining({ reason: 'entity-not-found', folderIds: ['does-not-exist'] }),
		);
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
