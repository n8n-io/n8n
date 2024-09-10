import { v4 as uuid } from 'uuid';
import type { INode, Workflow } from 'n8n-workflow';
import type { Project } from '@/databases/entities/project';
import { OwnershipService } from '@/services/ownership.service';
import { mockInstance } from '@test/mocking';
import config from '@/config';
import { mock } from 'jest-mock-extended';
import { SubworkflowPolicyChecker } from '../subworkflow-policy-checker.service';

import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import type { License } from '@/license';
import type { GlobalConfig } from '@n8n/config';
import type { AccessService } from '@/services/access.service';
import type { User } from '@/databases/entities/user';
import { SUBWORKFLOW_DENIAL_EXPLANATION } from '@/errors/subworkflow-policy-denial.error';

describe('SubworkflowPolicyChecker', () => {
	const ownershipService = mockInstance(OwnershipService);
	const license = mock<License>();
	const globalConfig = mock<GlobalConfig>({
		workflows: { callerPolicyDefaultOption: 'workflowsFromSameOwner' },
	});
	const accessService = mock<AccessService>();

	const checker = new SubworkflowPolicyChecker(
		mock(),
		license,
		ownershipService,
		globalConfig,
		accessService,
	);

	beforeEach(() => {
		license.isSharingEnabled.mockReturnValue(true);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('no caller policy', () => {
		it('should fall back to N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION', async () => {
			const checker = new SubworkflowPolicyChecker(
				mock(),
				license,
				ownershipService,
				mock<GlobalConfig>({ workflows: { callerPolicyDefaultOption: 'none' } }),
				accessService,
			);

			const parentWorkflow = mock<WorkflowEntity>();
			const subworkflowId = 'subworkflow-id';
			const subworkflow = mock<Workflow>({ id: subworkflowId }); // no caller policy

			const parentWorkflowProject = mock<Project>();
			ownershipService.getWorkflowProjectCached.mockResolvedValue(parentWorkflowProject);

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description:
					'The sub-workflow you’re trying to execute limits which workflows it can be called by.',
			});

			config.load(config.default);
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
			const subworkflowProject = mock<Project>({ id: uuid() });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject); // parent workflow
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject); // subworkflow

			const subworkflowId = 'subworkflow-id';
			const subworkflow = mock<Workflow>({
				id: subworkflowId,
				settings: { callerPolicy: 'workflowsFromAList', callerIds: 'xyz' },
			});

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description:
					'The sub-workflow you’re trying to execute limits which workflows it can be called by.',
			});
		});
	});

	describe('`any` caller policy', () => {
		it('if no sharing, should be overriden to `workflows-from-same-owner`', async () => {
			license.isSharingEnabled.mockReturnValue(false);

			const parentWorkflow = mock<WorkflowEntity>();
			const subworkflowId = 'subworkflow-id';
			const subworkflow = mock<Workflow>({ id: subworkflowId, settings: { callerPolicy: 'any' } }); // should be overridden

			const parentWorkflowProject = mock<Project>({ id: uuid() });
			const subworkflowProject = mock<Project>({ id: uuid() });

			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description:
					'The sub-workflow you’re trying to execute limits which workflows it can be called by.',
			});
		});

		it('should not throw', async () => {
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
			const subworkflowProject = mock<Project>({ id: uuid() });

			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);

			const subworkflowId = 'subworkflow-id';
			const subworkflow = mock<Workflow>({
				id: subworkflowId,
				settings: { callerPolicy: 'workflowsFromSameOwner' },
			});

			const check = checker.check(subworkflow, uuid());

			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description: SUBWORKFLOW_DENIAL_EXPLANATION,
			});
		});

		it('should allow if both workflows are owned by the same project', async () => {
			const parentWorkflow = mock<WorkflowEntity>();

			const bothWorkflowsProject = mock<Project>({ id: uuid() });

			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(bothWorkflowsProject); // parent workflow
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(bothWorkflowsProject); // subworkflow

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
			ownershipService.getProjectOwnerCached.mockResolvedValueOnce(subworkflowProjectOwner);
			accessService.hasAccess.mockResolvedValueOnce(true);

			const node = mock<INode>();

			const check = checker.check(subworkflow, parentWorkflow.id, node, subworkflowProjectOwner.id);

			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description: `${SUBWORKFLOW_DENIAL_EXPLANATION} Update sub-workflow settings to allow other workflows to call it.`,
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
			ownershipService.getProjectOwnerCached.mockResolvedValueOnce(subworkflowProjectOwner);
			accessService.hasAccess.mockResolvedValueOnce(false);

			const node = mock<INode>();

			const check = checker.check(subworkflow, parentWorkflow.id, node, subworkflowProjectOwner.id);

			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description: `${SUBWORKFLOW_DENIAL_EXPLANATION} You will need John Doe to update the sub-workflow (${subworkflowId}) settings to allow this workflow to call it.`,
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
			ownershipService.getProjectOwnerCached.mockResolvedValueOnce(subworkflowProjectOwner);
			accessService.hasAccess.mockResolvedValueOnce(false);

			const node = mock<INode>();

			const check = checker.check(subworkflow, parentWorkflow.id, node, subworkflowProjectOwner.id);

			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description: `${SUBWORKFLOW_DENIAL_EXPLANATION} You will need an admin from the ${subworkflowProject.name} project to update the sub-workflow (${subworkflowId}) settings to allow this workflow to call it.`,
			});
		});

		it('should contain description for default (error workflow) case', async () => {
			const parentWorkflow = mock<WorkflowEntity>({ id: uuid() });
			const subworkflowId = 'subworkflow-id';
			const subworkflow = mock<Workflow>({ id: subworkflowId, settings: { callerPolicy: 'none' } });

			const parentWorkflowProject = mock<Project>({ id: uuid() });
			const subworkflowProject = mock<Project>({ id: uuid() });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject);
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowProject);

			const subworkflowProjectOwner = mock<User>({ id: uuid() });
			ownershipService.getProjectOwnerCached.mockResolvedValueOnce(subworkflowProjectOwner);
			accessService.hasAccess.mockResolvedValueOnce(true);

			const node = mock<INode>();

			const check = checker.check(subworkflow, parentWorkflow.id, node);

			await expect(check).rejects.toMatchObject({
				message: `The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
				description: SUBWORKFLOW_DENIAL_EXPLANATION,
			});
		});
	});
});
