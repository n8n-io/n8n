import { LicenseState } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { CredentialsEntity, Project, User } from '@n8n/db';
import {
	CredentialsRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { jsonParse, type INode, type IWorkflowSettings } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { saveCredential } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initCredentialsTypes, initNodeTypes } from '@test-integration/utils';

import {
	buildImportPackageBuffer,
	serializedWorkflow,
} from '../../__tests__/fixtures/package-fixtures';
import { unpackTar } from '../../__tests__/utils/tar-support';
import { PackageImportConfig } from '../../n8n-packages.config';
import type { PackageManifest } from '../../spec/manifest.schema';
import { packageSizeLimitMessage } from '../base64-limits';
import {
	exportTool,
	exported,
	httpNode,
	importTool,
	imported,
	storedWorkflow,
	textOf,
	workflowCountIn,
} from './workflow-package-test-helpers';

const licenseMocker = new LicenseMocker();

mockInstance(ActiveWorkflowManager);

const communityNode: INode = {
	id: 'acme-1',
	name: 'Acme CRM',
	type: 'n8n-nodes-acme.acmeCrm',
	typeVersion: 2,
	position: [200, 0],
	parameters: {},
};

let owner: User;
let member: User;
let sourceProject: Project;
let targetProject: Project;
let viewerProject: Project;
let credential: CredentialsEntity;
let secretValue: string;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	await initNodeTypes();
	await initCredentialsTypes();
	licenseMocker.mockLicenseState(Container.get(LicenseState));
	licenseMocker.setDefaults({
		features: ['feat:projectRole:admin', 'feat:projectRole:editor', 'feat:projectRole:viewer'],
		quotas: { 'quota:maxTeamProjects': 100 },
	});
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedWorkflow',
		'SharedCredentials',
		'CredentialsEntity',
		'ProjectRelation',
		'Project',
		'User',
	]);
	Container.set(PackageImportConfig, new PackageImportConfig());

	owner = await createOwner();
	member = await createMember();
	sourceProject = await createTeamProject('Sales', owner);
	targetProject = await createTeamProject('Cloud automations', owner);
	viewerProject = await createTeamProject('Read only', owner);
	await linkUserToProject(member, targetProject, 'project:editor');
	await linkUserToProject(member, viewerProject, 'project:viewer');

	secretValue = randomBytes(16).toString('hex');
	credential = await saveCredential(
		{
			name: 'Stripe API',
			type: 'httpHeaderAuth',
			data: { name: 'Authorization', value: secretValue },
		},
		{ project: sourceProject, role: 'credential:owner' },
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

/** A node whose parameters make the workflow file of a package large. */
const largeSetNode = (bytes: number): INode => ({
	id: 'set-large',
	name: 'Large value',
	type: 'n8n-nodes-base.set',
	typeVersion: 1,
	position: [400, 0],
	parameters: { values: { string: [{ name: 'body', value: 'x'.repeat(bytes) }] } },
});

const createSourceWorkflow = async (nodes: INode[], settings: IWorkflowSettings = {}) =>
	await createWorkflow(
		{
			name: 'Daily report',
			nodes,
			connections: {},
			settings: { availableInMCP: true, ...settings },
		},
		sourceProject,
	);

describe('export_workflow_package and import_workflow_package', () => {
	it('copies a workflow to another project, and a second import updates the same workflow', async () => {
		const source = await createSourceWorkflow([httpNode(credential)]);

		const pkg = exported(await exportTool(owner, source.id));

		expect(pkg.workflowName).toBe('Daily report');
		expect(pkg.sizeBytes).toBe(Buffer.from(pkg.packageBase64, 'base64').length);
		expect(pkg.requirements).toEqual({
			nodeTypes: ['n8n-nodes-base.httpRequest@1'],
			credentials: [{ name: 'Stripe API', type: 'httpHeaderAuth' }],
		});
		expect(pkg.warnings).toEqual([]);

		const firstResult = await importTool(member, {
			packageBase64: pkg.packageBase64,
			projectId: targetProject.id,
		});
		const first = imported(firstResult);

		expect(first.created).toBe(true);
		expect(first.published).toBe(false);
		expect(first.workflowName).toBe('Daily report');
		expect(first.workflowId).not.toBe(source.id);
		expect(first.missingNodeTypes).toEqual([]);
		expect(first.warnings).toEqual([]);
		expect(first.credentialsNeedingSetup).toEqual([
			{ name: 'Stripe API', type: 'httpHeaderAuth', id: expect.any(String) },
		]);
		const [stub] = first.credentialsNeedingSetup;
		expect(textOf(firstResult)).toBe(
			`Created workflow "Daily report" (${first.workflowId}). The import created 1 empty credential(s). Set them up before the workflow runs: Stripe API (httpHeaderAuth).`,
		);

		// The workflow lives in the target project and points at the new stub credential.
		expect(stub.id).not.toBe(credential.id);
		const copy = await storedWorkflow(first.workflowId);
		expect(copy.sourceWorkflowId).toBe(source.id);
		expect(copy.activeVersionId).toBeNull();
		expect(copy.nodes[0].credentials).toEqual({
			httpHeaderAuth: { id: stub.id, name: 'Stripe API' },
		});
		const sharing = await Container.get(SharedWorkflowRepository).findOneByOrFail({
			workflowId: first.workflowId,
		});
		expect(sharing.projectId).toBe(targetProject.id);
		const stubSharing = await Container.get(SharedCredentialsRepository).findOneByOrFail({
			credentialsId: stub.id,
		});
		expect(stubSharing.projectId).toBe(targetProject.id);

		const second = imported(
			await importTool(member, { packageBase64: pkg.packageBase64, projectId: targetProject.id }),
		);

		expect(second.workflowId).toBe(first.workflowId);
		expect(second.created).toBe(false);
		// The copy keeps the stub of the first import, which still holds no value.
		expect(second.credentialsNeedingSetup).toEqual([stub]);
		expect(await workflowCountIn(targetProject)).toBe(1);
		expect(await Container.get(CredentialsRepository).countBy({ type: 'httpHeaderAuth' })).toBe(2);
	});

	// Packages leave out `sourceWorkflowId`, so the copy has its own lineage on the way back.
	it('pulls a copy back as a separate workflow, and a second pull updates that one', async () => {
		const source = await createSourceWorkflow([httpNode(credential)]);
		const pushed = exported(await exportTool(owner, source.id));
		const copy = imported(
			await importTool(member, {
				packageBase64: pushed.packageBase64,
				projectId: targetProject.id,
			}),
		);

		const pulled = exported(await exportTool(member, copy.workflowId));
		const first = imported(
			await importTool(owner, { packageBase64: pulled.packageBase64, projectId: sourceProject.id }),
		);
		const second = imported(
			await importTool(owner, { packageBase64: pulled.packageBase64, projectId: sourceProject.id }),
		);

		expect(first.created).toBe(true);
		expect(first.workflowId).not.toBe(source.id);
		// The second pull keeps the credential that the copy uses, so it does not name it again.
		expect(second).toEqual({ ...first, created: false, warnings: [] });
		// The original credential matches by name and type in the source project, and the result
		// names it, so that the user can check which secret the copy uses.
		expect(first.credentialsNeedingSetup).toEqual([]);
		expect(first.warnings).toEqual([
			`The workflow now uses 1 credential(s) that this instance already had with the same name and type: Stripe API (httpHeaderAuth, ID ${credential.id}). Make sure that they are the right ones before the workflow runs.`,
		]);
		expect(await workflowCountIn(sourceProject)).toBe(2);
	});

	it('puts no credential data in the package', async () => {
		const source = await createSourceWorkflow([httpNode(credential)]);

		const pkg = exported(await exportTool(owner, source.id));

		const entries = await unpackTar(Buffer.from(pkg.packageBase64, 'base64'));
		const manifest = jsonParse<PackageManifest>(
			entries.find((entry) => entry.name === 'manifest.json')?.content.toString() ?? '{}',
		);
		const target = manifest.credentials?.[0]?.target;
		const credentialFile = entries.find((entry) => entry.name === `${target}/credential.json`);
		expect(jsonParse(credentialFile?.content.toString() ?? '{}')).toEqual({
			id: credential.id,
			name: 'Stripe API',
			type: 'httpHeaderAuth',
		});
		for (const entry of entries) {
			expect(entry.content.includes(secretValue)).toBe(false);
		}
	});

	it('imports into the personal project when no project is given', async () => {
		const source = await createSourceWorkflow([httpNode(credential)]);
		const pkg = exported(await exportTool(owner, source.id));

		const result = imported(await importTool(member, { packageBase64: pkg.packageBase64 }));

		const personal = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			member.id,
		);
		expect(result.created).toBe(true);
		expect(await workflowCountIn(personal)).toBe(1);
	});

	it('reports node types that this instance does not have, and imports the workflow anyway', async () => {
		const source = await createSourceWorkflow([httpNode(credential), communityNode]);
		const pkg = exported(await exportTool(owner, source.id));

		expect(pkg.requirements.nodeTypes).toEqual([
			'n8n-nodes-acme.acmeCrm@2',
			'n8n-nodes-base.httpRequest@1',
		]);

		const result = await importTool(member, {
			packageBase64: pkg.packageBase64,
			projectId: targetProject.id,
		});

		expect(imported(result).missingNodeTypes).toEqual(['n8n-nodes-acme.acmeCrm@2']);
		expect(imported(result).created).toBe(true);
		expect(textOf(result)).toContain(
			'This instance does not have 1 node type(s) that the workflow uses: n8n-nodes-acme.acmeCrm@2.',
		);
	});

	it('imports only the package of the expected source workflow', async () => {
		const source = await createSourceWorkflow([httpNode(credential)]);
		const pkg = exported(await exportTool(owner, source.id));

		const result = await importTool(member, {
			packageBase64: pkg.packageBase64,
			projectId: targetProject.id,
			sourceWorkflowId: 'another-workflow',
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toBe(
			`The package contains workflow "${source.id}", not workflow "another-workflow".`,
		);
		expect(await workflowCountIn(targetProject)).toBe(0);
	});

	it('copies a workflow that has an error workflow and says that the package does not hold it', async () => {
		const errorWorkflow = await createWorkflow(
			{ name: 'Alert the team', nodes: [], connections: {} },
			sourceProject,
		);
		const source = await createSourceWorkflow([httpNode(credential)], {
			errorWorkflow: errorWorkflow.id,
		});

		const result = await exportTool(owner, source.id);
		const pkg = exported(result);
		const copy = imported(
			await importTool(member, { packageBase64: pkg.packageBase64, projectId: targetProject.id }),
		);

		const label = `"Alert the team" (${errorWorkflow.id})`;
		const warning = `The package does not hold the error workflow ${label}. A new copy keeps the link only if the user who imports it can use that workflow there. Otherwise, choose an error workflow in the settings of the copy.`;
		expect(pkg.warnings).toEqual([warning]);
		expect(textOf(result)).toContain(warning);
		expect(copy.created).toBe(true);
		// The member cannot open the error workflow of the source project, so the copy has no link.
		expect(copy.warnings).toEqual([
			`The import removed the link to the error workflow ${label}, because it is not on this instance or you cannot open it. Choose an error workflow in the workflow settings.`,
		]);
		expect((await storedWorkflow(copy.workflowId)).settings?.errorWorkflow).toBeUndefined();
		expect(await workflowCountIn(targetProject)).toBe(1);
	});

	// Settings such as binaryMode change how the workflow runs, so the copy keeps them.
	it('keeps the workflow settings of the package', async () => {
		const settings: IWorkflowSettings = {
			timezone: 'Europe/Berlin',
			binaryMode: 'separate',
			executionOrder: 'v1',
			saveManualExecutions: false,
			callerPolicy: 'workflowsFromSameOwner',
		};
		const source = await createSourceWorkflow([httpNode(credential)], settings);
		const pkg = exported(await exportTool(owner, source.id));

		const copy = imported(
			await importTool(member, { packageBase64: pkg.packageBase64, projectId: targetProject.id }),
		);

		expect((await storedWorkflow(copy.workflowId)).settings).toEqual(
			expect.objectContaining({ ...settings, availableInMCP: true }),
		);
	});
});

describe('export_workflow_package errors', () => {
	it('gives a tool error to a user who cannot read the workflow', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const source = await createSourceWorkflow([httpNode(credential)]);

		const result = await exportTool(member, source.id);

		expect(result.isError).toBe(true);
		expect(textOf(result)).toBe("Workflow not found or you don't have permission to access it.");
		// MCP clients check structured content against the output schema of a success.
		expect(result.structuredContent).toBeUndefined();
		expect(emit).toHaveBeenCalledWith('n8n-package-export-failed', {
			user: member,
			reason: 'entity-not-found',
			workflowIds: [source.id],
		});
		expect(emit).not.toHaveBeenCalledWith('n8n-package-exported', expect.anything());
	});

	it('gives a tool error for a workflow that is not available in MCP', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const source = await createSourceWorkflow([httpNode(credential)], { availableInMCP: false });

		const result = await exportTool(owner, source.id);

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain('Workflow is not available in MCP.');
		expect(emit).toHaveBeenCalledWith('n8n-package-export-failed', {
			user: owner,
			reason: 'access-denied',
			workflowIds: [source.id],
		});
	});

	it('gives a tool error that names a sub-workflow the package cannot hold', async () => {
		const child = await createWorkflow(
			{ name: 'Child', nodes: [], connections: {} },
			sourceProject,
		);
		const parent = await createSourceWorkflow([
			{
				id: 'call-1',
				name: 'Call child',
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1,
				position: [0, 0],
				parameters: { workflowId: child.id },
			},
		]);

		const result = await exportTool(owner, parent.id);

		expect(result.isError).toBe(true);
		expect(textOf(result)).toBe(
			`The workflow calls 1 sub-workflow(s) by a fixed ID, and a package holds one workflow only. Export aborted. Sub-workflow IDs: ${child.id}`,
		);
	});

	it('gives a tool error, and logs only a failure, when the package is over the size limit', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		Container.get(PackageImportConfig).maxUncompressedBytes = 64;
		const source = await createSourceWorkflow([httpNode(credential)]);

		const result = await exportTool(owner, source.id);

		expect(result.isError).toBe(true);
		expect(textOf(result)).toBe(
			packageSizeLimitMessage({ maxBytes: 64, setting: 'N8N_IMPORT_MAX_UNCOMPRESSED_BYTES' }),
		);
		expect(emit).toHaveBeenCalledWith('n8n-package-export-failed', {
			user: owner,
			reason: 'blocked',
			workflowIds: [source.id],
		});
		expect(emit).not.toHaveBeenCalledWith('n8n-package-exported', expect.anything());
	});

	it('gives a tool error that names the setting when one file is over the limit of the import', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		Container.get(PackageImportConfig).maxEntryBytes = 4 * 1024;
		const source = await createSourceWorkflow([largeSetNode(8 * 1024)]);

		const result = await exportTool(owner, source.id);

		expect(result.isError).toBe(true);
		expect(textOf(result)).toMatch(
			/^The workflow package has a file of \d+KB \("workflows\/[^"]+\/workflow\.json"\), and the limit for one file of a package is 4KB\. An admin can change the limit with N8N_IMPORT_MAX_ENTRY_BYTES\.$/,
		);
		expect(emit).toHaveBeenCalledWith('n8n-package-export-failed', {
			user: owner,
			reason: 'blocked',
			workflowIds: [source.id],
		});
	});

	it('logs one export with the counts of the package', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const source = await createSourceWorkflow([httpNode(credential)]);

		exported(await exportTool(owner, source.id));

		const exportEvents = emit.mock.calls.filter(([name]) => name === 'n8n-package-exported');
		expect(exportEvents).toEqual([
			[
				'n8n-package-exported',
				{
					user: owner,
					workflowIds: [source.id],
					counts: expect.objectContaining({ workflows: 1, credentials: 1, folders: 0 }),
					credentialExportPolicy: 'no-values',
					includeArchivedWorkflows: false,
				},
			],
		]);
	});
});

describe('import_workflow_package errors', () => {
	it('gives a tool error for a project where the user cannot create workflows', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const source = await createSourceWorkflow([httpNode(credential)]);
		const pkg = exported(await exportTool(owner, source.id));

		const result = await importTool(member, {
			packageBase64: pkg.packageBase64,
			projectId: viewerProject.id,
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toBe(
			'The project does not exist, or you do not have permission to create workflows in it.',
		);
		expect(await workflowCountIn(viewerProject)).toBe(0);
		expect(emit).toHaveBeenCalledWith('n8n-package-import-failed', {
			user: member,
			reason: 'access-denied',
			projectId: viewerProject.id,
		});
	});

	it('gives the same tool error for a project that does not exist', async () => {
		const source = await createSourceWorkflow([httpNode(credential)]);
		const pkg = exported(await exportTool(owner, source.id));

		const result = await importTool(member, {
			packageBase64: pkg.packageBase64,
			projectId: 'no-such-project',
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toBe(
			'The project does not exist, or you do not have permission to create workflows in it.',
		);
	});

	it('rejects an oversized package before it decodes it', async () => {
		Container.get(PackageImportConfig).maxUncompressedBytes = 1024;
		// Not base64 at all: a decode before the size check would report invalid base64 instead.
		const oversized = '*'.repeat(4 * 1024);

		const result = await importTool(member, { packageBase64: oversized });

		expect(result.isError).toBe(true);
		expect(textOf(result)).toBe(
			packageSizeLimitMessage({ maxBytes: 1024, setting: 'N8N_IMPORT_MAX_UNCOMPRESSED_BYTES' }),
		);
	});

	it('names the setting when a file of the package is over the limit of this instance', async () => {
		const source = await createSourceWorkflow([largeSetNode(8 * 1024)]);
		const pkg = exported(await exportTool(owner, source.id));
		Container.get(PackageImportConfig).maxEntryBytes = 4 * 1024;

		const result = await importTool(member, {
			packageBase64: pkg.packageBase64,
			projectId: targetProject.id,
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toMatch(
			/^Package entry "workflows\/[^"]+\/workflow\.json" exceeds the maximum allowed uncompressed size per entry\. An admin can change the limit with N8N_IMPORT_MAX_ENTRY_BYTES\.$/,
		);
		expect(await workflowCountIn(targetProject)).toBe(0);
	});

	it('gives a tool error for text that is not a package', async () => {
		const result = await importTool(member, {
			packageBase64: Buffer.from('not a package').toString('base64'),
			projectId: targetProject.id,
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toBe('Failed to read package archive');
		expect(await workflowCountIn(targetProject)).toBe(0);
	});

	it('gives a tool error for a package with an archived workflow', async () => {
		const packageBuffer = await buildImportPackageBuffer([
			serializedWorkflow({ id: 'wf-archived', name: 'Old report', isArchived: true }),
		]);

		const result = await importTool(member, {
			packageBase64: packageBuffer.toString('base64'),
			projectId: targetProject.id,
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toBe(
			'The package holds an archived workflow. Restore the workflow, then export it again.',
		);
		expect(await workflowCountIn(targetProject)).toBe(0);
	});
});
