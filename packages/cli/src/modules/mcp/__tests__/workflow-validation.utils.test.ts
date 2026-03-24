import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { createWorkflow } from './mock.utils';
import { WorkflowAccessError } from '../mcp.errors';
import { getMcpWorkflow } from '../tools/workflow-validation.utils';

describe('getMcpWorkflow', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	describe('permission checks', () => {
		test('throws generic error when workflow not found (does not reveal if workflow exists)', async () => {
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(null),
			});

			await expect(
				getMcpWorkflow('non-existent-id', user, ['workflow:read'], workflowFinderService),
			).rejects.toThrow(WorkflowAccessError);

			await expect(
				getMcpWorkflow('non-existent-id', user, ['workflow:read'], workflowFinderService),
			).rejects.toThrow("Workflow not found or you don't have permission to access it.");
		});

		test('throws generic error when user lacks permission (does not reveal workflow exists)', async () => {
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(null),
			});

			await expect(
				getMcpWorkflow('existing-but-no-access', user, ['workflow:execute'], workflowFinderService),
			).rejects.toThrow("Workflow not found or you don't have permission to access it.");
		});

		test('returns no_permission reason for both not-found and no-permission cases', async () => {
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(null),
			});

			await expect(
				getMcpWorkflow('any-id', user, ['workflow:read'], workflowFinderService),
			).rejects.toMatchObject({
				reason: 'no_permission',
			});
		});

		test('passes correct scope to workflowFinderService', async () => {
			const workflow = createWorkflow({ settings: { availableInMCP: true } });
			const findWorkflowForUser = jest.fn().mockResolvedValue(workflow);
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser,
			});

			await getMcpWorkflow('wf-1', user, ['workflow:execute'], workflowFinderService);

			expect(findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, ['workflow:execute'], {
				includeActiveVersion: undefined,
			});
		});

		test('passes includeActiveVersion option to workflowFinderService', async () => {
			const workflow = createWorkflow({ settings: { availableInMCP: true } });
			const findWorkflowForUser = jest.fn().mockResolvedValue(workflow);
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser,
			});

			await getMcpWorkflow('wf-1', user, ['workflow:publish'], workflowFinderService, {
				includeActiveVersion: true,
			});

			expect(findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, ['workflow:publish'], {
				includeActiveVersion: true,
			});
		});
	});

	describe('archived workflow checks', () => {
		test('throws specific error for archived workflows', async () => {
			const workflow = createWorkflow({ isArchived: true });
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(workflow),
			});

			await expect(
				getMcpWorkflow('wf-1', user, ['workflow:read'], workflowFinderService),
			).rejects.toThrow(WorkflowAccessError);

			await expect(
				getMcpWorkflow('wf-1', user, ['workflow:read'], workflowFinderService),
			).rejects.toThrow("Workflow 'wf-1' is archived and cannot be accessed.");
		});

		test('returns workflow_archived reason for archived workflows', async () => {
			const workflow = createWorkflow({ isArchived: true });
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(workflow),
			});

			await expect(
				getMcpWorkflow('wf-1', user, ['workflow:read'], workflowFinderService),
			).rejects.toMatchObject({
				reason: 'workflow_archived',
			});
		});
	});

	describe('MCP availability checks', () => {
		test('throws error when workflow is not available in MCP', async () => {
			const workflow = createWorkflow({ settings: { availableInMCP: false } });
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(workflow),
			});

			await expect(
				getMcpWorkflow('wf-1', user, ['workflow:read'], workflowFinderService),
			).rejects.toThrow(WorkflowAccessError);

			await expect(
				getMcpWorkflow('wf-1', user, ['workflow:read'], workflowFinderService),
			).rejects.toThrow('Workflow is not available in MCP.');
		});

		test('throws error when workflow settings is undefined', async () => {
			const workflow = createWorkflow({ settings: undefined });
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(workflow),
			});

			await expect(
				getMcpWorkflow('wf-1', user, ['workflow:read'], workflowFinderService),
			).rejects.toThrow('not available in MCP');
		});

		test('throws error when availableInMCP is not set', async () => {
			const workflow = createWorkflow({ settings: {} });
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(workflow),
			});

			await expect(
				getMcpWorkflow('wf-1', user, ['workflow:read'], workflowFinderService),
			).rejects.toThrow('not available in MCP');
		});

		test('returns not_available_in_mcp reason', async () => {
			const workflow = createWorkflow({ settings: { availableInMCP: false } });
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(workflow),
			});

			await expect(
				getMcpWorkflow('wf-1', user, ['workflow:read'], workflowFinderService),
			).rejects.toMatchObject({
				reason: 'not_available_in_mcp',
			});
		});
	});

	describe('successful retrieval', () => {
		test('returns workflow when all checks pass', async () => {
			const workflow = createWorkflow({
				id: 'wf-123',
				name: 'Test Workflow',
				settings: { availableInMCP: true },
				isArchived: false,
			});
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(workflow),
			});

			const result = await getMcpWorkflow('wf-123', user, ['workflow:read'], workflowFinderService);

			expect(result).toBe(workflow);
			expect(result.id).toBe('wf-123');
			expect(result.name).toBe('Test Workflow');
		});

		test('works with different scopes', async () => {
			const workflow = createWorkflow({ settings: { availableInMCP: true } });
			const findWorkflowForUser = jest.fn().mockResolvedValue(workflow);
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser,
			});

			// Test with workflow:read
			await getMcpWorkflow('wf-1', user, ['workflow:read'], workflowFinderService);
			expect(findWorkflowForUser).toHaveBeenLastCalledWith(
				'wf-1',
				user,
				['workflow:read'],
				expect.any(Object),
			);

			// Test with workflow:execute
			await getMcpWorkflow('wf-1', user, ['workflow:execute'], workflowFinderService);
			expect(findWorkflowForUser).toHaveBeenLastCalledWith(
				'wf-1',
				user,
				['workflow:execute'],
				expect.any(Object),
			);

			// Test with workflow:publish
			await getMcpWorkflow('wf-1', user, ['workflow:publish'], workflowFinderService);
			expect(findWorkflowForUser).toHaveBeenLastCalledWith(
				'wf-1',
				user,
				['workflow:publish'],
				expect.any(Object),
			);
		});
	});

	describe('validation order', () => {
		test('checks permission before archive status', async () => {
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(null),
			});

			await expect(
				getMcpWorkflow('archived-workflow', user, ['workflow:read'], workflowFinderService),
			).rejects.toMatchObject({
				reason: 'no_permission',
			});
		});

		test('checks archive status before MCP availability', async () => {
			const workflow = createWorkflow({
				isArchived: true,
				settings: { availableInMCP: false },
			});
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(workflow),
			});

			await expect(
				getMcpWorkflow('wf-1', user, ['workflow:read'], workflowFinderService),
			).rejects.toMatchObject({
				reason: 'workflow_archived',
			});
		});
	});
});
