import {
	createTeamProject,
	createWorkflow,
	shareWorkflowWithUsers,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { saveCredential } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';

import { N8nPackagesService } from '../n8n-packages.service';
import { readExport } from './utils/tar-support';

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'CredentialsEntity',
		'SharedCredentials',
		'ProjectRelation',
		'Project',
	]);
});

describe('workflow package export — with credentials', () => {
	let service: N8nPackagesService;

	beforeAll(() => {
		service = Container.get(N8nPackagesService);
	});

	it('bundles a referenced credential and lists it in manifest.credentials + requirements', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const credential = await saveCredential(
			{
				name: 'Header credential',
				type: 'httpHeaderAuth',
				data: { name: 'X-Auth', value: 'secret' },
			},
			{ project, role: 'credential:owner' },
		);

		const workflow = await createWorkflow(
			{
				name: 'Workflow with creds',
				nodes: [
					{
						id: 'n1',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
						credentials: {
							httpHeaderAuth: { id: credential.id, name: credential.name },
						},
					},
				],
				connections: {},
			},
			project,
		);

		const stream = await service.exportWorkflows({ user: owner, workflowIds: [workflow.id] });
		const { manifest, entries } = await readExport(stream);

		expect(manifest.credentials).toEqual([
			{
				id: credential.id,
				name: credential.name,
				target: expect.any(String),
			},
		]);
		expect(manifest.requirements).toEqual({
			credentials: [
				{
					id: credential.id,
					name: credential.name,
					type: 'httpHeaderAuth',
					usedByWorkflows: [workflow.id],
				},
			],
		});

		const credentialFile = entries.find(
			(e) => e.name === `${manifest.credentials![0].target}/credential.json`,
		);
		expect(credentialFile).toBeDefined();
		const parsed = JSON.parse(credentialFile!.content.toString());
		expect(parsed).toEqual({
			id: credential.id,
			name: credential.name,
			type: 'httpHeaderAuth',
		});
		// Secret-adjacent fields must not appear on disk under any name.
		expect(Object.keys(parsed).sort()).toEqual(['id', 'name', 'type']);
	});

	it('dedupes a credential referenced by two workflows in a single export', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const credential = await saveCredential(
			{
				name: 'Shared credential',
				type: 'httpHeaderAuth',
				data: { name: 'X-Auth', value: 'secret' },
			},
			{ project, role: 'credential:owner' },
		);

		const nodeWithCred = {
			id: 'n1',
			name: 'HTTP',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
			credentials: {
				httpHeaderAuth: { id: credential.id, name: credential.name },
			},
		};

		const wfA = await createWorkflow(
			{ name: 'Workflow A', nodes: [nodeWithCred], connections: {} },
			project,
		);
		const wfB = await createWorkflow(
			{ name: 'Workflow B', nodes: [nodeWithCred], connections: {} },
			project,
		);

		const stream = await service.exportWorkflows({
			user: owner,
			workflowIds: [wfA.id, wfB.id],
		});
		const { manifest, entries } = await readExport(stream);

		expect(manifest.credentials).toHaveLength(1);
		expect(manifest.credentials![0].id).toBe(credential.id);

		expect(manifest.requirements?.credentials).toHaveLength(1);
		expect(manifest.requirements!.credentials![0].usedByWorkflows.sort()).toEqual(
			[wfA.id, wfB.id].sort(),
		);

		const credentialFiles = entries.filter((e) => e.name.endsWith('/credential.json'));
		expect(credentialFiles).toHaveLength(1);
	});

	it('lists orphan credential references in requirements without writing a file', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);

		const workflow = await createWorkflow(
			{
				name: 'Workflow with orphan',
				nodes: [
					{
						id: 'n1',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
						credentials: {
							httpHeaderAuth: { id: 'does-not-exist', name: 'Stale cred name' },
						},
					},
				],
				connections: {},
			},
			project,
		);

		const stream = await service.exportWorkflows({ user: owner, workflowIds: [workflow.id] });
		const { manifest, entries } = await readExport(stream);

		expect(manifest.credentials).toBeUndefined();
		expect(manifest.requirements).toEqual({
			credentials: [
				{
					id: 'does-not-exist',
					name: 'Stale cred name',
					type: 'httpHeaderAuth',
					usedByWorkflows: [workflow.id],
				},
			],
		});

		const credentialFiles = entries.filter((e) => e.name.endsWith('/credential.json'));
		expect(credentialFiles).toEqual([]);
	});

	it('refuses to export when the caller can read the workflow but not its credential', async () => {
		const owner = await createOwner();
		const ownerProject = await createTeamProject('Owner Project', owner);
		const credential = await saveCredential(
			{
				name: 'Owner-only credential',
				type: 'httpHeaderAuth',
				data: { name: 'X-Auth', value: 'secret' },
			},
			{ project: ownerProject, role: 'credential:owner' },
		);
		const workflow = await createWorkflow(
			{
				name: 'Shared workflow with private cred',
				nodes: [
					{
						id: 'n1',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
						credentials: {
							httpHeaderAuth: { id: credential.id, name: credential.name },
						},
					},
				],
				connections: {},
			},
			ownerProject,
		);

		const sharee = await createMember();
		await shareWorkflowWithUsers(workflow, [sharee]);

		// The sharee can reach the workflow via the direct share, but the
		// credential was never shared with them — the export must abort.
		await expect(
			service.exportWorkflows({ user: sharee, workflowIds: [workflow.id] }),
		).rejects.toThrow('1 credential(s) not accessible. Export aborted.');
	});
});
