import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { Project, User, WorkflowEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { INode, Workflow } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import {
	SUBWORKFLOW_DENIAL_BASE_DESCRIPTION,
	SubworkflowPolicyDenialError,
} from '@/errors/subworkflow-policy-denial.error';
import type { AccessService } from '@/services/access.service';
import { OwnershipService } from '@/services/ownership.service';
import type { UrlService } from '@/services/url.service';

import { SubworkflowPolicyChecker } from '../subworkflow-policy-checker';

describe('SubworkflowPolicyChecker', () => {
	const ownershipService = mockInstance(OwnershipService);
	const globalConfig = mock<GlobalConfig>({
		workflows: { callerPolicyDefaultOption: 'workflowsFromSameOwner' },
	});
	const accessService = mock<AccessService>();
	const urlService = mock<UrlService>();

	const checker = new SubworkflowPolicyChecker(
		mock(),
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

			const parentWorkflow = mock<WorkflowEntity>();
			const subworkflowId = 'subworkflow-id';
			const subworkflow = mock<Workflow>({ id: subworkflowId }); // no caller policy

			const parentWorkflowProject = mock<Project>();
			const subworkflowProject = mock<Project>({ type: 'team' });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).rejects.toThrowError(SubworkflowPolicyDenialError);

			globalConfig.workflows.callerPolicyDefaultOption = 'workflowsFromSameOwner';
		});
	});

	describe('`workflows-from-list` caller policy', () => {
		it('should allow if caller list contains parent workflow ID', async () => {
			const parentWorkflow = mock<WorkflowEntity>({ id: uuid() });

			const subworkflow = mock<Workflow>({
				settings: {
					callerPolicy: 'workflowsFromAList',
					callerIds: `123,456,bcdef,  ${parentWorkflow.id}`,
				},
			});

			const parentWorkflowProject = mock<Project>({ id: uuid() });
			const subworkflowProject = mock<Project>({ id: uuid() });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).resolves.not.toThrow();
		});

		it('should deny if caller list does not contain parent workflow ID', async () => {
			const parentWorkflow = mock<WorkflowEntity>({ id: 'parent-workflow-id' });

			const parentWorkflowProject = mock<Project>({ id: uuid() });
			const subworkflowProject = mock<Project>({ id: uuid(), type: 'team' });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);

			const subworkflowId = 'subworkflow-id';
			const subworkflow = mock<Workflow>({
				id: subworkflowId,
				settings: { callerPolicy: 'workflowsFromAList', callerIds: 'xyz' },
			});

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).rejects.toThrowError(SubworkflowPolicyDenialError);
		});
	});

	describe('`any` caller policy', () => {
		it('should not throw on a regular subworkflow call', async () => {
			const parentWorkflow = mock<WorkflowEntity>({ id: uuid() });
			const subworkflow = mock<Workflow>({ settings: { callerPolicy: 'any' } });

			const parentWorkflowProject = mock<Project>({ id: uuid() });
			const subworkflowProject = mock<Project>({ id: uuid() });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).resolves.not.toThrow();
		});
	});

	describe('`workflows-from-same-owner` caller policy', () => {
		it('should deny if the two workflows are owned by different projects', async () => {
			const parentWorkflowProject = mock<Project>({ id: uuid() });
			const subworkflowProject = mock<Project>({ id: uuid(), type: 'team' });

			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);

			const subworkflowId = 'subworkflow-id';
			const subworkflow = mock<Workflow>({
				id: subworkflowId,
				settings: { callerPolicy: 'workflowsFromSameOwner' },
			});

			const check = checker.check(subworkflow, uuid());

			await expect(check).rejects.toThrowError(SubworkflowPolicyDenialError);
		});

		it('should allow if both workflows are owned by the same project', async () => {
			const parentWorkflow = mock<WorkflowEntity>();

			const bothWorkflowsProject = mock<Project>({ id: uuid() });

			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(bothWorkflowsProject); // parent workflow project
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(bothWorkflowsProject); // subworkflow project

			const subworkflow = mock<Workflow>({ settings: { callerPolicy: 'workflowsFromSameOwner' } });

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).resolves.not.toThrow();
		});
	});

	describe('error details', () => {
		it('should contain description for accessible case', async () => {
			const parentWorkflow = mock<WorkflowEntity>({ id: uuid() });
			const subworkflowId = 'subworkflow-id';
			const subworkflow = mock<Workflow>({ id: subworkflowId, settings: { callerPolicy: 'none' } });

			const parentWorkflowProject = mock<Project>({ id: uuid() });
			const subworkflowProject = mock<Project>({ id: uuid() });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);

			const subworkflowProjectOwner = mock<User>({ id: uuid() });
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(subworkflowProjectOwner);
			accessService.hasReadAccess.mockResolvedValueOnce(true);

			const instanceUrl = 'https://n8n.test.com';
			urlService.getInstanceBaseUrl.mockReturnValueOnce(instanceUrl);

			const check = checker.check(
				subworkflow,
				parentWorkflow.id,
				mock<INode>(),
				subworkflowProjectOwner.id,
			);

			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description: `${SUBWORKFLOW_DENIAL_BASE_DESCRIPTION} <a href=\"${instanceUrl}/workflow/subworkflow-id\" target=\"_blank\">Update sub-workflow settings</a> to allow other workflows to call it.`,
			});
		});

		it('should contain description for inaccessible personal project case', async () => {
			const parentWorkflow = mock<WorkflowEntity>({ id: uuid() });
			const subworkflowId = 'subworkflow-id';
			const subworkflow = mock<Workflow>({ id: subworkflowId, settings: { callerPolicy: 'none' } });

			const parentWorkflowProject = mock<Project>({ id: uuid() });
			const subworkflowProject = mock<Project>({ id: uuid(), type: 'personal' });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);

			const subworkflowProjectOwner = mock<User>({
				id: uuid(),
				firstName: 'John',
				lastName: 'Doe',
			});
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(subworkflowProjectOwner);
			accessService.hasReadAccess.mockResolvedValueOnce(false);

			const node = mock<INode>();

			const check = checker.check(subworkflow, parentWorkflow.id, node, subworkflowProjectOwner.id);

			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description: `${SUBWORKFLOW_DENIAL_BASE_DESCRIPTION} You will need John Doe to update the sub-workflow (${subworkflowId}) settings to allow this workflow to call it.`,
			});
		});

		it('should contain description for inaccessible team project case', async () => {
			const parentWorkflow = mock<WorkflowEntity>({ id: uuid() });
			const subworkflowId = 'subworkflow-id';
			const subworkflow = mock<Workflow>({ id: subworkflowId, settings: { callerPolicy: 'none' } });

			const parentWorkflowProject = mock<Project>({ id: uuid() });
			const subworkflowProject = mock<Project>({ id: uuid(), type: 'team' });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);

			const subworkflowProjectOwner = mock<User>({
				id: uuid(),
				firstName: 'John',
				lastName: 'Doe',
			});
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(subworkflowProjectOwner);
			accessService.hasReadAccess.mockResolvedValueOnce(false);

			const check = checker.check(
				subworkflow,
				parentWorkflow.id,
				mock<INode>(),
				subworkflowProjectOwner.id,
			);

			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description: `${SUBWORKFLOW_DENIAL_BASE_DESCRIPTION} You will need an admin from the ${subworkflowProject.name} project to update the sub-workflow (${subworkflowId}) settings to allow this workflow to call it.`,
			});
		});

		it('should contain description for default (e.g. error workflow) case', async () => {
			const parentWorkflow = mock<WorkflowEntity>({ id: uuid() });
			const subworkflowId = 'subworkflow-id';
			const subworkflow = mock<Workflow>({ id: subworkflowId, settings: { callerPolicy: 'none' } });

			const parentWorkflowProject = mock<Project>({ id: uuid() });
			const subworkflowProject = mock<Project>({ id: uuid() });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);

			const subworkflowProjectOwner = mock<User>({ id: uuid() });
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(subworkflowProjectOwner);
			accessService.hasReadAccess.mockResolvedValueOnce(true);

			const check = checker.check(subworkflow, parentWorkflow.id, mock<INode>());

			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description: SUBWORKFLOW_DENIAL_BASE_DESCRIPTION,
			});
		});
	});
});
