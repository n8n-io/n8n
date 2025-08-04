'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const concurrency_control_service_1 = require('@/concurrency/concurrency-control.service');
const wait_tracker_1 = require('@/wait-tracker');
const executions_1 = require('./shared/db/executions');
const users_1 = require('./shared/db/users');
const utils_1 = require('./shared/utils');
(0, backend_test_utils_1.mockInstance)(wait_tracker_1.WaitTracker);
(0, backend_test_utils_1.mockInstance)(concurrency_control_service_1.ConcurrencyControlService, {
	isEnabled: false,
});
const testServer = (0, utils_1.setupTestServer)({ endpointGroups: ['executions'] });
let owner;
let member;
const saveExecution = async ({ belongingTo }) => {
	const workflow = await (0, backend_test_utils_1.createWorkflow)({}, belongingTo);
	return await (0, executions_1.createSuccessfulExecution)(workflow);
};
const saveWaitingExecution = async ({ belongingTo }) => {
	const workflow = await (0, backend_test_utils_1.createWorkflow)({}, belongingTo);
	return await (0, executions_1.createWaitingExecution)(workflow);
};
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate([
		'ExecutionEntity',
		'WorkflowEntity',
		'SharedWorkflow',
	]);
	testServer.license.reset();
	owner = await (0, users_1.createOwner)();
	member = await (0, users_1.createMember)();
});
describe('GET /executions', () => {
	test('only returns executions of shared workflows if sharing is enabled', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		await (0, backend_test_utils_1.shareWorkflowWithUsers)(workflow, [member]);
		await (0, executions_1.createSuccessfulExecution)(workflow);
		const response1 = await testServer.authAgentFor(member).get('/executions').expect(200);
		expect(response1.body.data.count).toBe(0);
		testServer.license.enable('feat:sharing');
		const response2 = await testServer.authAgentFor(member).get('/executions').expect(200);
		expect(response2.body.data.count).toBe(1);
	});
	test('should return a scopes array for each execution', async () => {
		testServer.license.enable('feat:sharing');
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		await (0, backend_test_utils_1.shareWorkflowWithUsers)(workflow, [member]);
		await (0, executions_1.createSuccessfulExecution)(workflow);
		const response = await testServer.authAgentFor(member).get('/executions').expect(200);
		expect(response.body.data.results[0].scopes).toContain('workflow:execute');
	});
});
describe('GET /executions/:id', () => {
	test('project viewers can view executions for workflows in the project', async () => {
		testServer.license.enable('feat:sharing');
		const teamProject = await (0, backend_test_utils_1.createTeamProject)();
		await (0, backend_test_utils_1.linkUserToProject)(member, teamProject, 'project:viewer');
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, teamProject);
		const execution = await (0, executions_1.createSuccessfulExecution)(workflow);
		const response = await testServer.authAgentFor(member).get(`/executions/${execution.id}`);
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeDefined();
	});
	test('only returns executions of shared workflows if sharing is enabled', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		await (0, backend_test_utils_1.shareWorkflowWithUsers)(workflow, [member]);
		const execution = await (0, executions_1.createSuccessfulExecution)(workflow);
		await testServer.authAgentFor(member).get(`/executions/${execution.id}`).expect(404);
		testServer.license.enable('feat:sharing');
		const response = await testServer
			.authAgentFor(member)
			.get(`/executions/${execution.id}`)
			.expect(200);
		expect(response.body.data.id).toBe(execution.id);
	});
});
describe('POST /executions/delete', () => {
	test('should hard-delete an execution', async () => {
		await saveExecution({ belongingTo: owner });
		const response = await testServer.authAgentFor(owner).get('/executions').expect(200);
		expect(response.body.data.count).toBe(1);
		const [execution] = response.body.data.results;
		await testServer
			.authAgentFor(owner)
			.post('/executions/delete')
			.send({ ids: [execution.id] })
			.expect(200);
		const executions = await (0, executions_1.getAllExecutions)();
		expect(executions).toHaveLength(0);
	});
});
describe('POST /executions/stop', () => {
	test('should not stop an execution we do not have access to', async () => {
		await saveExecution({ belongingTo: owner });
		const incorrectExecutionId = '1234';
		await testServer
			.authAgentFor(owner)
			.post(`/executions/${incorrectExecutionId}/stop`)
			.expect(500);
	});
	test('should stop an execution we have access to', async () => {
		const execution = await saveWaitingExecution({ belongingTo: owner });
		await testServer.authAgentFor(owner).post(`/executions/${execution.id}/stop`).expect(200);
	});
});
//# sourceMappingURL=executions.controller.test.js.map
