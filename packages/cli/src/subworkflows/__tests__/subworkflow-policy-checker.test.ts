import { v4 as uuid } from 'uuid';
import type { Workflow } from 'n8n-workflow';
import { SubworkflowOperationError } from 'n8n-workflow';
import { Project } from '@/databases/entities/Project';
import { OwnershipService } from '@/services/ownership.service';
import { mockInstance } from '@test/mocking';
import config from '@/config';
import { mock } from 'jest-mock-extended';
import { SubworkflowPolicyChecker } from '../subworkflow-policy-checker.service';

import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import type { License } from '@/License';

const toTargetCallErrorMsg = (subworkflowId: string) =>
	`Target workflow ID ${subworkflowId} may not be called`;

const ownershipService = mockInstance(OwnershipService);
const memberPersonalProject = mock<Project>();

describe('SubworkflowPolicyChecker', () => {
	const license = mock<License>();
	const checker = new SubworkflowPolicyChecker(mock(), license, ownershipService);

	beforeEach(() => {
		license.isSharingEnabled.mockReturnValue(true);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('no caller policy', () => {
		test('should fall back to N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION', async () => {
			config.set('workflows.callerPolicyDefaultOption', 'none');

			const parentWorkflow = mock<WorkflowEntity>();
			const subworkflow = mock<Workflow>(); // no caller policy

			ownershipService.getWorkflowProjectCached.mockResolvedValue(memberPersonalProject);

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).rejects.toThrow(toTargetCallErrorMsg(subworkflow.id));

			config.load(config.default);
		});
	});

	describe('overridden caller policy', () => {
		test('if no sharing, should override policy to workflows-from-same-owner', async () => {
			license.isSharingEnabled.mockReturnValue(false);

			const parentWorkflow = mock<WorkflowEntity>();
			const subworkflow = mock<Workflow>({ settings: { callerPolicy: 'any' } }); // should be overridden

			const firstProject = mock<Project>({ id: uuid() });
			const secondProject = mock<Project>({ id: uuid() });

			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(firstProject); // parent workflow
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(secondProject); // subworkflow

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).rejects.toThrow(toTargetCallErrorMsg(subworkflow.id));

			try {
				await checker.check(subworkflow, uuid());
			} catch (error) {
				if (error instanceof SubworkflowOperationError) {
					expect(error.description).toBe(
						`An admin for the ${firstProject.name} project can make this change. You may need to tell them the ID of the sub-workflow, which is ${subworkflow.id}`,
					);
				}
			}
		});
	});

	describe('workflows-from-list caller policy', () => {
		// xyz
		test('should allow if caller list contains parent workflow ID', async () => {
			const parentWorkflow = mock<WorkflowEntity>({ id: uuid() });

			const subworkflow = mock<Workflow>({
				settings: {
					callerPolicy: 'workflowsFromAList',
					callerIds: `123,456,bcdef,  ${parentWorkflow.id}`,
				},
			});

			const parentWorkflowProject = mock<Project>({ id: uuid() });
			const subworkflowOwner = mock<Project>({ id: uuid() });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject); // parent workflow
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowOwner); // subworkflow

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).resolves.not.toThrow();
		});

		test('should deny if caller list does not contain parent workflow ID', async () => {
			const parentWorkflow = mock<WorkflowEntity>();

			const subworkflow = mock<Workflow>({
				settings: { callerPolicy: 'workflowsFromAList', callerIds: 'xyz' },
			});

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).rejects.toThrow();
		});
	});

	describe('any caller policy', () => {
		test('should not throw', async () => {
			const parentWorkflow = mock<WorkflowEntity>({ id: uuid() });
			const subworkflow = mock<Workflow>({ settings: { callerPolicy: 'any' } });

			const parentWorkflowProject = mock<Project>({ id: uuid() });
			const subworkflowOwner = mock<Project>({ id: uuid() });
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject); // parent workflow
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowOwner); // subworkflow

			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(new Project());

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).resolves.not.toThrow();
		});
	});

	describe('workflows-from-same-owner caller policy', () => {
		test('should deny if the two workflows are owned by different users', async () => {
			const parentWorkflowProject = mock<Project>({ id: uuid() });
			const subworkflowOwner = mock<Project>({ id: uuid() });

			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject); // parent workflow
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowOwner); // subworkflow

			const subworkflow = mock<Workflow>({ settings: { callerPolicy: 'workflowsFromSameOwner' } });

			const check = checker.check(subworkflow, uuid());

			await expect(check).rejects.toThrow(toTargetCallErrorMsg(subworkflow.id));
		});

		test('should allow if both workflows are owned by the same user', async () => {
			const parentWorkflow = mock<WorkflowEntity>();

			const bothWorkflowsProject = mock<Project>({ id: uuid() });

			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(bothWorkflowsProject); // parent workflow
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(bothWorkflowsProject); // subworkflow

			const subworkflow = mock<Workflow>({ settings: { callerPolicy: 'workflowsFromSameOwner' } });

			const check = checker.check(subworkflow, parentWorkflow.id);

			await expect(check).resolves.not.toThrow();
		});
	});
});
