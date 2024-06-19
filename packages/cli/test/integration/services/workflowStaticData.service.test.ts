import { WorkflowStaticDataService } from '@/workflows/workflowStaticData.service';
import * as testDb from '@test-integration/testDb';
import Container from 'typedi';
import { createWorkflow } from '@test-integration/db/workflows';
import { Workflow } from 'n8n-workflow';
import { mockInstance } from '@test/mocking';
import { NodeTypes } from '@/NodeTypes';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

const nodeTypes = mockInstance(NodeTypes);
let workflowStaticDataService: WorkflowStaticDataService;
let workflowRepository: WorkflowRepository;

beforeAll(async () => {
	await testDb.init();

	workflowStaticDataService = Container.get(WorkflowStaticDataService);
	workflowRepository = Container.get(WorkflowRepository);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('WorkflowStaticDataService', () => {
	it('should not change workflow updatedAt when calling saveStaticData', async () => {
		const workflowEntityOriginal = await createWorkflow();

		const workflow = new Workflow({
			id: workflowEntityOriginal.id,
			active: false,
			connections: {},
			nodeTypes,
			nodes: [],
		});

		workflow.staticData.testValue = 1;

		await workflowStaticDataService.saveStaticData(workflow);

		const workflowEntityNew = await workflowRepository.get({
			id: workflowEntityOriginal.id,
		});

		expect(workflowEntityNew?.staticData).toEqual(workflow.staticData);
		expect(workflowEntityNew?.updatedAt).toEqual(workflowEntityOriginal.updatedAt);
	});

	it('should not change workflow updatedAt when calling saveStaticDataById', async () => {
		const workflowEntityOriginal = await createWorkflow();
		const staticData = { testValue: 1 };

		await workflowStaticDataService.saveStaticDataById(workflowEntityOriginal.id, staticData);

		const workflowEntityNew = await workflowRepository.get({
			id: workflowEntityOriginal.id,
		});

		expect(workflowEntityNew?.staticData).toEqual(staticData);
		expect(workflowEntityNew?.updatedAt).toEqual(workflowEntityOriginal.updatedAt);
	});
});
