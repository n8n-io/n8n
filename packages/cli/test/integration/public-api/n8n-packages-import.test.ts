import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { CredentialTypes } from '@/credential-types';
import { GlobalConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { Project, User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

import {
	buildImportPackageBuffer,
	serializedWorkflowWithCredential,
} from '@/modules/n8n-packages/__tests__/fixtures/package-fixtures';
import { TarPackageWriter } from '@/modules/n8n-packages/io/tar/tar-package-writer';
import { Telemetry } from '@/telemetry';

mockInstance(Telemetry);

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

let owner: User;
let ownerPersonalProject: Project;
let authOwnerAgent: SuperAgentTest;

beforeAll(async () => {
	const credentialTypesMock = mockInstance(CredentialTypes);
	credentialTypesMock.recognizes.mockReturnValue(true);

	owner = await createOwnerWithApiKey();
	Container.get(InstanceSettings).markAsLeader();
	ownerPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		owner.id,
	);
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow']);
	authOwnerAgent = testServer.publicApiAgentFor(owner);
	testServer.license.enable(LICENSE_FEATURES.N8N_PACKAGES);
	Container.get(GlobalConfig).publicApi.packagesEnabled = true;
});

afterEach(() => {
	Container.get(GlobalConfig).publicApi.packagesEnabled = false;
});

const testWithAPIKey = (method: 'post', url: string, apiKey: string | null) => async () => {
	void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
	const response = await authOwnerAgent[method](url);
	expect(response.statusCode).toBe(401);
};

async function buildImportPackage(): Promise<Buffer> {
	const writer = new TarPackageWriter();
	const wfId = 'wf-http-source';
	writer.writeFile(
		'manifest.json',
		JSON.stringify({
			packageFormatVersion: '1',
			exportedAt: new Date().toISOString(),
			sourceN8nVersion: '1.0.0',
			sourceId: 'http-integration-source',
			workflows: [{ id: wfId, name: 'HTTP Imported', target: `workflows/${wfId}` }],
		}),
	);
	writer.writeDirectory(`workflows/${wfId}`);
	writer.writeFile(
		`workflows/${wfId}/workflow.json`,
		JSON.stringify({
			id: wfId,
			name: 'HTTP Imported',
			nodes: [
				{
					id: 'manual-trigger',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			versionId: 'wire-version-id',
			parentFolderId: null,
			active: false,
			isArchived: false,
		}),
	);

	const stream = writer.finalize();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
	}
	return Buffer.concat(chunks);
}

describe('POST /n8n-packages/import', () => {
	test('should fail due to missing API Key', testWithAPIKey('post', '/n8n-packages/import', null));

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('post', '/n8n-packages/import', 'abcXYZ'),
	);

	test('rejects unsupported Content-Type', async () => {
		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.set('Content-Type', 'application/json')
			.send({ not: 'a tar' });

		expect(response.statusCode).toBe(415);
	});

	test('rejects multipart request without package file', async () => {
		const response = await authOwnerAgent.post('/n8n-packages/import').field('projectId', '');

		expect(response.statusCode).toBe(400);
	});

	test('imports a package and returns the rich ImportResult', async () => {
		const tarBuffer = await buildImportPackage();

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'fail')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			package: {
				sourceN8nVersion: '1.0.0',
				sourceId: 'http-integration-source',
				exportedAt: expect.any(String),
			},
			workflows: [
				{
					sourceWorkflowId: 'wf-http-source',
					localId: expect.any(String),
					name: 'HTTP Imported',
					projectId: ownerPersonalProject.id,
					parentFolderId: null,
					activeVersionId: null,
					status: 'created',
				},
			],
			bindings: {
				workflows: { 'wf-http-source': expect.any(String) },
				credentials: {},
			},
		});

		expect(response.body.workflows[0].localId).not.toBe('wf-http-source');
	});

	test('returns 409 with conflict metadata when a workflow already exists under fail policy', async () => {
		const firstBuffer = await buildImportPackage();

		const first = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('credentialMatchingMode', 'id-only')
			.field('credentialMissingMode', 'must-preexist')
			.field('workflowConflictPolicy', 'fail')
			.attach('package', firstBuffer, 'import.n8np');
		expect(first.statusCode).toBe(200);
		const existingWorkflowId = first.body.workflows[0].localId;

		const secondBuffer = await buildImportPackage();
		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('credentialMatchingMode', 'id-only')
			.field('credentialMissingMode', 'must-preexist')
			.field('workflowConflictPolicy', 'fail')
			.attach('package', secondBuffer, 'import.n8np');

		expect(response.statusCode).toBe(409);
		expect(response.body).toMatchObject({
			code: 409,
			message: expect.stringContaining('already exist in the target project'),
			meta: {
				code: 'WORKFLOW_CONFLICT',
				conflicts: [
					{
						sourceWorkflowId: 'wf-http-source',
						existingWorkflowId,
						name: 'HTTP Imported',
					},
				],
			},
		});
	});

	test('returns 422 when credential references cannot be resolved', async () => {
		const tarBuffer = await buildImportPackageBuffer(
			[
				serializedWorkflowWithCredential({
					id: 'wf-miss',
					name: 'Missing Credential',
					credentialId: 'non-existent-credential',
					credentialName: 'Missing',
				}),
			],
			{ sourceId: 'http-integration-credential-fail' },
		);

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'fail')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(422);
		expect(response.body).toMatchObject({
			message: expect.stringContaining('credential reference'),
			failures: [
				expect.objectContaining({
					kind: 'not_found',
					sourceId: 'non-existent-credential',
				}),
			],
		});
	});
});
