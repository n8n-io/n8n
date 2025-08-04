'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const project_service_ee_1 = require('@/services/project.service.ee');
const workflow_sharing_service_1 = require('@/workflows/workflow-sharing.service');
const users_1 = require('../shared/db/users');
let owner;
let member;
let anotherMember;
let workflowSharingService;
let projectService;
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	owner = await (0, users_1.createUser)({ role: 'global:owner' });
	member = await (0, users_1.createUser)({ role: 'global:member' });
	anotherMember = await (0, users_1.createUser)({ role: 'global:member' });
	const licenseMock = (0, jest_mock_extended_1.mock)();
	licenseMock.isSharingLicensed.mockReturnValue(true);
	licenseMock.getMaxTeamProjects.mockReturnValue(-1);
	di_1.Container.set(backend_common_1.LicenseState, licenseMock);
	workflowSharingService = di_1.Container.get(workflow_sharing_service_1.WorkflowSharingService);
	projectService = di_1.Container.get(project_service_ee_1.ProjectService);
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
	]);
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
describe('WorkflowSharingService', () => {
	describe('getSharedWorkflowIds', () => {
		it('should show all workflows to owners', async () => {
			owner.role = 'global:owner';
			const workflow1 = await (0, backend_test_utils_1.createWorkflow)({}, member);
			const workflow2 = await (0, backend_test_utils_1.createWorkflow)({}, anotherMember);
			const sharedWorkflowIds = await workflowSharingService.getSharedWorkflowIds(owner, {
				scopes: ['workflow:read'],
			});
			expect(sharedWorkflowIds).toHaveLength(2);
			expect(sharedWorkflowIds).toContain(workflow1.id);
			expect(sharedWorkflowIds).toContain(workflow2.id);
		});
		it('should show shared workflows to users', async () => {
			member.role = 'global:member';
			const workflow1 = await (0, backend_test_utils_1.createWorkflow)({}, anotherMember);
			const workflow2 = await (0, backend_test_utils_1.createWorkflow)({}, anotherMember);
			const workflow3 = await (0, backend_test_utils_1.createWorkflow)({}, anotherMember);
			await (0, backend_test_utils_1.shareWorkflowWithUsers)(workflow1, [member]);
			await (0, backend_test_utils_1.shareWorkflowWithUsers)(workflow3, [member]);
			const sharedWorkflowIds = await workflowSharingService.getSharedWorkflowIds(member, {
				scopes: ['workflow:read'],
			});
			expect(sharedWorkflowIds).toHaveLength(2);
			expect(sharedWorkflowIds).toContain(workflow1.id);
			expect(sharedWorkflowIds).toContain(workflow3.id);
			expect(sharedWorkflowIds).not.toContain(workflow2.id);
		});
		it('should show workflows that the user has access to through a team project they are part of', async () => {
			const project = await projectService.createTeamProject(member, { name: 'Team Project' });
			await projectService.addUser(project.id, { userId: anotherMember.id, role: 'project:admin' });
			const workflow = await (0, backend_test_utils_1.createWorkflow)(undefined, project);
			const sharedWorkflowIds = await workflowSharingService.getSharedWorkflowIds(anotherMember, {
				scopes: ['workflow:read'],
			});
			expect(sharedWorkflowIds).toContain(workflow.id);
		});
		it('should show workflows that the user has update access to', async () => {
			const project1 = await projectService.createTeamProject(member, { name: 'Team Project 1' });
			const workflow1 = await (0, backend_test_utils_1.createWorkflow)(undefined, project1);
			const project2 = await projectService.createTeamProject(member, { name: 'Team Project 2' });
			const workflow2 = await (0, backend_test_utils_1.createWorkflow)(undefined, project2);
			await projectService.addUser(project1.id, {
				userId: anotherMember.id,
				role: 'project:admin',
			});
			await projectService.addUser(project2.id, {
				userId: anotherMember.id,
				role: 'project:viewer',
			});
			const sharedWorkflowIds = await workflowSharingService.getSharedWorkflowIds(anotherMember, {
				scopes: ['workflow:update'],
			});
			expect(sharedWorkflowIds).toContain(workflow1.id);
			expect(sharedWorkflowIds).not.toContain(workflow2.id);
		});
	});
});
//# sourceMappingURL=workflow-sharing.service.test.js.map
