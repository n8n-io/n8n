import Container from 'typedi';
import type { SuperAgentTest } from 'supertest';
import { v4 as uuid } from 'uuid';
import type { INode, IPinData } from 'n8n-workflow';

import type { User } from '@db/entities/User';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { ListQuery } from '@/requests';
import { WorkflowHistoryRepository } from '@db/repositories/workflowHistory.repository';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

import { mockInstance } from '../../shared/mocking';
import * as utils from '../shared/utils/';
import * as testDb from '../shared/testDb';
import { makeWorkflow, MOCK_PINDATA } from '../shared/utils/';
import { randomCredentialPayload } from '../shared/random';
import { saveCredential } from '../shared/db/credentials';
import { createOwner } from '../shared/db/users';
import { createWorkflow } from '../shared/db/workflows';
import { createTag } from '../shared/db/tags';
import { License } from '@/License';
import { SharedWorkflowRepository } from '@/databases/repositories/sharedWorkflow.repository';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { ProjectService } from '@/services/project.service';

let owner: User;
let authOwnerAgent: SuperAgentTest;

jest.spyOn(License.prototype, 'isSharingEnabled').mockReturnValue(false);

const testServer = utils.setupTestServer({ endpointGroups: ['workflows'] });
const license = testServer.license;

const { objectContaining, arrayContaining, any } = expect;

const activeWorkflowRunnerLike = mockInstance(ActiveWorkflowRunner);

let projectRepository: ProjectRepository;

beforeAll(async () => {
	projectRepository = Container.get(ProjectRepository);
	owner = await createOwner();
	authOwnerAgent = testServer.authAgentFor(owner);
});

beforeEach(async () => {
	jest.resetAllMocks();
	await testDb.truncate(['Workflow', 'SharedWorkflow', 'Tag', 'WorkflowHistory']);
});

describe('POST /workflows', () => {
	const testWithPinData = async (withPinData: boolean) => {
		const workflow = makeWorkflow({ withPinData });
		const response = await authOwnerAgent.post('/workflows').send(workflow);
		expect(response.statusCode).toBe(200);
		return (response.body.data as { pinData: IPinData }).pinData;
	};

	test('should store pin data for node in workflow', async () => {
		const pinData = await testWithPinData(true);
		expect(pinData).toMatchObject(MOCK_PINDATA);
	});

	test('should set pin data to null if no pin data', async () => {
		const pinData = await testWithPinData(false);
		expect(pinData).toBeNull();
	});

	test('should create workflow history version when licensed', async () => {
		license.enable('feat:workflowHistory');
		const payload = {
			name: 'testing',
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
			],
			connections: {},
			staticData: null,
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
			active: false,
		};

		const response = await authOwnerAgent.post('/workflows').send(payload);

		expect(response.statusCode).toBe(200);

		const {
			data: { id },
		} = response.body;

		expect(id).toBeDefined();
		expect(
			await Container.get(WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(1);
		const historyVersion = await Container.get(WorkflowHistoryRepository).findOne({
			where: {
				workflowId: id,
			},
		});
		expect(historyVersion).not.toBeNull();
		expect(historyVersion!.connections).toEqual(payload.connections);
		expect(historyVersion!.nodes).toEqual(payload.nodes);
	});

	test('should not create workflow history version when not licensed', async () => {
		license.disable('feat:workflowHistory');
		const payload = {
			name: 'testing',
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
			],
			connections: {},
			staticData: null,
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
			active: false,
		};

		const response = await authOwnerAgent.post('/workflows').send(payload);

		expect(response.statusCode).toBe(200);

		const {
			data: { id },
		} = response.body;

		expect(id).toBeDefined();
		expect(
			await Container.get(WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(0);
	});

	test('create workflow in personal project by default', async () => {
		//
		// ARRANGE
		//
		const workflow = makeWorkflow();
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

		//
		// ACT
		//
		const response = await authOwnerAgent.post('/workflows').send(workflow).expect(200);

		//
		// ASSERT
		//
		await Container.get(SharedWorkflowRepository).findOneOrFail({
			where: {
				projectId: personalProject.id,
				workflowId: response.body.data.id,
			},
		});
	});

	test('creates workflow in a specific project if the projectId is passed', async () => {
		//
		// ARRANGE
		//
		const workflow = makeWorkflow();
		const project = await projectRepository.save(
			projectRepository.create({
				name: 'Team Project',
				type: 'team',
			}),
		);
		await Container.get(ProjectService).addUser(project.id, owner.id, 'project:admin');

		//
		// ACT
		//
		const response = await authOwnerAgent
			.post('/workflows')
			.send({ ...workflow, projectId: project.id })
			.expect(200);

		//
		// ASSERT
		//
		await Container.get(SharedWorkflowRepository).findOneOrFail({
			where: {
				projectId: project.id,
				workflowId: response.body.data.id,
			},
		});
	});

	test('does not create the workflow in a specific project if the user is not part of the project', async () => {
		//
		// ARRANGE
		//
		const workflow = makeWorkflow();
		const project = await projectRepository.save(
			projectRepository.create({
				name: 'Team Project',
				type: 'team',
			}),
		);

		//
		// ACT
		//
		await authOwnerAgent
			.post('/workflows')
			.send({ ...workflow, projectId: project.id })
			//
			// ASSERT
			//
			.expect(400, {
				code: 400,
				message: "You don't have the permissions to save the workflow in this project.",
			});
	});

	test('does not create the workflow in a specific project if the user does not have the right role to do so', async () => {
		//
		// ARRANGE
		//
		const workflow = makeWorkflow();
		const project = await projectRepository.save(
			projectRepository.create({
				name: 'Team Project',
				type: 'team',
			}),
		);
		await Container.get(ProjectService).addUser(project.id, owner.id, 'project:viewer');

		//
		// ACT
		//
		await authOwnerAgent
			.post('/workflows')
			.send({ ...workflow, projectId: project.id })
			//
			// ASSERT
			//
			.expect(400, {
				code: 400,
				message: "You don't have the permissions to save the workflow in this project.",
			});
	});
});

describe('GET /workflows/:id', () => {
	test('should return pin data', async () => {
		const workflow = makeWorkflow({ withPinData: true });
		const workflowCreationResponse = await authOwnerAgent.post('/workflows').send(workflow);

		const { id } = workflowCreationResponse.body.data as { id: string };
		const workflowRetrievalResponse = await authOwnerAgent.get(`/workflows/${id}`);

		expect(workflowRetrievalResponse.statusCode).toBe(200);
		const { pinData } = workflowRetrievalResponse.body.data as { pinData: IPinData };
		expect(pinData).toMatchObject(MOCK_PINDATA);
	});
});

describe('GET /workflows', () => {
	test('should return zero workflows if none exist', async () => {
		const response = await authOwnerAgent.get('/workflows').expect(200);

		expect(response.body).toEqual({ count: 0, data: [] });
	});

	test('should return workflows', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

		const nodes: INode[] = [
			{
				id: uuid(),
				name: 'Action Network',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					actionNetworkApi: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		];

		const tag = await createTag({ name: 'A' });

		await createWorkflow({ name: 'First', nodes, tags: [tag] }, owner);
		await createWorkflow({ name: 'Second' }, owner);

		const response = await authOwnerAgent.get('/workflows').expect(200);

		expect(response.body).toEqual({
			count: 2,
			data: arrayContaining([
				objectContaining({
					id: any(String),
					name: 'First',
					active: any(Boolean),
					createdAt: any(String),
					updatedAt: any(String),
					tags: [{ id: any(String), name: 'A' }],
					versionId: any(String),
					homeProject: {
						id: ownerPersonalProject.id,
						name: 'My n8n',
						type: ownerPersonalProject.type,
					},
					sharedWithProjects: [],
				}),
				objectContaining({
					id: any(String),
					name: 'Second',
					active: any(Boolean),
					createdAt: any(String),
					updatedAt: any(String),
					tags: [],
					versionId: any(String),
					homeProject: {
						id: ownerPersonalProject.id,
						name: 'My n8n',
						type: ownerPersonalProject.type,
					},
					sharedWithProjects: [],
				}),
			]),
		});

		const found = response.body.data.find(
			(w: ListQuery.Workflow.WithOwnership) => w.name === 'First',
		);

		expect(found.nodes).toBeUndefined();
		expect(found.sharedWithProjects).toHaveLength(0);
		expect(found.usedCredentials).toBeUndefined();
	});

	describe('filter', () => {
		test('should filter workflows by field: name', async () => {
			await createWorkflow({ name: 'First' }, owner);
			await createWorkflow({ name: 'Second' }, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={"name":"First"}')
				.expect(200);

			expect(response.body).toEqual({
				count: 1,
				data: [objectContaining({ name: 'First' })],
			});
		});

		test('should filter workflows by field: active', async () => {
			await createWorkflow({ active: true }, owner);
			await createWorkflow({ active: false }, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "active": true }')
				.expect(200);

			expect(response.body).toEqual({
				count: 1,
				data: [objectContaining({ active: true })],
			});
		});

		test('should filter workflows by field: tags', async () => {
			const workflow = await createWorkflow({ name: 'First' }, owner);

			await createTag({ name: 'A' }, workflow);
			await createTag({ name: 'B' }, workflow);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "tags": ["A"] }')
				.expect(200);

			expect(response.body).toEqual({
				count: 1,
				data: [objectContaining({ name: 'First', tags: [{ id: any(String), name: 'A' }] })],
			});
		});

		test('should filter workflows by projectId', async () => {
			const workflow = await createWorkflow({ name: 'First' }, owner);
			const pp = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id);

			const response1 = await authOwnerAgent
				.get('/workflows')
				.query(`filter={ "projectId": "${pp.id}" }`)
				.expect(200);

			expect(response1.body.data).toHaveLength(1);
			expect(response1.body.data[0].id).toBe(workflow.id);

			const response2 = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "projectId": "Non-Existing Project ID" }')
				.expect(200);

			expect(response2.body.data).toHaveLength(0);
		});
	});

	describe('select', () => {
		test('should select workflow field: name', async () => {
			await createWorkflow({ name: 'First' }, owner);
			await createWorkflow({ name: 'Second' }, owner);

			const response = await authOwnerAgent.get('/workflows').query('select=["name"]').expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{ id: any(String), name: 'First' },
					{ id: any(String), name: 'Second' },
				]),
			});
		});

		test('should select workflow field: active', async () => {
			await createWorkflow({ active: true }, owner);
			await createWorkflow({ active: false }, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["active"]')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{ id: any(String), active: true },
					{ id: any(String), active: false },
				]),
			});
		});

		test('should select workflow field: tags', async () => {
			const firstWorkflow = await createWorkflow({ name: 'First' }, owner);
			const secondWorkflow = await createWorkflow({ name: 'Second' }, owner);

			await createTag({ name: 'A' }, firstWorkflow);
			await createTag({ name: 'B' }, secondWorkflow);

			const response = await authOwnerAgent.get('/workflows').query('select=["tags"]').expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					objectContaining({ id: any(String), tags: [{ id: any(String), name: 'A' }] }),
					objectContaining({ id: any(String), tags: [{ id: any(String), name: 'B' }] }),
				]),
			});
		});

		test('should select workflow fields: createdAt and updatedAt', async () => {
			const firstWorkflowCreatedAt = '2023-08-08T09:31:25.000Z';
			const firstWorkflowUpdatedAt = '2023-08-08T09:31:40.000Z';
			const secondWorkflowCreatedAt = '2023-07-07T09:31:25.000Z';
			const secondWorkflowUpdatedAt = '2023-07-07T09:31:40.000Z';

			await createWorkflow(
				{
					createdAt: new Date(firstWorkflowCreatedAt),
					updatedAt: new Date(firstWorkflowUpdatedAt),
				},
				owner,
			);
			await createWorkflow(
				{
					createdAt: new Date(secondWorkflowCreatedAt),
					updatedAt: new Date(secondWorkflowUpdatedAt),
				},
				owner,
			);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["createdAt", "updatedAt"]')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					objectContaining({
						id: any(String),
						createdAt: firstWorkflowCreatedAt,
						updatedAt: firstWorkflowUpdatedAt,
					}),
					objectContaining({
						id: any(String),
						createdAt: secondWorkflowCreatedAt,
						updatedAt: secondWorkflowUpdatedAt,
					}),
				]),
			});
		});

		test('should select workflow field: versionId', async () => {
			const firstWorkflowVersionId = 'e95ccdde-2b4e-4fd0-8834-220a2b5b4353';
			const secondWorkflowVersionId = 'd099b8dc-b1d8-4b2d-9b02-26f32c0ee785';

			await createWorkflow({ versionId: firstWorkflowVersionId }, owner);
			await createWorkflow({ versionId: secondWorkflowVersionId }, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["versionId"]')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{ id: any(String), versionId: firstWorkflowVersionId },
					{ id: any(String), versionId: secondWorkflowVersionId },
				]),
			});
		});

		test('should select workflow field: ownedBy', async () => {
			await createWorkflow({}, owner);
			await createWorkflow({}, owner);
			const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
				owner.id,
			);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["ownedBy"]')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{
						id: any(String),
						homeProject: {
							id: ownerPersonalProject.id,
							name: 'My n8n',
							type: ownerPersonalProject.type,
						},
						sharedWithProjects: [],
					},
					{
						id: any(String),
						homeProject: {
							id: ownerPersonalProject.id,
							name: 'My n8n',
							type: ownerPersonalProject.type,
						},
						sharedWithProjects: [],
					},
				]),
			});
		});
	});
});

describe('PATCH /workflows/:id', () => {
	test('should create workflow history version when licensed', async () => {
		license.enable('feat:workflowHistory');
		const workflow = await createWorkflow({}, owner);
		const payload = {
			name: 'name updated',
			versionId: workflow.versionId,
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Cron',
					type: 'n8n-nodes-base.cron',
					typeVersion: 1,
					position: [400, 300],
				},
			],
			connections: {},
			staticData: '{"id":1}',
			settings: {
				saveExecutionProgress: false,
				saveManualExecutions: false,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		const {
			data: { id },
		} = response.body;

		expect(response.statusCode).toBe(200);

		expect(id).toBe(workflow.id);
		expect(
			await Container.get(WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(1);
		const historyVersion = await Container.get(WorkflowHistoryRepository).findOne({
			where: {
				workflowId: id,
			},
		});
		expect(historyVersion).not.toBeNull();
		expect(historyVersion!.connections).toEqual(payload.connections);
		expect(historyVersion!.nodes).toEqual(payload.nodes);
	});

	test('should not create workflow history version when not licensed', async () => {
		license.disable('feat:workflowHistory');
		const workflow = await createWorkflow({}, owner);
		const payload = {
			name: 'name updated',
			versionId: workflow.versionId,
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Cron',
					type: 'n8n-nodes-base.cron',
					typeVersion: 1,
					position: [400, 300],
				},
			],
			connections: {},
			staticData: '{"id":1}',
			settings: {
				saveExecutionProgress: false,
				saveManualExecutions: false,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		const {
			data: { id },
		} = response.body;

		expect(response.statusCode).toBe(200);

		expect(id).toBe(workflow.id);
		expect(
			await Container.get(WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(0);
	});

	test('should activate workflow without changing version ID', async () => {
		license.disable('feat:workflowHistory');
		const workflow = await createWorkflow({}, owner);
		const payload = {
			versionId: workflow.versionId,
			active: true,
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		expect(response.statusCode).toBe(200);
		expect(activeWorkflowRunnerLike.add).toBeCalled();

		const {
			data: { id, versionId, active },
		} = response.body;

		expect(id).toBe(workflow.id);
		expect(versionId).toBe(workflow.versionId);
		expect(active).toBe(true);
	});

	test('should deactivate workflow without changing version ID', async () => {
		license.disable('feat:workflowHistory');
		const workflow = await createWorkflow({ active: true }, owner);
		const payload = {
			versionId: workflow.versionId,
			active: false,
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		expect(response.statusCode).toBe(200);
		expect(activeWorkflowRunnerLike.add).not.toBeCalled();
		expect(activeWorkflowRunnerLike.remove).toBeCalled();

		const {
			data: { id, versionId, active },
		} = response.body;

		expect(id).toBe(workflow.id);
		expect(versionId).toBe(workflow.versionId);
		expect(active).toBe(false);
	});

	test('should update workflow meta', async () => {
		const workflow = await createWorkflow({}, owner);
		const payload = {
			...workflow,
			meta: {
				templateCredsSetupCompleted: true,
			},
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		const { data: updatedWorkflow } = response.body;

		expect(response.statusCode).toBe(200);

		expect(updatedWorkflow.id).toBe(workflow.id);
		expect(updatedWorkflow.meta).toEqual(payload.meta);
	});
});

describe('POST /workflows/run', () => {
	let sharingSpy: jest.SpyInstance;
	let tamperingSpy: jest.SpyInstance;
	let workflow: WorkflowEntity;

	beforeAll(() => {
		const enterpriseWorkflowService = Container.get(EnterpriseWorkflowService);
		const workflowRepository = Container.get(WorkflowRepository);

		sharingSpy = jest.spyOn(License.prototype, 'isSharingEnabled');
		tamperingSpy = jest.spyOn(enterpriseWorkflowService, 'preventTampering');
		workflow = workflowRepository.create({ id: uuid() });
	});

	test('should prevent tampering if sharing is enabled', async () => {
		sharingSpy.mockReturnValue(true);

		await authOwnerAgent.post('/workflows/run').send({ workflowData: workflow });

		expect(tamperingSpy).toHaveBeenCalledTimes(1);
	});

	test('should skip tampering prevention if sharing is disabled', async () => {
		sharingSpy.mockReturnValue(false);

		await authOwnerAgent.post('/workflows/run').send({ workflowData: workflow });

		expect(tamperingSpy).not.toHaveBeenCalled();
	});
});
