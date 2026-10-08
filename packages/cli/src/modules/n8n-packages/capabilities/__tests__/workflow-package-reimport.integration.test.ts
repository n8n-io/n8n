import { LicenseState } from '@n8n/backend-common';
import {
	createActiveWorkflow,
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { CredentialsEntity, Project, User, WorkflowEntity } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, IWorkflowSettings } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { saveCredential } from '@test-integration/db/credentials';
import { createDataTable } from '@test-integration/db/data-tables';
import { createMember, createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initCredentialsTypes, initNodeTypes } from '@test-integration/utils';

import { PackageImportConfig } from '../../n8n-packages.config';
import {
	exportTool,
	exported,
	httpNode,
	importTool,
	imported,
	liveNodes,
	publish,
	saveNewVersion,
	storedWorkflow,
} from './workflow-package-test-helpers';

const licenseMocker = new LicenseMocker();

mockInstance(ActiveWorkflowManager);

let owner: User;
let member: User;
let sourceProject: Project;
let targetProject: Project;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'data-table']);
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
		'DataTable',
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

const mcpSettings: IWorkflowSettings = { availableInMCP: true };

const headerCredential = async (name: string, project: Project) =>
	await saveCredential(
		{
			name,
			type: 'httpHeaderAuth',
			data: { name: 'Authorization', value: randomBytes(16).toString('hex') },
		},
		{ project, role: 'credential:owner' },
	);

/** A published workflow of the source project, with the given nodes live. */
async function createPublishedSource(nodes: INode[]): Promise<WorkflowEntity> {
	const source = await createActiveWorkflow(
		{ name: 'Daily report', settings: mcpSettings },
		sourceProject,
	);
	await publish(source.id, await saveNewVersion(source, [...source.nodes, ...nodes]));
	return await storedWorkflow(source.id);
}

const exportSource = async (source: WorkflowEntity) =>
	exported(await exportTool(owner, source.id)).packageBase64;

const importAsMember = async (packageBase64: string) =>
	imported(await importTool(member, { packageBase64, projectId: targetProject.id }));

/** Changes one node of the copy as the editor does, and puts that version live. */
async function changeAndPublishCopy(copyId: string, change: (node: INode) => INode) {
	const copy = await storedWorkflow(copyId);
	const versionId = await saveNewVersion(copy, copy.nodes.map(change));
	await publish(copyId, versionId);
}

const credentialIdOf = (nodes: INode[], nodeId: string) =>
	nodes.find(({ id }) => id === nodeId)?.credentials?.httpHeaderAuth?.id;

describe('import_workflow_package and the credentials of a copy', () => {
	let sourceCredential: CredentialsEntity;
	let source: WorkflowEntity;
	let packageBase64: string;

	beforeEach(async () => {
		sourceCredential = await headerCredential('Stripe API', sourceProject);
		source = await createPublishedSource([httpNode(sourceCredential)]);
		packageBase64 = await exportSource(source);
	});

	const bindCopyTo = async (copyId: string, credential: CredentialsEntity) =>
		await changeAndPublishCopy(copyId, (node) =>
			node.id === 'http-1'
				? { ...node, credentials: { httpHeaderAuth: { id: credential.id, name: credential.name } } }
				: node,
		);

	it('keeps the credential that the user chose for the copy, also in the live version', async () => {
		const first = await importAsMember(packageBase64);
		const prodCredential = await headerCredential('Prod Stripe', targetProject);
		await bindCopyTo(first.workflowId, prodCredential);

		const second = await importAsMember(packageBase64);

		const stored = await storedWorkflow(first.workflowId);
		expect(second).toMatchObject({
			workflowId: first.workflowId,
			created: false,
			published: true,
			credentialsNeedingSetup: [],
		});
		expect(credentialIdOf(stored.nodes, 'http-1')).toBe(prodCredential.id);
		expect(credentialIdOf(await liveNodes(first.workflowId), 'http-1')).toBe(prodCredential.id);
		expect(second.warnings.join(' ')).not.toContain('already had with the same name and type');
	});

	it('lists the empty credential of an earlier import again while it holds no value', async () => {
		const first = await importAsMember(packageBase64);
		const [stub] = first.credentialsNeedingSetup;

		const second = await importAsMember(packageBase64);

		expect(stub).toMatchObject({ name: 'Stripe API', type: 'httpHeaderAuth' });
		expect(second.credentialsNeedingSetup).toEqual([stub]);
		expect(second.warnings).toEqual([]);
		expect(credentialIdOf((await storedWorkflow(first.workflowId)).nodes, 'http-1')).toBe(
			stub.id,
		);
	});

	it('lists nothing to set up once the user filled in the credential of an earlier import', async () => {
		const first = await importAsMember(packageBase64);
		const [stub] = first.credentialsNeedingSetup;
		const filled = await headerCredential('Filled', targetProject);
		await Container.get(CredentialsRepository).update({ id: stub.id }, { data: filled.data });

		const second = await importAsMember(packageBase64);

		expect(second.credentialsNeedingSetup).toEqual([]);
	});

	it('matches by name and type again when the credential that the copy used is gone', async () => {
		const first = await importAsMember(packageBase64);
		const [stub] = first.credentialsNeedingSetup;
		const prodCredential = await headerCredential('Prod Stripe', targetProject);
		await bindCopyTo(first.workflowId, prodCredential);
		await Container.get(CredentialsRepository).delete({ id: prodCredential.id });

		const second = await importAsMember(packageBase64);

		expect(second).toMatchObject({ created: false, credentialsNeedingSetup: [stub] });
		expect(credentialIdOf((await storedWorkflow(first.workflowId)).nodes, 'http-1')).toBe(
			stub.id,
		);
	});
});

describe('import_workflow_package and the data tables of a copy', () => {
	const tableNode = (dataTableId: string): INode => ({
		id: 'table-1',
		name: 'Find customer',
		type: 'n8n-nodes-base.dataTable',
		typeVersion: 1,
		position: [400, 0],
		parameters: {
			operation: 'get',
			dataTableId: { __rl: true, mode: 'list', value: dataTableId },
		},
	});

	const tableIdOf = (nodes: INode[]) => {
		const locator = nodes.find(({ id }) => id === 'table-1')?.parameters.dataTableId;
		return typeof locator === 'object' && locator !== null && 'value' in locator
			? locator.value
			: undefined;
	};

	it('keeps the table that the user chose for the copy, also in the live version', async () => {
		const sourceTable = await createDataTable(sourceProject, { name: 'Customers' });
		const source = await createPublishedSource([tableNode(sourceTable.id)]);
		const packageBase64 = await exportSource(source);
		const first = await importAsMember(packageBase64);
		const ownTable = await createDataTable(targetProject, { name: 'Customers (cloud)' });
		await changeAndPublishCopy(first.workflowId, (node) =>
			node.id === 'table-1' ? tableNode(ownTable.id) : node,
		);

		const second = await importAsMember(packageBase64);

		const stored = await storedWorkflow(first.workflowId);
		expect(first.warnings[0]).toContain('Create the missing tables, then select them');
		expect(second).toMatchObject({ workflowId: first.workflowId, created: false, published: true });
		expect(tableIdOf(stored.nodes)).toBe(ownTable.id);
		expect(stored.activeVersionId).toBe(stored.versionId);
		expect(tableIdOf(await liveNodes(first.workflowId))).toBe(ownTable.id);
		expect(second.warnings).toEqual([
			'The copy keeps the data tables that it used in place of 1 data table(s) of the package that this project does not have: Customers.',
			'The workflow was published, so the import published the new version. The new version is live now.',
		]);
	});

	it('uses the table of the package when the target project has it', async () => {
		const sharedTable = await createDataTable(targetProject, { name: 'Customers' });
		const source = await createPublishedSource([tableNode(sharedTable.id)]);
		const packageBase64 = await exportSource(source);
		const first = await importAsMember(packageBase64);
		const otherTable = await createDataTable(targetProject, { name: 'Other customers' });
		await changeAndPublishCopy(first.workflowId, (node) =>
			node.id === 'table-1' ? tableNode(otherTable.id) : node,
		);

		const second = await importAsMember(packageBase64);

		expect(tableIdOf((await storedWorkflow(first.workflowId)).nodes)).toBe(sharedTable.id);
		expect(second.warnings.join(' ')).not.toContain('keeps the data tables');
	});
});
