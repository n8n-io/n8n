import { ModuleRegistry } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { createFolder } from '@test-integration/db/folders';
import type request from 'supertest';

import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

// supertest buffers only text and JSON bodies by default
const readBinaryBody = (
	res: request.Response,
	callback: (error: Error | null, body: Buffer) => void,
) => {
	const chunks: Buffer[] = [];
	res.on('data', (chunk: Buffer) => chunks.push(chunk));
	res.on('end', () => callback(null, Buffer.concat(chunks)));
};

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
	test.each(['workflowIds', 'folderIds', 'agentIds'] as const)(
		'rejects projects mixed with %s',
		async (field) => {
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			const response = await authOwnerAgent.post('/n8n-packages/export').send({
				[field]: ['selected-id'],
				projectIds: ['project-1'],
			});

			expect(response.statusCode).toBe(400);
			expect(response.body).toEqual({
				message: 'Provide either agentIds/workflowIds/folderIds or projectIds, not both',
			});
			expect(emitSpy).toHaveBeenCalledWith(
				'n8n-package-export-failed',
				expect.objectContaining({
					reason: 'validation',
					[field]: ['selected-id'],
					projectIds: ['project-1'],
				}),
			);
		},
	);

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

	test('rejects Agent selection when its module is disabled', async () => {
		expect(Container.get(ModuleRegistry).isActive('agents')).toBe(false);
		const response = await authOwnerAgent
			.post('/n8n-packages/export')
			.send({ agentIds: ['agent-1'] });
		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('agents module is disabled');
	});

	test.each([
		{ versionPolicy: 'published' },
		{ dependencyPolicy: 'skip' },
		{ agentIds: [] },
		{ includeAgents: false },
	])('rejects invalid or internal export options: %j', async (options) => {
		const project = await createTeamProject('Export project', owner);
		const folder = await createFolder(project, { name: 'Selected' });
		const response = await authOwnerAgent
			.post('/n8n-packages/export')
			.send({ folderIds: [folder.id], ...options });
		expect(response.statusCode).toBe(400);
	});

	test('streams a gzipped package when exporting a folder', async () => {
		const project = await createTeamProject('Export project', owner);
		const folder = await createFolder(project, { name: 'to_production' });

		const response = await authOwnerAgent
			.post('/n8n-packages/export')
			.buffer(true)
			.parse(readBinaryBody)
			.send({ folderIds: [folder.id] });

		expect(response.statusCode).toBe(200);
		expect(response.headers['content-type']).toContain('application/gzip');
		expect(response.headers['content-disposition']).toContain('export.n8np');

		const counts = JSON.parse(response.headers['x-n8n-export-counts']);
		expect(typeof counts.workflows).toBe('number');
		expect(typeof counts.folders).toBe('number');
		expect(response.headers['access-control-expose-headers']).toBe('X-N8n-Export-Counts');

		// Gzip magic number
		const body: Buffer = response.body;
		expect([body[0], body[1]]).toEqual([0x1f, 0x8b]);
	});

	// The request DTO is strict, so acceptance proves `includeTags` is a declared field.
	test('accepts includeTags=false through the request DTO', async () => {
		const project = await createTeamProject('Export project', owner);
		const folder = await createFolder(project, { name: 'to_production' });

		const response = await authOwnerAgent
			.post('/n8n-packages/export')
			.send({ folderIds: [folder.id], includeTags: false });

		expect(response.statusCode).toBe(200);
	});

	// Acceptance proves `credentialExportPolicy` is a declared field of the request DTO.
	test('accepts credentialExportPolicy=no-values through the request DTO', async () => {
		const project = await createTeamProject('Export project', owner);
		const folder = await createFolder(project, { name: 'to_production' });

		const response = await authOwnerAgent
			.post('/n8n-packages/export')
			.send({ folderIds: [folder.id], credentialExportPolicy: 'no-values' });

		expect(response.statusCode).toBe(200);
	});

	test('rejects an unknown credentialExportPolicy value', async () => {
		const project = await createTeamProject('Export project', owner);
		const folder = await createFolder(project, { name: 'to_production' });

		const response = await authOwnerAgent
			.post('/n8n-packages/export')
			.send({ folderIds: [folder.id], credentialExportPolicy: 'all-values' });

		expect(response.statusCode).toBe(400);
	});

	test('rejects an unauthenticated request with 401', async () => {
		const response = await testServer
			.publicApiAgentWithoutApiKey()
			.post('/n8n-packages/export')
			.send({ workflowIds: ['wf-1'] });

		expect(response.statusCode).toBe(401);
	});

	test('rejects a key with neither project:export nor workflow:export with 403, before the handler runs', async () => {
		const readOnlyOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });
		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

		const response = await testServer
			.publicApiAgentFor(readOnlyOwner)
			.post('/n8n-packages/export')
			.send({ workflowIds: ['wf-1'] });

		expect(response.statusCode).toBe(403);
		expect(emitSpy).not.toHaveBeenCalledWith('n8n-package-export-failed', expect.anything());
	});

	test('rejects a non-JSON Content-Type with 415', async () => {
		const response = await authOwnerAgent
			.post('/n8n-packages/export')
			.set('Content-Type', 'text/plain')
			.send('workflowIds');

		expect(response.statusCode).toBe(415);
	});

	test('rejects an unknown body field with 400', async () => {
		const response = await authOwnerAgent
			.post('/n8n-packages/export')
			.send({ workflowIds: ['wf-1'], evil: 'x' });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('evil');
	});
});
