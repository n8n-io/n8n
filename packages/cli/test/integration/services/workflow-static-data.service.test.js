'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const node_types_1 = require('@/node-types');
const workflow_static_data_service_1 = require('@/workflows/workflow-static-data.service');
const nodeTypes = (0, backend_test_utils_1.mockInstance)(node_types_1.NodeTypes);
let workflowStaticDataService;
let workflowRepository;
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	workflowStaticDataService = di_1.Container.get(
		workflow_static_data_service_1.WorkflowStaticDataService,
	);
	workflowRepository = di_1.Container.get(db_1.WorkflowRepository);
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
describe('WorkflowStaticDataService', () => {
	it('should not change workflow updatedAt when calling saveStaticData', async () => {
		const workflowEntityOriginal = await (0, backend_test_utils_1.createWorkflow)();
		const workflow = new n8n_workflow_1.Workflow({
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
		const workflowEntityOriginal = await (0, backend_test_utils_1.createWorkflow)();
		const staticData = { testValue: 1 };
		await workflowStaticDataService.saveStaticDataById(workflowEntityOriginal.id, staticData);
		const workflowEntityNew = await workflowRepository.get({
			id: workflowEntityOriginal.id,
		});
		expect(workflowEntityNew?.staticData).toEqual(staticData);
		expect(workflowEntityNew?.updatedAt).toEqual(workflowEntityOriginal.updatedAt);
	});
});
//# sourceMappingURL=workflow-static-data.service.test.js.map
