import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { saveCredential } from '@test-integration/db/credentials';
import { createOwner } from '@test-integration/db/users';

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
});
