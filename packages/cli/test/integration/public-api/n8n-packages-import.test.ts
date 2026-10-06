import { EventService } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	randomCredentialPayload,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { CredentialTypes } from '@/credential-types';
import {
	buildEntityPackageBuffer,
	buildImportPackageBuffer,
	dataTableRequirement,
	serializedDataTable,
	serializedFolder,
	serializedProject,
	serializedWorkflow,
	serializedWorkflowWithCredential,
	serializedWorkflowWithDataTable,
	WIRE_VERSION_ID,
} from '@/modules/n8n-packages/__tests__/fixtures/package-fixtures';
import { TarPackageWriter } from '@/modules/n8n-packages/io/tar/tar-package-writer';
import { Telemetry } from '@/telemetry';

import { affixRoleToSaveCredential } from '../shared/db/credentials';
import { createFolder } from '../shared/db/folders';
import { createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import { getVariableByKey } from '../shared/db/variables';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

mockInstance(Telemetry);

// Must run before `setupTestServer`: registering the public API router eagerly constructs
// `N8nPackagesPublicController`'s DI graph (down to the credential matchers), which would
// otherwise capture the real `CredentialTypes` singleton before this mock replaces it.
const credentialTypesMock = mockInstance(CredentialTypes);
credentialTypesMock.recognizes.mockReturnValue(true);

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['data-table'],
});

/** Every scope a limited-role project member needs to import, minus the delete scopes under test. */
const IMPORT_MEMBER_ROLE_SCOPES = [
	'project:read',
	'project:list',
	'project:update',
	'workflow:create',
	'workflow:read',
	'workflow:update',
	'workflow:import',
	'workflow:list',
	'workflow:publish',
	'folder:create',
	'folder:read',
	'folder:update',
	'folder:list',
	'credential:read',
	'credential:list',
] as const;

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

const testWithAPIKey = (method: 'post', url: string, apiKey: string | null) => async () => {
	void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
	const response = await authOwnerAgent[method](url);
	expect(response.statusCode).toBe(401);
};

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
			exportedAt: new Date().toISOString(),
			sourceN8nVersion: '1.0.0',
			sourceId: 'http-integration-source',
			workflows: [{ id: wfId, name: 'HTTP Imported', target: `workflows/${wfId}` }],
			...(variable
				? {
						variables: [{ id: 'var-http-source', name: variable.name, target: variable.target }],
						requirements: {
							variables: [{ name: variable.name, usedByWorkflows: [wfId] }],
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

	test('rejects import when the API key lacks workflow:import scope', async () => {
		const limitedOwner = await createOwnerWithApiKey({ scopes: ['workflow:export'] });
		const tarBuffer = await buildImportPackage();

		const response = await testServer
			.publicApiAgentFor(limitedOwner)
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'fail')
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
			.field('workflowConflictPolicy', 'fail')
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
			.field('workflowConflictPolicy', 'fail')
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
			.field('workflowConflictPolicy', 'fail')
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
			.field('workflowConflictPolicy', 'fail')
			.field('workflowIdPolicy', 'new')
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
				workflows: { 'wf-http-source': expect.any(String) },
				credentials: {},
			},
			credentials: {
				matched: [],
				stubbed: [],
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

		expect(response.body.workflows[0].localId).not.toBe('wf-http-source');
	});

	test('creates a missing variable with the package value when variableMissingMode is omitted', async () => {
		testServer.license.enable('feat:variables');
		const tarBuffer = await buildImportPackage({
			variable: { name: 'API_URL', value: 'https://packaged.example.com' },
		});

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'fail')
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
			.field('bindings', '{}')
			.field('workflowConflictPolicy', 'fail')
			.field('workflowIdPolicy', 'new')
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
		expect(response.body.workflows[0].localId).not.toBe('wf-http-source');
	});

	test('accepts overwrite-non-destructive as the data table schema conflict policy', async () => {
		const tarBuffer = await buildImportPackage();

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('projectId', ownerPersonalProject.id)
			.field('workflowConflictPolicy', 'fail')
			.field('dataTableSchemaConflictPolicy', 'overwrite-non-destructive')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
	});

	test('rejects an unsupported dataTableMissingMode value', async () => {
		const tarBuffer = await buildImportPackage();

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'fail')
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
			.field('workflowConflictPolicy', 'fail')
			.attach('package', firstBuffer, 'import.n8np');
		expect(first.statusCode).toBe(200);
		const existingWorkflowId = first.body.workflows[0].localId;

		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
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
			.field('workflowConflictPolicy', 'fail')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(422);
		expect(response.body).toMatchObject({
			message: expect.stringContaining('Import blocked'),
			issues: [
				{
					type: 'missing-node-type',
					nodeType: 'n8n-nodes-community.chatBot',
					typeVersion: 1,
					usedByWorkflows: ['wf-unknown-node'],
				},
			],
		});
	});

	test('honors missingNodeTypeMode=import-anyway for a package with an unknown node type', async () => {
		const tarBuffer = await unknownNodeTypePackage('http-integration-missing-node-type-anyway');

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'fail')
			.field('missingNodeTypeMode', 'import-anyway')
			.field('workflowPublishingPolicy', 'match-source')
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

	test('returns 409 with workflow-id-conflict when the source id is already used in a different project', async () => {
		const p1 = await createTeamProject('P1', owner);
		const p2 = await createTeamProject('P2', owner);
		const firstBuffer = await buildImportPackageBuffer(
			[serializedWorkflow({ id: 'wf', name: 'Workflow' })],
			{ sourceId: 'id-conflict-1' },
		);
		const secondBuffer = await buildImportPackageBuffer(
			[serializedWorkflow({ id: 'wf', name: 'Workflow Clone' })],
			{ sourceId: 'id-conflict-2' },
		);

		const first = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('projectId', p1.id)
			.field('workflowConflictPolicy', 'fail')
			.field('workflowIdPolicy', 'source')
			.attach('package', firstBuffer, 'import.n8np');
		expect(first.statusCode).toBe(200);

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('projectId', p2.id)
			.field('workflowConflictPolicy', 'fail')
			.field('workflowIdPolicy', 'source')
			.attach('package', secondBuffer, 'import.n8np');

		expect(response.statusCode).toBe(409);
		expect(response.body).toStrictEqual({
			message: 'Import blocked: 1 issue(s) must be resolved before the package can be imported.',
			issues: [
				{
					type: 'workflow-id-conflict',
					sourceWorkflowId: 'wf',
					existingWorkflowId: 'wf',
					existingProjectId: p1.id,
					isArchived: false,
					name: 'Workflow',
				},
			],
		});
	});

	test('returns 409 with workflow-folder-conflict when a matched workflow would move to a different folder', async () => {
		testServer.license.enable('feat:folders');
		const folder = await createFolder(ownerPersonalProject, { name: 'Target Folder' });
		const firstBuffer = await buildImportPackageBuffer(
			[serializedWorkflow({ id: 'wf-root', name: 'Root Workflow' })],
			{ sourceId: 'folder-conflict-1' },
		);
		const secondBuffer = await buildImportPackageBuffer(
			[serializedWorkflow({ id: 'wf-root', name: 'Folder Workflow' })],
			{ sourceId: 'folder-conflict-2' },
		);

		const first = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'fail')
			.field('workflowIdPolicy', 'source')
			.attach('package', firstBuffer, 'import.n8np');
		expect(first.statusCode).toBe(200);

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('folderId', folder.id)
			.field('workflowConflictPolicy', 'new-version')
			.field('workflowIdPolicy', 'source')
			.attach('package', secondBuffer, 'import.n8np');

		expect(response.statusCode).toBe(409);
		expect(response.body).toStrictEqual({
			message: 'Import blocked: 1 issue(s) must be resolved before the package can be imported.',
			issues: [
				{
					type: 'workflow-folder-conflict',
					sourceWorkflowId: 'wf-root',
					existingWorkflowId: 'wf-root',
					existingParentFolderId: null,
					targetFolderId: folder.id,
					name: 'Root Workflow',
				},
			],
		});
	});

	test('returns 409 with folder-conflict (parent-mismatch) when a matched folder would move to a different parent', async () => {
		testServer.license.enable('feat:folders');
		const firstBuffer = await buildEntityPackageBuffer({
			sourceId: 'folder-parent-mismatch-1',
			folders: [{ target: 'folders/f', folder: serializedFolder({ id: 'F1', name: 'f' }) }],
		});
		const secondBuffer = await buildEntityPackageBuffer({
			sourceId: 'folder-parent-mismatch-2',
			folders: [{ target: 'folders/f', folder: serializedFolder({ id: 'F1', name: 'f' }) }],
		});

		const first = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'fail')
			.attach('package', firstBuffer, 'import.n8np');
		expect(first.statusCode).toBe(200);

		const anchor = await createFolder(ownerPersonalProject, { name: 'anchor' });

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('folderId', anchor.id)
			.field('workflowConflictPolicy', 'fail')
			.attach('package', secondBuffer, 'import.n8np');

		expect(response.statusCode).toBe(409);
		expect(response.body).toStrictEqual({
			message: 'Import blocked: 1 issue(s) must be resolved before the package can be imported.',
			issues: [
				{
					type: 'folder-conflict',
					kind: 'parent-mismatch',
					sourceFolderId: 'F1',
					name: 'f',
					existingParentFolderId: null,
					expectedParentFolderId: anchor.id,
				},
			],
		});
	});

	test('returns 422 with workflow-archive-forbidden when the caller may not change archive state', async () => {
		testServer.license.enable('feat:projectRole:admin');
		testServer.license.setQuota('quota:maxTeamProjects', 100);
		const project = await createTeamProject('Archive Target', owner);

		const limitedRole = await createCustomRoleWithScopeSlugs(
			IMPORT_MEMBER_ROLE_SCOPES.filter(
				(scope) => scope !== 'credential:read' && scope !== 'credential:list',
			),
			{ roleType: 'project' },
		);
		const member = await createMemberWithApiKey({ scopes: ['workflow:import', 'workflow:delete'] });
		await linkUserToProject(member, project, limitedRole.slug);

		const firstBuffer = await buildImportPackageBuffer(
			[serializedWorkflow({ id: 'wf-archive', name: 'Archive Me', isArchived: false })],
			{ sourceId: 'archive-forbidden-1' },
		);
		const secondBuffer = await buildImportPackageBuffer(
			[serializedWorkflow({ id: 'wf-archive', name: 'Archive Me', isArchived: true })],
			{ sourceId: 'archive-forbidden-2' },
		);

		const first = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('projectId', project.id)
			.field('workflowConflictPolicy', 'fail')
			.attach('package', firstBuffer, 'import.n8np');
		expect(first.statusCode).toBe(200);

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/n8n-packages/import')
			.field('projectId', project.id)
			.field('workflowConflictPolicy', 'new-version')
			.attach('package', secondBuffer, 'import.n8np');

		expect(response.statusCode).toBe(422);
		expect(response.body).toStrictEqual({
			message: 'Import blocked: 1 issue(s) must be resolved before the package can be imported.',
			issues: [
				{
					type: 'workflow-archive-forbidden',
					sourceWorkflowId: 'wf-archive',
					existingWorkflowId: 'wf-archive',
					name: 'Archive Me',
					projectId: project.id,
					transition: 'archive',
				},
			],
		});
	});

	test('returns 422 with workflow-removal-forbidden when the caller may not delete a reconciled-away workflow', async () => {
		testServer.license.enable('feat:projectRole:admin');
		testServer.license.enable('feat:folders');
		testServer.license.setQuota('quota:maxTeamProjects', 100);

		const packageBuffer = await buildEntityPackageBuffer({
			sourceId: 'removal-forbidden-source',
			projects: [
				{
					target: 'projects/p1',
					project: serializedProject({ id: 'RemovalForbiddenP1', name: 'P1' }),
				},
			],
			workflows: [
				{
					target: 'projects/p1/workflows/wf',
					workflow: serializedWorkflow({ id: 'WF', name: 'wf' }),
				},
			],
		});

		const first = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'new-version')
			.attach('package', packageBuffer, 'import.n8np');
		expect(first.statusCode).toBe(200);
		const project = await Container.get(ProjectRepository).findOneOrFail({
			where: { id: 'RemovalForbiddenP1' },
		});

		const stale = await createWorkflow({ name: 'Stale' }, project);

		const limitedRole = await createCustomRoleWithScopeSlugs(
			[...IMPORT_MEMBER_ROLE_SCOPES, 'folder:delete'],
			{ roleType: 'project' },
		);
		const member = await createMemberWithApiKey({
			scopes: [
				'workflow:import',
				'workflow:delete',
				'folder:delete',
				'project:create',
				'project:update',
			],
		});
		await linkUserToProject(member, project, limitedRole.slug);

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'new-version')
			.field('projectConflictPolicy', 'overwrite')
			.attach('package', packageBuffer, 'import.n8np');

		expect(response.statusCode).toBe(422);
		expect(response.body).toStrictEqual({
			message: 'Import blocked: 1 issue(s) must be resolved before the package can be imported.',
			issues: [
				{
					type: 'workflow-removal-forbidden',
					workflowId: stale.id,
					name: 'Stale',
					projectId: project.id,
				},
			],
		});
	});

	test('returns 422 with folder-removal-forbidden when the caller may not delete a reconciled-away folder', async () => {
		testServer.license.enable('feat:projectRole:admin');
		testServer.license.enable('feat:folders');
		testServer.license.setQuota('quota:maxTeamProjects', 100);

		const packageBuffer = await buildEntityPackageBuffer({
			sourceId: 'folder-removal-forbidden-source',
			projects: [
				{
					target: 'projects/p1',
					project: serializedProject({ id: 'FolderRemovalForbiddenP1', name: 'P1' }),
				},
			],
			folders: [
				{ target: 'projects/p1/folders/a', folder: serializedFolder({ id: 'FA', name: 'a' }) },
			],
			workflows: [
				{
					target: 'projects/p1/folders/a/workflows/wf',
					workflow: serializedWorkflow({ id: 'WF', name: 'wf' }),
				},
			],
		});

		const first = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'new-version')
			.attach('package', packageBuffer, 'import.n8np');
		expect(first.statusCode).toBe(200);
		const project = await Container.get(ProjectRepository).findOneOrFail({
			where: { id: 'FolderRemovalForbiddenP1' },
		});

		const empty = await createFolder(project, { name: 'empty' });

		const limitedRole = await createCustomRoleWithScopeSlugs(
			[...IMPORT_MEMBER_ROLE_SCOPES, 'workflow:delete'],
			{ roleType: 'project' },
		);
		const member = await createMemberWithApiKey({
			scopes: [
				'workflow:import',
				'workflow:delete',
				'folder:delete',
				'folder:create',
				'folder:update',
				'project:create',
				'project:update',
			],
		});
		await linkUserToProject(member, project, limitedRole.slug);

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'new-version')
			.field('projectConflictPolicy', 'overwrite')
			.attach('package', packageBuffer, 'import.n8np');

		expect(response.statusCode).toBe(422);
		expect(response.body).toStrictEqual({
			message: 'Import blocked: 1 issue(s) must be resolved before the package can be imported.',
			issues: [
				{
					type: 'folder-removal-forbidden',
					folderId: empty.id,
					name: 'empty',
					projectId: project.id,
				},
			],
		});
	});

	test('returns 422 with variable-unresolved when a referenced variable does not preexist', async () => {
		testServer.license.enable('feat:variables');
		const tarBuffer = await buildImportPackage({ variable: { name: 'MISSING_VAR', value: 'x' } });

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'fail')
			.field('variableMissingMode', 'must-preexist')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(422);
		expect(response.body).toStrictEqual({
			message: 'Import blocked: 1 issue(s) must be resolved before the package can be imported.',
			issues: [
				{ type: 'variable-unresolved', name: 'MISSING_VAR', usedByWorkflows: ['wf-http-source'] },
			],
		});
	});

	test('returns 422 with variable-limit-exceeded when creating a stub would exceed the instance quota', async () => {
		testServer.license.enable('feat:variables');
		testServer.license.setQuota('quota:maxVariables', 0);
		const tarBuffer = await buildImportPackage({
			variable: { name: 'OVER_QUOTA_VAR', value: 'x' },
		});

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'fail')
			.field('variableMissingMode', 'create-stub')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(422);
		expect(response.body).toStrictEqual({
			message: 'Import blocked: 1 issue(s) must be resolved before the package can be imported.',
			issues: [
				{
					type: 'variable-limit-exceeded',
					limit: 0,
					remaining: 0,
					requested: 1,
					names: ['OVER_QUOTA_VAR'],
					usedByWorkflows: ['wf-http-source'],
				},
			],
		});
	});

	test('returns 422 with credential-unresolved (type_mismatch) when an explicit binding targets a wrong-type credential', async () => {
		const teamProject = await createTeamProject('Credential Project', owner);
		const saveCredential = affixRoleToSaveCredential('credential:owner');
		const wrongType = await saveCredential(randomCredentialPayload({ type: 'slackApi' }), {
			project: teamProject,
		});

		const tarBuffer = await buildImportPackageBuffer(
			[
				serializedWorkflowWithCredential({
					id: 'wf-mismatch',
					name: 'Mismatch',
					credentialId: 'source-cred',
					credentialName: 'Source',
				}),
			],
			{ sourceId: 'credential-type-mismatch' },
		);

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('projectId', teamProject.id)
			.field('workflowConflictPolicy', 'fail')
			.field('credentialMatchingMode', 'type-only')
			.field('bindings', JSON.stringify({ credentials: { 'source-cred': wrongType.id } }))
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(422);
		expect(response.body).toStrictEqual({
			message: 'Import blocked: 1 issue(s) must be resolved before the package can be imported.',
			issues: [
				{
					type: 'credential-unresolved',
					kind: 'type_mismatch',
					sourceId: 'source-cred',
					targetId: wrongType.id,
					expectedType: 'githubApi',
					actualType: 'slackApi',
					usedByWorkflows: ['wf-mismatch'],
				},
			],
		});
	});

	test('returns 422 with data-table-unresolved (missing) when a referenced table does not preexist', async () => {
		const table = serializedDataTable({ id: 'dtmissing', name: 'Missing Table' });

		const tarBuffer = await buildEntityPackageBuffer({
			sourceId: 'data-table-missing-source',
			workflows: [
				{
					target: 'workflows/wf',
					workflow: serializedWorkflowWithDataTable({
						id: 'wf-dt',
						name: 'DT Workflow',
						dataTableId: table.id,
					}),
				},
			],
			dataTables: [{ target: 'data-tables/dt', dataTable: table }],
			manifestExtras: { requirements: { dataTables: [dataTableRequirement(table, ['wf-dt'])] } },
		});

		const response = await authOwnerAgent
			.post('/n8n-packages/import')
			.field('workflowConflictPolicy', 'fail')
			.field('dataTableMissingMode', 'must-preexist')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(422);
		expect(response.body).toStrictEqual({
			message: 'Import blocked: 1 issue(s) must be resolved before the package can be imported.',
			issues: [
				{
					type: 'data-table-unresolved',
					kind: 'missing',
					sourceId: 'dtmissing',
					name: 'Missing Table',
					usedByWorkflows: ['wf-dt'],
				},
			],
		});
	});
});
