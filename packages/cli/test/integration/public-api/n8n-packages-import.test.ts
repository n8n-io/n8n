import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { CredentialTypes } from '@/credential-types';
import {
	buildImportPackageBuffer,
	serializedWorkflowWithCredential,
} from '@/modules/n8n-packages/__tests__/fixtures/package-fixtures';
import { TarPackageWriter } from '@/modules/n8n-packages/io/tar/tar-package-writer';
import { Telemetry } from '@/telemetry';

import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

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
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'CredentialsEntity',
		'SharedCredentials',
	]);
	authOwnerAgent = testServer.publicApiAgentFor(owner);
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
			isPublished: false,
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
					publishing: { state: 'unchanged' },
					status: 'created',
				},
			],
			bindings: {
				workflows: { 'wf-http-source': expect.any(String) },
				credentials: {},
			},
			credentials: {
				matched: [],
				stubbed: [],
			},
		});

		expect(response.body.workflows[0].localId).not.toBe('wf-http-source');
	});

	test('accepts a request that supplies every documented form field', async () => {
		const tarBuffer = await buildImportPackage();

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('projectId', ownerPersonalProject.id)
			.field('folderId', '')
			.field('credentialMatchingMode', 'id-only')
			.field('credentialMissingMode', 'must-preexist')
			.field('credentialBindings', '{}')
			.field('workflowConflictPolicy', 'fail')
			.field('workflowIdPolicy', 'new')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
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
			message: expect.stringContaining('Import blocked'),
			issues: [
				{
					type: 'workflow-conflict',
					sourceWorkflowId: 'wf-http-source',
					existingWorkflowId,
					name: 'HTTP Imported',
				},
			],
		});
	});

	test('returns 422 when credential references cannot be resolved under must-preexist', async () => {
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
			.field('credentialMissingMode', 'must-preexist')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(422);
		expect(response.body).toMatchObject({
			message: expect.stringContaining('Import blocked'),
			issues: [
				expect.objectContaining({
					type: 'credential-unresolved',
					kind: 'not_found',
					sourceId: 'non-existent-credential',
				}),
			],
		});
	});

	test('creates stub credentials by default when references are missing', async () => {
		const tarBuffer = await buildImportPackageBuffer(
			[
				serializedWorkflowWithCredential({
					id: 'wf-stub',
					name: 'Stub Credential Workflow',
					credentialId: 'missing-credential',
					credentialName: 'Missing',
				}),
			],
			{ sourceId: 'http-integration-credential-stub' },
		);

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'fail')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
		expect(response.body.credentials).toEqual({
			matched: [],
			stubbed: ['missing-credential'],
		});
		expect(response.body.bindings.credentials).toEqual({
			'missing-credential': expect.any(String),
		});
		expect(response.body.workflows).toHaveLength(1);
	});
});
