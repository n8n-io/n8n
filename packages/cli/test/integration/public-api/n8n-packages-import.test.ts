import { EventService } from '@n8n/backend-services';
import { createTeamProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { CredentialsEntity, Project, User } from '@n8n/db';
import { CredentialsRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { CredentialTypes } from '@/credential-types';
import { CredentialsService } from '@/credentials/credentials.service';
import {
	buildImportPackageBuffer,
	githubCredentialPayload,
	serializedCredential,
	serializedWorkflow,
	serializedWorkflowWithCredential,
	WIRE_VERSION_ID,
} from '@/modules/n8n-packages/__tests__/fixtures/package-fixtures';
import { TarPackageWriter } from '@/modules/n8n-packages/io/tar/tar-package-writer';
import { Telemetry } from '@/telemetry';

import { saveCredential } from '../shared/db/credentials';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import { getVariableByKey } from '../shared/db/variables';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

mockInstance(Telemetry);

// Must run before `setupTestServer`, which constructs the controller with this mock.
const credentialTypesMock = mockInstance(CredentialTypes);
credentialTypesMock.recognizes.mockReturnValue(true);
// A credential update reads the parent types of the credential type.
credentialTypesMock.getParentTypes.mockReturnValue([]);

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

let owner: User;
let ownerPersonalProject: Project;
let authOwnerAgent: SuperAgentTest;

beforeAll(async () => {
	// Register node types so imports pass the default fail-on-missing-node-type check.
	await utils.initNodeTypes();

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
		'Variables',
	]);
	authOwnerAgent = testServer.publicApiAgentFor(owner);
});

async function buildImportPackage(
	options: { variable?: { name: string; value: string } } = {},
): Promise<Buffer> {
	const writer = new TarPackageWriter();
	const wfId = 'wf-http-source';
	const variable = options.variable
		? { ...options.variable, target: `variables/${options.variable.name}` }
		: undefined;
	writer.writeFile(
		'manifest.json',
		JSON.stringify({
			packageFormatVersion: '1',
			sourceN8nVersion: '1.0.0',
			sourceId: 'http-integration-source',
			workflows: [{ id: wfId, name: 'HTTP Imported', target: `workflows/${wfId}` }],
			...(variable
				? {
						variables: [{ id: 'var-http-source', name: variable.name, target: variable.target }],
						requirements: {
							variables: [{ name: variable.name, usedBy: [{ kind: 'workflow', id: wfId }] }],
						},
					}
				: {}),
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
			parentFolderId: null,
			isArchived: false,
		}),
	);
	writer.writeFile(
		`workflows/${wfId}/workflow-metadata.json`,
		JSON.stringify({ versionId: WIRE_VERSION_ID, publishedVersionId: null }),
	);

	if (variable) {
		writer.writeDirectory(variable.target);
		writer.writeFile(
			`${variable.target}/variable.json`,
			JSON.stringify({ name: variable.name, type: 'string', value: variable.value }),
		);
	}

	const stream = writer.finalize();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
	}
	return Buffer.concat(chunks);
}

describe('POST /n8n-packages/import', () => {
	test('should fail due to missing API Key', async () => {
		const response = await testServer.publicApiAgentWithoutApiKey().post('/n8n-packages/import');

		expect(response.statusCode).toBe(401);
	});

	test('should fail due to invalid API Key', async () => {
		const response = await testServer
			.publicApiAgentWithApiKey('abcXYZ')
			.post('/n8n-packages/import');

		expect(response.statusCode).toBe(401);
	});

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

	test('rejects import when the API key lacks workflow:import scope', async () => {
		const limitedOwner = await createOwnerWithApiKey({ scopes: ['workflow:export'] });
		const tarBuffer = await buildImportPackage();

		const response = await testServer
			.publicApiAgentFor(limitedOwner)
			.post('/n8n-packages/import')
			.field('conflictPolicy', 'fail')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(403);
	});

	test('rejects import into a project the caller has no access to', async () => {
		const projectOwner = await createOwnerWithApiKey();
		const project = await createTeamProject('Someone else project', projectOwner);
		const outsider = await createMemberWithApiKey();
		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
		const tarBuffer = await buildImportPackage();

		const response = await testServer
			.publicApiAgentFor(outsider)
			.post('/n8n-packages/import')
			.field('projectId', project.id)
			.field('conflictPolicy', 'fail')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(403);
		expect(emitSpy).toHaveBeenCalledWith(
			'n8n-package-import-failed',
			expect.objectContaining({ reason: 'access-denied', projectId: project.id }),
		);
	});

	test('rejects import when the projectId does not exist', async () => {
		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
		const tarBuffer = await buildImportPackage();

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('projectId', 'does-not-exist')
			.field('conflictPolicy', 'fail')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(404);
		expect(emitSpy).toHaveBeenCalledWith(
			'n8n-package-import-failed',
			expect.objectContaining({ reason: 'entity-not-found', projectId: 'does-not-exist' }),
		);
	});

	test('rejects bindings keyed by an unsupported entity type', async () => {
		const tarBuffer = await buildImportPackage();

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('conflictPolicy', 'fail')
			// "credential" (no trailing s) is a plausible typo that must error, not silently no-op.
			.field('bindings', '{"credential":{"source":"target"}}')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('Unrecognized key');
		expect(response.body.message).toContain('credential');
	});

	test('imports a package and returns the rich ImportResult', async () => {
		const tarBuffer = await buildImportPackage();

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('conflictPolicy', 'fail')
			.field('idPolicy', 'source')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			agents: [],
			counts: { agents: { created: 0, updated: 0, skipped: 0 } },
			package: {
				sourceN8nVersion: '1.0.0',
				sourceId: 'http-integration-source',
			},
			workflows: [
				{
					sourceWorkflowId: 'wf-http-source',
					localId: expect.any(String),
					name: 'HTTP Imported',
					projectId: ownerPersonalProject.id,
					parentFolderId: null,
					activeVersionId: null,
					isArchived: false,
					publishing: { state: 'unchanged' },
					status: 'created',
				},
			],
			removedWorkflows: [],
			removedFolders: [],
			folders: [],
			projects: [],
			bindings: {
				agents: {},
				workflows: { 'wf-http-source': expect.any(String) },
				credentials: {},
			},
			credentials: {
				matched: [],
				stubbed: [],
				seeded: [],
				incomplete: [],
				updated: [],
			},
			dataTables: {
				matched: 0,
				created: 0,
				updated: 0,
			},
			variables: {
				matched: [],
				missing: [],
				created: [],
				stubbed: [],
				updated: [],
			},
			tags: {
				matched: [],
				created: [],
				renamed: [],
				reconciled: [],
				skipped: [],
			},
		});

		expect(response.body.workflows[0].localId).toBe('wf-http-source');
	});

	test('creates a missing variable with the package value when variableMissingMode is omitted', async () => {
		testServer.license.enable('feat:variables');
		const tarBuffer = await buildImportPackage({
			variable: { name: 'API_URL', value: 'https://packaged.example.com' },
		});

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('conflictPolicy', 'fail')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
		expect(response.body.variables).toEqual({
			matched: [],
			missing: [],
			created: ['API_URL'],
			stubbed: [],
			updated: [],
		});
		const created = await getVariableByKey('API_URL');
		expect(created).toMatchObject({ value: 'https://packaged.example.com' });
	});

	test('accepts a request that supplies every documented form field', async () => {
		const tarBuffer = await buildImportPackage();

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('projectId', ownerPersonalProject.id)
			.field('folderId', '')
			.field('credentialMatchingMode', 'id-only')
			.field('credentialMissingMode', 'must-preexist')
			.field('credentialConflictPolicy', 'fail')
			.field('bindings', '{}')
			.field('conflictPolicy', 'fail')
			.field('idPolicy', 'source')
			.field('publishingPolicy', 'preserve-published-state')
			.field('projectConflictPolicy', 'merge')
			.field('folderConflictPolicy', 'merge')
			.field('overwriteDeletionPolicy', 'archive')
			.field('missingNodeTypeMode', 'fail')
			.field('dataTableMatchingMode', 'by-id')
			.field('dataTableMissingMode', 'must-preexist')
			.field('dataTableSchemaConflictPolicy', 'overwrite')
			.field('variableMissingMode', 'create-with-value')
			.field('variableConflictPolicy', 'overwrite')
			.field('variableParentPolicy', 'project')
			.field('tagMissingMode', 'do-nothing')
			.field('tagConflictPolicy', 'fail')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
		expect(response.body.workflows[0].localId).toBe('wf-http-source');
	});

	test('accepts overwrite-non-destructive as the data table schema conflict policy', async () => {
		const tarBuffer = await buildImportPackage();

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('projectId', ownerPersonalProject.id)
			.field('conflictPolicy', 'fail')
			.field('dataTableSchemaConflictPolicy', 'overwrite-non-destructive')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
	});

	test('accepts credentialMissingMode=create-with-values through the OpenAPI request validator', async () => {
		const tarBuffer = await buildImportPackage();
		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('projectId', ownerPersonalProject.id)
			.field('conflictPolicy', 'fail')
			.field('credentialMissingMode', 'create-with-values')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
		expect(response.body.credentials).toMatchObject({ seeded: [] });
	});

	test('rejects an unsupported dataTableMissingMode value', async () => {
		const tarBuffer = await buildImportPackage();

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('conflictPolicy', 'fail')
			.field('dataTableMissingMode', 'recreate')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(400);
	});

	test('returns 409 with conflict metadata when a workflow already exists under fail policy', async () => {
		const firstBuffer = await buildImportPackage();

		const first = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('credentialMatchingMode', 'id-only')
			.field('credentialMissingMode', 'must-preexist')
			.field('conflictPolicy', 'fail')
			.attach('package', firstBuffer, 'import.n8np');
		expect(first.statusCode).toBe(200);
		const existingWorkflowId = first.body.workflows[0].localId;

		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
		const secondBuffer = await buildImportPackage();
		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('credentialMatchingMode', 'id-only')
			.field('credentialMissingMode', 'must-preexist')
			.field('conflictPolicy', 'fail')
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
		expect(emitSpy).toHaveBeenCalledWith(
			'n8n-package-import-failed',
			expect.objectContaining({ reason: 'blocked' }),
		);
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
			.field('conflictPolicy', 'fail')
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

	const unknownNodeTypePackage = async (sourceId: string) =>
		await buildImportPackageBuffer(
			[
				serializedWorkflow({
					id: 'wf-unknown-node',
					name: 'Unknown Node Type',
					// Published in the source, so a publish-intent policy would publish it.
					publishedVersionId: WIRE_VERSION_ID,
					nodes: [
						{
							id: 'unknown-node',
							name: 'Unknown Node',
							type: 'n8n-nodes-community.chatBot',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
				}),
			],
			{ sourceId },
		);

	test('returns 422 by default when a workflow uses an unknown node type', async () => {
		const tarBuffer = await unknownNodeTypePackage('http-integration-missing-node-type-fail');

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('conflictPolicy', 'fail')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(422);
		expect(response.body).toMatchObject({
			message: expect.stringContaining('Import blocked'),
			issues: [
				{
					type: 'missing-node-type',
					nodeType: 'n8n-nodes-community.chatBot',
					typeVersion: 1,
					usedBy: [{ kind: 'workflow', id: 'wf-unknown-node' }],
				},
			],
		});
	});

	test('honors missingNodeTypeMode=import-anyway for a package with an unknown node type', async () => {
		const tarBuffer = await unknownNodeTypePackage('http-integration-missing-node-type-anyway');

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('conflictPolicy', 'fail')
			.field('missingNodeTypeMode', 'import-anyway')
			.field('publishingPolicy', 'match-source')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
		expect(response.body.workflows).toHaveLength(1);
		// match-source wanted to publish it, but the missing node type blocks that.
		expect(response.body.workflows[0].publishing).toEqual({
			state: 'blocked',
			blockedReason: 'missing-node-type',
		});
		expect(response.body.workflows[0].activeVersionId).toBeNull();
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
			.field('conflictPolicy', 'fail')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
		expect(response.body.credentials).toEqual({
			matched: [],
			stubbed: ['missing-credential'],
			seeded: [],
			incomplete: [],
			updated: [],
		});
		expect(response.body.bindings.credentials).toEqual({
			'missing-credential': expect.any(String),
		});
		expect(response.body.workflows).toHaveLength(1);
	});

	describe('credentialConflictPolicy', () => {
		const EXPRESSION = '={{ $vars.githubToken }}';
		let credential: CredentialsEntity;

		beforeEach(async () => {
			credential = await saveCredential(
				githubCredentialPayload({ name: 'GitHub', data: { accessToken: 'stored-secret' } }),
				{ project: ownerPersonalProject, role: 'credential:owner' },
			);
		});

		/** A package whose credential file renames the stored credential and adds an expression. */
		async function differingPackage() {
			return await buildImportPackageBuffer(
				[
					serializedWorkflowWithCredential({
						id: 'wf-uses-credential',
						name: 'Uses credential',
						credentialId: credential.id,
						credentialName: credential.name,
					}),
				],
				{
					sourceId: 'http-integration-credential-conflict',
					credentials: [
						serializedCredential({
							id: credential.id,
							name: 'Renamed',
							data: { user: EXPRESSION },
						}),
					],
				},
			);
		}

		async function stored() {
			const row = await Container.get(CredentialsRepository).findOneByOrFail({ id: credential.id });
			return { name: row.name, data: await Container.get(CredentialsService).decrypt(row, true) };
		}

		test('keeps a differing matched credential when the field is omitted', async () => {
			const tarBuffer = await differingPackage();
			const response = await authOwnerAgent
				.post('/n8n-packages/import')
				.field('conflictPolicy', 'fail')
				.attach('package', tarBuffer, 'import.n8np');

			expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
			expect(response.body.credentials).toMatchObject({ matched: [credential.id], updated: [] });
			expect(await stored()).toEqual({ name: 'GitHub', data: { accessToken: 'stored-secret' } });
		});

		test('writes the package name and values under overwrite, and lists the credential as updated', async () => {
			const tarBuffer = await differingPackage();
			const response = await authOwnerAgent
				.post('/n8n-packages/import')
				.field('conflictPolicy', 'fail')
				.field('credentialConflictPolicy', 'overwrite')
				.attach('package', tarBuffer, 'import.n8np');

			expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
			expect(response.body.credentials).toMatchObject({ matched: [], updated: [credential.id] });
			expect(await stored()).toEqual({
				name: 'Renamed',
				data: { accessToken: 'stored-secret', user: EXPRESSION },
			});
		});

		test('returns 409 with a credential-conflict issue under fail', async () => {
			const tarBuffer = await differingPackage();
			const response = await authOwnerAgent
				.post('/n8n-packages/import')
				.field('conflictPolicy', 'fail')
				.field('credentialConflictPolicy', 'fail')
				.attach('package', tarBuffer, 'import.n8np');

			expect(response.statusCode, JSON.stringify(response.body)).toBe(409);
			expect(response.body.issues).toEqual([
				expect.objectContaining({
					type: 'credential-conflict',
					kind: 'differs',
					targetId: credential.id,
				}),
			]);
			expect(await stored()).toEqual({ name: 'GitHub', data: { accessToken: 'stored-secret' } });
		});

		test('returns 403 under overwrite when the API key lacks credential:update', async () => {
			const limitedOwner = await createOwnerWithApiKey({ scopes: ['workflow:import'] });
			credential = await saveCredential(
				githubCredentialPayload({ name: 'GitHub', data: { accessToken: 'stored-secret' } }),
				{ user: limitedOwner, role: 'credential:owner' },
			);

			const tarBuffer = await differingPackage();
			const response = await testServer
				.publicApiAgentFor(limitedOwner)
				.post('/n8n-packages/import')
				.field('conflictPolicy', 'fail')
				.field('credentialConflictPolicy', 'overwrite')
				.attach('package', tarBuffer, 'import.n8np');

			expect(response.statusCode, JSON.stringify(response.body)).toBe(403);
			expect(await stored()).toEqual({ name: 'GitHub', data: { accessToken: 'stored-secret' } });
		});

		test('rejects an unsupported value', async () => {
			const tarBuffer = await differingPackage();
			const response = await authOwnerAgent
				.post('/n8n-packages/import')
				.field('conflictPolicy', 'fail')
				.field('credentialConflictPolicy', 'merge')
				.attach('package', tarBuffer, 'import.n8np');

			expect(response.statusCode).toBe(400);
		});
	});
});
