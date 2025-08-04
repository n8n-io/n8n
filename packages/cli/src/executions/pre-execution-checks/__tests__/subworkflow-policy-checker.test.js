'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const uuid_1 = require('uuid');
const subworkflow_policy_denial_error_1 = require('@/errors/subworkflow-policy-denial.error');
const ownership_service_1 = require('@/services/ownership.service');
const subworkflow_policy_checker_1 = require('../subworkflow-policy-checker');
describe('SubworkflowPolicyChecker', () => {
	const ownershipService = (0, backend_test_utils_1.mockInstance)(
		ownership_service_1.OwnershipService,
	);
	const globalConfig = (0, jest_mock_extended_1.mock)({
		workflows: { callerPolicyDefaultOption: 'workflowsFromSameOwner' },
	});
	const accessService = (0, jest_mock_extended_1.mock)();
	const urlService = (0, jest_mock_extended_1.mock)();
	const checker = new subworkflow_policy_checker_1.SubworkflowPolicyChecker(
		(0, jest_mock_extended_1.mock)(),
		ownershipService,
		globalConfig,
		accessService,
		urlService,
	);
	afterEach(() => {
		jest.restoreAllMocks();
	});
	describe('no caller policy', () => {
		it('should fall back to `N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION`', async () => {
			globalConfig.workflows.callerPolicyDefaultOption = 'none';
			const parentWorkflow = (0, jest_mock_extended_1.mock)();
			const subworkflowId = 'subworkflow-id';
			const subworkflow = (0, jest_mock_extended_1.mock)({ id: subworkflowId });
			const parentWorkflowProject = (0, jest_mock_extended_1.mock)();
			const subworkflowProject = (0, jest_mock_extended_1.mock)({ type: 'team' });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);
			const check = checker.check(subworkflow, parentWorkflow.id);
			await expect(check).rejects.toThrowError(
				subworkflow_policy_denial_error_1.SubworkflowPolicyDenialError,
			);
			globalConfig.workflows.callerPolicyDefaultOption = 'workflowsFromSameOwner';
		});
	});
	describe('`workflows-from-list` caller policy', () => {
		it('should allow if caller list contains parent workflow ID', async () => {
			const parentWorkflow = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflow = (0, jest_mock_extended_1.mock)({
				settings: {
					callerPolicy: 'workflowsFromAList',
					callerIds: `123,456,bcdef,  ${parentWorkflow.id}`,
				},
			});
			const parentWorkflowProject = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflowProject = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);
			const check = checker.check(subworkflow, parentWorkflow.id);
			await expect(check).resolves.not.toThrow();
		});
		it('should deny if caller list does not contain parent workflow ID', async () => {
			const parentWorkflow = (0, jest_mock_extended_1.mock)({ id: 'parent-workflow-id' });
			const parentWorkflowProject = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflowProject = (0, jest_mock_extended_1.mock)({
				id: (0, uuid_1.v4)(),
				type: 'team',
			});
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);
			const subworkflowId = 'subworkflow-id';
			const subworkflow = (0, jest_mock_extended_1.mock)({
				id: subworkflowId,
				settings: { callerPolicy: 'workflowsFromAList', callerIds: 'xyz' },
			});
			const check = checker.check(subworkflow, parentWorkflow.id);
			await expect(check).rejects.toThrowError(
				subworkflow_policy_denial_error_1.SubworkflowPolicyDenialError,
			);
		});
	});
	describe('`any` caller policy', () => {
		it('should not throw on a regular subworkflow call', async () => {
			const parentWorkflow = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflow = (0, jest_mock_extended_1.mock)({ settings: { callerPolicy: 'any' } });
			const parentWorkflowProject = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflowProject = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);
			const check = checker.check(subworkflow, parentWorkflow.id);
			await expect(check).resolves.not.toThrow();
		});
	});
	describe('`workflows-from-same-owner` caller policy', () => {
		it('should deny if the two workflows are owned by different projects', async () => {
			const parentWorkflowProject = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflowProject = (0, jest_mock_extended_1.mock)({
				id: (0, uuid_1.v4)(),
				type: 'team',
			});
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);
			const subworkflowId = 'subworkflow-id';
			const subworkflow = (0, jest_mock_extended_1.mock)({
				id: subworkflowId,
				settings: { callerPolicy: 'workflowsFromSameOwner' },
			});
			const check = checker.check(subworkflow, (0, uuid_1.v4)());
			await expect(check).rejects.toThrowError(
				subworkflow_policy_denial_error_1.SubworkflowPolicyDenialError,
			);
		});
		it('should allow if both workflows are owned by the same project', async () => {
			const parentWorkflow = (0, jest_mock_extended_1.mock)();
			const bothWorkflowsProject = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(bothWorkflowsProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(bothWorkflowsProject);
			const subworkflow = (0, jest_mock_extended_1.mock)({
				settings: { callerPolicy: 'workflowsFromSameOwner' },
			});
			const check = checker.check(subworkflow, parentWorkflow.id);
			await expect(check).resolves.not.toThrow();
		});
	});
	describe('error details', () => {
		it('should contain description for accessible case', async () => {
			const parentWorkflow = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflowId = 'subworkflow-id';
			const subworkflow = (0, jest_mock_extended_1.mock)({
				id: subworkflowId,
				settings: { callerPolicy: 'none' },
			});
			const parentWorkflowProject = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflowProject = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);
			const subworkflowProjectOwner = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(subworkflowProjectOwner);
			accessService.hasReadAccess.mockResolvedValueOnce(true);
			const instanceUrl = 'https://n8n.test.com';
			urlService.getInstanceBaseUrl.mockReturnValueOnce(instanceUrl);
			const check = checker.check(
				subworkflow,
				parentWorkflow.id,
				(0, jest_mock_extended_1.mock)(),
				subworkflowProjectOwner.id,
			);
			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description: `${subworkflow_policy_denial_error_1.SUBWORKFLOW_DENIAL_BASE_DESCRIPTION} <a href="${instanceUrl}/workflow/subworkflow-id" target="_blank">Update sub-workflow settings</a> to allow other workflows to call it.`,
			});
		});
		it('should contain description for inaccessible personal project case', async () => {
			const parentWorkflow = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflowId = 'subworkflow-id';
			const subworkflow = (0, jest_mock_extended_1.mock)({
				id: subworkflowId,
				settings: { callerPolicy: 'none' },
			});
			const parentWorkflowProject = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflowProject = (0, jest_mock_extended_1.mock)({
				id: (0, uuid_1.v4)(),
				type: 'personal',
			});
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);
			const subworkflowProjectOwner = (0, jest_mock_extended_1.mock)({
				id: (0, uuid_1.v4)(),
				firstName: 'John',
				lastName: 'Doe',
			});
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(subworkflowProjectOwner);
			accessService.hasReadAccess.mockResolvedValueOnce(false);
			const node = (0, jest_mock_extended_1.mock)();
			const check = checker.check(subworkflow, parentWorkflow.id, node, subworkflowProjectOwner.id);
			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description: `${subworkflow_policy_denial_error_1.SUBWORKFLOW_DENIAL_BASE_DESCRIPTION} You will need John Doe to update the sub-workflow (${subworkflowId}) settings to allow this workflow to call it.`,
			});
		});
		it('should contain description for inaccessible team project case', async () => {
			const parentWorkflow = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflowId = 'subworkflow-id';
			const subworkflow = (0, jest_mock_extended_1.mock)({
				id: subworkflowId,
				settings: { callerPolicy: 'none' },
			});
			const parentWorkflowProject = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflowProject = (0, jest_mock_extended_1.mock)({
				id: (0, uuid_1.v4)(),
				type: 'team',
			});
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);
			const subworkflowProjectOwner = (0, jest_mock_extended_1.mock)({
				id: (0, uuid_1.v4)(),
				firstName: 'John',
				lastName: 'Doe',
			});
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(subworkflowProjectOwner);
			accessService.hasReadAccess.mockResolvedValueOnce(false);
			const check = checker.check(
				subworkflow,
				parentWorkflow.id,
				(0, jest_mock_extended_1.mock)(),
				subworkflowProjectOwner.id,
			);
			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description: `${subworkflow_policy_denial_error_1.SUBWORKFLOW_DENIAL_BASE_DESCRIPTION} You will need an admin from the ${subworkflowProject.name} project to update the sub-workflow (${subworkflowId}) settings to allow this workflow to call it.`,
			});
		});
		it('should contain description for default (e.g. error workflow) case', async () => {
			const parentWorkflow = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflowId = 'subworkflow-id';
			const subworkflow = (0, jest_mock_extended_1.mock)({
				id: subworkflowId,
				settings: { callerPolicy: 'none' },
			});
			const parentWorkflowProject = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			const subworkflowProject = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);
			const subworkflowProjectOwner = (0, jest_mock_extended_1.mock)({ id: (0, uuid_1.v4)() });
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(subworkflowProjectOwner);
			accessService.hasReadAccess.mockResolvedValueOnce(true);
			const check = checker.check(subworkflow, parentWorkflow.id, (0, jest_mock_extended_1.mock)());
			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description: subworkflow_policy_denial_error_1.SUBWORKFLOW_DENIAL_BASE_DESCRIPTION,
			});
		});
	});
});
//# sourceMappingURL=subworkflow-policy-checker.test.js.map
