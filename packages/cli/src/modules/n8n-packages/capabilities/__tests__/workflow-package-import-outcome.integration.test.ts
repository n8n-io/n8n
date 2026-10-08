import { LicenseState } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User, WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, IWorkflowSettings } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { saveCredential } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initCredentialsTypes, initNodeTypes } from '@test-integration/utils';

import { PackageImportConfig } from '../../n8n-packages.config';
import { instanceMcpPackageSizeLimit } from '../mcp-package-size-limit';
import { importWorkflowPackage } from '../workflow-package-import';
import {
	exportTool,
	exported,
	httpNode,
	importTool,
	imported,
	publish,
	saveNewVersion,
	storedWorkflow,
	textOf,
} from './workflow-package-test-helpers';

const licenseMocker = new LicenseMocker();

mockInstance(ActiveWorkflowManager);

let owner: User;
let member: User;
let sourceProject: Project;
let targetProject: Project;

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
		'WorkflowPublicationOutbox',
		'WorkflowPublishHistory',
		'WorkflowPublishedVersion',
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
	await linkUserToProject(member, targetProject, 'project:editor');
});

afterEach(() => {
	vi.restoreAllMocks();
});

const errorTriggerNode: INode = {
	id: 'error-trigger',
	name: 'Error Trigger',
	type: 'n8n-nodes-base.errorTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const communityNode: INode = {
	id: 'acme-1',
	name: 'Acme CRM',
	type: 'n8n-nodes-acme.acmeCrm',
	typeVersion: 2,
	position: [200, 0],
	parameters: {},
};

const setNode = (value: string): INode => ({
	id: 'set-1',
	name: 'Set',
	type: 'n8n-nodes-base.set',
	typeVersion: 1,
	position: [400, 0],
	parameters: { values: { string: [{ name: 'url', value }] } },
});

const mcpSettings: IWorkflowSettings = { availableInMCP: true };

/** A published workflow of the source project with a trigger, as the editor saves it. */
const createPublishedSource = async (extraNodes: INode[] = []) => {
	const source = await createActiveWorkflow(
		{ name: 'Daily report', settings: mcpSettings },
		sourceProject,
	);
	if (extraNodes.length > 0) {
		await publish(source.id, await saveNewVersion(source, [...source.nodes, ...extraNodes]));
	}
	return await storedWorkflow(source.id);
};


/** Exports the source, imports it as the member, and publishes the copy. */
async function createPublishedCopy(source: WorkflowEntity) {
	const { packageBase64 } = exported(await exportTool(owner, source.id));
	const first = imported(await importTool(member, { packageBase64, projectId: targetProject.id }));
	const copy = await storedWorkflow(first.workflowId);
	await publish(copy.id, copy.versionId);
	return copy;
}

const reimport = async (source: WorkflowEntity) => {
	const { packageBase64 } = exported(await exportTool(owner, source.id));
	return await importTool(member, { packageBase64, projectId: targetProject.id });
};

const changedNodes = (source: WorkflowEntity) =>
	source.nodes.map((node) => (node.name === 'Set' ? setNode('https://example.com/v2') : node));

describe('import_workflow_package and the live version of a published copy', () => {
	it('puts the new version live when the source publishes it, and says so', async () => {
		const source = await createPublishedSource();
		const copy = await createPublishedCopy(source);
		await publish(source.id, await saveNewVersion(source, changedNodes(source)));

		const result = await reimport(source);

		const output = imported(result);
		const stored = await storedWorkflow(copy.id);
		expect(output).toMatchObject({ workflowId: copy.id, created: false, published: true });
		expect(stored.activeVersionId).toBe(stored.versionId);
		expect(stored.activeVersionId).not.toBe(copy.activeVersionId);
		expect(output.warnings).toEqual([
			'The workflow was published, so the import published the new version. The new version is live now.',
		]);
		expect(textOf(result)).toContain('The new version is live now.');
	});

	it('keeps the earlier version live when the source does not publish the new one', async () => {
		const source = await createPublishedSource();
		const copy = await createPublishedCopy(source);
		await saveNewVersion(source, changedNodes(source));

		const output = imported(await reimport(source));

		const stored = await storedWorkflow(copy.id);
		expect(output).toMatchObject({ created: false, published: true });
		expect(stored.activeVersionId).toBe(copy.versionId);
		expect(stored.versionId).not.toBe(copy.versionId);
		expect(output.warnings).toEqual([
			'The new version is not live, because the source workflow does not publish this version. Publish the workflow to make it live. An earlier version stays live.',
		]);
	});

	it('keeps the earlier version live and gives the error when the publish fails', async () => {
		const source = await createPublishedSource();
		const copy = await createPublishedCopy(source);
		await publish(source.id, await saveNewVersion(source, changedNodes(source)));
		vi.spyOn(Container.get(WorkflowService), 'activateWorkflow').mockRejectedValueOnce(
			new Error('The webhook path is in use'),
		);

		const output = imported(await reimport(source));

		expect(output).toMatchObject({ created: false, published: true });
		expect((await storedWorkflow(copy.id)).activeVersionId).toBe(copy.versionId);
		expect(output.warnings).toEqual([
			'The new version is not live, because the import could not publish it: The webhook path is in use. An earlier version stays live.',
		]);
	});

	it('keeps the earlier version live when this instance lacks a node type of the new one', async () => {
		const source = await createPublishedSource([communityNode]);
		const copy = await createPublishedCopy(source);
		await publish(source.id, await saveNewVersion(source, changedNodes(source)));

		const output = imported(await reimport(source));

		expect(output.missingNodeTypes).toEqual(['n8n-nodes-acme.acmeCrm@2']);
		expect((await storedWorkflow(copy.id)).activeVersionId).toBe(copy.versionId);
		expect(output.warnings).toEqual([
			'The new version is not live, because this instance does not have all the node types that it uses. An earlier version stays live.',
		]);
	});

	it('says nothing about publishing when the same package is imported again', async () => {
		const source = await createPublishedSource();
		const copy = await createPublishedCopy(source);

		const output = imported(await reimport(source));

		expect(output).toMatchObject({ created: false, published: true, warnings: [] });
		expect((await storedWorkflow(copy.id)).activeVersionId).toBe(copy.versionId);
	});
});

describe('import_workflow_package and the error workflow link', () => {
	const createErrorWorkflow = async (
		project: Project,
		name: string,
		settings: IWorkflowSettings = mcpSettings,
	) =>
		await createActiveWorkflow(
			{
				name,
				nodes: [errorTriggerNode],
				connections: {},
				settings: { callerPolicy: 'any', ...settings },
			},
			project,
		);

	const exportWithErrorWorkflow = async (errorWorkflowId: string) => {
		const source = await createWorkflow(
			{
				name: 'Daily report',
				nodes: [],
				connections: {},
				settings: { ...mcpSettings, errorWorkflow: errorWorkflowId },
			},
			sourceProject,
		);
		return exported(await exportTool(owner, source.id)).packageBase64;
	};

	it('keeps the link when the importing user can use the error workflow', async () => {
		const handler = await createErrorWorkflow(sourceProject, 'Alert the team');
		const packageBase64 = await exportWithErrorWorkflow(handler.id);

		const output = imported(
			await importTool(owner, { packageBase64, projectId: targetProject.id }),
		);

		expect(output.warnings).toEqual([]);
		expect((await storedWorkflow(output.workflowId)).settings?.errorWorkflow).toBe(handler.id);
	});

	it('removes the link to an error workflow that is not available in MCP, as update_workflow does', async () => {
		const handler = await createErrorWorkflow(sourceProject, 'Alert the team', {});
		const packageBase64 = await exportWithErrorWorkflow(handler.id);

		const output = imported(
			await importTool(owner, { packageBase64, projectId: targetProject.id }),
		);

		expect(output.warnings).toEqual([
			`The import removed the link to the error workflow "Alert the team" (${handler.id}), because it is not available in MCP. Choose an error workflow in the workflow settings.`,
		]);
		expect((await storedWorkflow(output.workflowId)).settings?.errorWorkflow).toBeUndefined();
	});

	it('removes the link to an error workflow that is not published, and says why', async () => {
		const handler = await createWorkflow(
			{ name: 'Draft alert', nodes: [errorTriggerNode], connections: {} },
			sourceProject,
		);
		const packageBase64 = await exportWithErrorWorkflow(handler.id);

		const output = imported(
			await importTool(owner, { packageBase64, projectId: targetProject.id }),
		);

		expect(output.warnings).toEqual([
			`The import removed the link to the error workflow "Draft alert" (${handler.id}), because it is not published. Choose an error workflow in the workflow settings.`,
		]);
		const settings = (await storedWorkflow(output.workflowId)).settings;
		expect(settings?.errorWorkflow).toBeUndefined();
		expect(settings?.availableInMCP).toBe(true);
	});

	it('keeps the error workflow that the copy has when the same package is imported again', async () => {
		const handler = await createErrorWorkflow(sourceProject, 'Alert the team');
		const packageBase64 = await exportWithErrorWorkflow(handler.id);
		const first = imported(
			await importTool(member, { packageBase64, projectId: targetProject.id }),
		);
		const ownHandler = await createErrorWorkflow(targetProject, 'Alert the cloud team');
		await Container.get(WorkflowRepository).update(
			{ id: first.workflowId },
			{ settings: { ...mcpSettings, errorWorkflow: ownHandler.id } },
		);

		const second = imported(
			await importTool(member, { packageBase64, projectId: targetProject.id }),
		);

		expect(second).toMatchObject({ workflowId: first.workflowId, created: false, warnings: [] });
		expect((await storedWorkflow(first.workflowId)).settings?.errorWorkflow).toBe(ownHandler.id);
	});

	it('does not link the copy again when a re-import brings back an unusable link', async () => {
		const handler = await createErrorWorkflow(sourceProject, 'Alert the team');
		const packageBase64 = await exportWithErrorWorkflow(handler.id);
		const first = imported(
			await importTool(member, { packageBase64, projectId: targetProject.id }),
		);

		const second = imported(
			await importTool(member, { packageBase64, projectId: targetProject.id }),
		);

		expect(first.warnings).toHaveLength(1);
		expect(second).toMatchObject({ workflowId: first.workflowId, created: false, warnings: [] });
		expect((await storedWorkflow(first.workflowId)).settings?.errorWorkflow).toBeUndefined();
	});
});

describe('import_workflow_package and what the copy uses', () => {
	it('names the variables that the package does not carry and this instance does not have', async () => {
		const source = await createWorkflow(
			{
				name: 'Uses vars',
				nodes: [setNode('={{ $vars.API_URL }}')],
				connections: {},
				settings: mcpSettings,
			},
			sourceProject,
		);

		const pkg = exported(await exportTool(owner, source.id));
		const output = imported(
			await importTool(member, { packageBase64: pkg.packageBase64, projectId: targetProject.id }),
		);

		expect(pkg.warnings).toEqual([
			'The workflow uses 1 variable(s): API_URL. The package holds their names, but not their values. Make sure that the instance that imports the package has them.',
		]);
		expect(output.warnings).toEqual([
			'The workflow uses 1 variable(s) that this instance does not have: API_URL. Create them before the workflow runs.',
		]);
	});

	it('names an existing credential of the target project that the copy now uses', async () => {
		const sourceCredential = await saveCredential(
			{
				name: 'Header Auth account',
				type: 'httpHeaderAuth',
				data: { name: 'Authorization', value: randomBytes(16).toString('hex') },
			},
			{ project: sourceProject, role: 'credential:owner' },
		);
		const targetCredential = await saveCredential(
			{
				name: 'Header Auth account',
				type: 'httpHeaderAuth',
				data: { name: 'Authorization', value: randomBytes(16).toString('hex') },
			},
			{ project: targetProject, role: 'credential:owner' },
		);
		const source = await createWorkflow(
			{
				name: 'Daily report',
				nodes: [httpNode(sourceCredential)],
				connections: {},
				settings: mcpSettings,
			},
			sourceProject,
		);

		const pkg = exported(await exportTool(owner, source.id));
		const output = imported(
			await importTool(member, { packageBase64: pkg.packageBase64, projectId: targetProject.id }),
		);

		expect(output.credentialsNeedingSetup).toEqual([]);
		expect(output.warnings).toEqual([
			`The workflow now uses 1 credential(s) that this instance already had with the same name and type: Header Auth account (httpHeaderAuth, ID ${targetCredential.id}). Make sure that they are the right ones before the workflow runs.`,
		]);
		expect((await storedWorkflow(output.workflowId)).nodes[0].credentials).toEqual({
			httpHeaderAuth: { id: targetCredential.id, name: 'Header Auth account' },
		});
	});
});

describe('steps after the import', () => {
	const exportSource = async () => {
		const source = await createWorkflow(
			{ name: 'Daily report', nodes: [], connections: {}, settings: mcpSettings },
			sourceProject,
		);
		return exported(await exportTool(owner, source.id)).packageBase64;
	};

	it('reports a written workflow as imported when MCP access cannot be turned on', async () => {
		const packageBase64 = await exportSource();
		vi.spyOn(Container.get(McpSettingsService), 'bulkSetAvailableInMCP').mockRejectedValueOnce(
			new Error('Database is locked'),
		);
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		const result = await importTool(member, { packageBase64, projectId: targetProject.id });

		expect(imported(result).created).toBe(true);
		expect(imported(result).warnings).toEqual([
			'Could not turn on MCP access: an internal error occurred. The server log has the details. The workflow is not available in MCP, so MCP clients cannot change it. Turn on MCP access in its workflow settings.',
		]);
		expect(emit).toHaveBeenCalledWith('n8n-package-imported', expect.anything());
		expect(emit).not.toHaveBeenCalledWith('n8n-package-import-failed', expect.anything());
	});

	it('turns an error of a surface step into a warning and logs no failure', async () => {
		const packageBase64 = await exportSource();
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		const output = await importWorkflowPackage({
			user: member,
			packageBase64,
			limit: instanceMcpPackageSizeLimit(),
			projectId: targetProject.id,
			rules: {
				assertUpdatable: () => {},
				afterImport: vi.fn().mockRejectedValue(new Error('Service is not ready')),
			},
		});

		expect(output.created).toBe(true);
		expect(output.warnings).toEqual([
			'The workflow was imported, but a last step failed: an internal error occurred. The server log has the details',
		]);
		expect(emit).not.toHaveBeenCalledWith('n8n-package-import-failed', expect.anything());
	});
});
