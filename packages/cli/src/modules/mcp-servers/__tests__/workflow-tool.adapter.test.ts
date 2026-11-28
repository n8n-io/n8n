import type {
	IExecutionResponse,
	SharedWorkflowRepository,
	User,
	WorkflowRepository,
} from '@n8n/db';
import { Project, WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ExecutionService } from '@/executions/execution.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { CallableWorkflowLoader } from '@/workflows/callable/callable-workflow-loader.service';
import type { CallableWorkflowRunner } from '@/workflows/callable/callable-workflow-runner.service';
import { CallableWorkflowUnavailableError } from '@/workflows/callable/callable-workflow-unavailable.error';

import { WorkflowToolAdapter } from '../workflow-tool.adapter';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn().mockResolvedValue(true),
}));

const PROJECT_ID = 'project-1';
const WORKFLOW_ID = 'workflow-1';

function setup() {
	const runner = mock<CallableWorkflowRunner>();
	const sharedWorkflows = mock<SharedWorkflowRepository>();
	const workflows = mock<WorkflowRepository>();
	const workflowLoader = mock<CallableWorkflowLoader>();
	const executionService = mock<ExecutionService>();
	return {
		runner,
		sharedWorkflows,
		workflows,
		workflowLoader,
		executionService,
		adapter: new WorkflowToolAdapter(
			runner,
			sharedWorkflows,
			workflows,
			workflowLoader,
			executionService,
		),
	};
}

describe('WorkflowToolAdapter', () => {
	it('reports a callable workflow', async () => {
		const { runner, adapter } = setup();
		runner.check.mockResolvedValue({ callable: true });

		await expect(adapter.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({ callable: true });
		expect(runner.check).toHaveBeenCalledWith(PROJECT_ID, WORKFLOW_ID);
	});

	it('gives the reason when the workflow cannot be a tool', async () => {
		const { runner, adapter } = setup();
		runner.check.mockResolvedValue({ callable: false, reason: 'not_callable' });

		await expect(adapter.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
			callable: false,
			reason: 'not_callable',
		});
	});

	describe('a workflow that the project does not own', () => {
		function ownedBy(sharedWorkflows: ReturnType<typeof setup>['sharedWorkflows'], id?: string) {
			sharedWorkflows.findOwnerProjectsByWorkflowIds.mockResolvedValue(
				new Map(id ? [[WORKFLOW_ID, Object.assign(new Project(), { id })]] : []),
			);
		}

		it('reports a workflow that another project owns now as moved', async () => {
			const { runner, sharedWorkflows, workflows, adapter } = setup();
			runner.check.mockResolvedValue({ callable: false, reason: 'not_found' });
			ownedBy(sharedWorkflows, 'project-2');
			workflows.findByIds.mockResolvedValue([
				Object.assign(new WorkflowEntity(), { id: WORKFLOW_ID, isArchived: false }),
			]);

			await expect(adapter.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: false,
				reason: 'moved',
			});
		});

		it('keeps not_found for a deleted workflow', async () => {
			const { runner, sharedWorkflows, workflows, adapter } = setup();
			runner.check.mockResolvedValue({ callable: false, reason: 'not_found' });
			ownedBy(sharedWorkflows);

			await expect(adapter.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: false,
				reason: 'not_found',
			});
			expect(workflows.findByIds).not.toHaveBeenCalled();
		});

		it('keeps not_found for an archived workflow in another project', async () => {
			const { runner, sharedWorkflows, workflows, adapter } = setup();
			runner.check.mockResolvedValue({ callable: false, reason: 'not_found' });
			ownedBy(sharedWorkflows, 'project-2');
			workflows.findByIds.mockResolvedValue([
				Object.assign(new WorkflowEntity(), { id: WORKFLOW_ID, isArchived: true }),
			]);

			await expect(adapter.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: false,
				reason: 'not_found',
			});
		});

		it('keeps not_found for an archived workflow of the project itself', async () => {
			const { runner, sharedWorkflows, workflows, adapter } = setup();
			runner.check.mockResolvedValue({ callable: false, reason: 'not_found' });
			ownedBy(sharedWorkflows, PROJECT_ID);

			await expect(adapter.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: false,
				reason: 'not_found',
			});
			expect(workflows.findByIds).not.toHaveBeenCalled();
		});

		it('reports a workflow that another project owns now as moved on describe', async () => {
			const { runner, sharedWorkflows, workflows, adapter } = setup();
			runner.describe.mockResolvedValue({ callable: false, reason: 'not_found' });
			ownedBy(sharedWorkflows, 'project-2');
			workflows.findByIds.mockResolvedValue([
				Object.assign(new WorkflowEntity(), { id: WORKFLOW_ID, isArchived: false }),
			]);

			await expect(adapter.describe(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: false,
				reason: 'moved',
			});
		});

		it('reports a workflow that another project owns now as moved on run', async () => {
			const { runner, sharedWorkflows, workflows, adapter } = setup();
			runner.run.mockResolvedValue({ status: 'refused', reason: 'not_found' });
			ownedBy(sharedWorkflows, 'project-2');
			workflows.findByIds.mockResolvedValue([
				Object.assign(new WorkflowEntity(), { id: WORKFLOW_ID, isArchived: false }),
			]);

			await expect(adapter.run(PROJECT_ID, WORKFLOW_ID, {}, { waitMs: 5_000 })).resolves.toEqual({
				status: 'refused',
				reason: 'moved',
			});
		});

		it('keeps not_found on run for a deleted workflow', async () => {
			const { runner, sharedWorkflows, workflows, adapter } = setup();
			runner.run.mockResolvedValue({ status: 'refused', reason: 'not_found' });
			ownedBy(sharedWorkflows);

			await expect(adapter.run(PROJECT_ID, WORKFLOW_ID, {}, { waitMs: 5_000 })).resolves.toEqual({
				status: 'refused',
				reason: 'not_found',
			});
			expect(workflows.findByIds).not.toHaveBeenCalled();
		});
	});

	it('lists the workflows of the project without the check, and leaves out archived ones', async () => {
		const { runner, sharedWorkflows, workflows, adapter } = setup();
		sharedWorkflows.findOwnedWorkflowIdsByProjects.mockResolvedValue(['w-1', 'w-2']);
		workflows.findByIds.mockResolvedValue([
			Object.assign(new WorkflowEntity(), { id: 'w-1', name: 'Lead score', description: null }),
			Object.assign(new WorkflowEntity(), { id: 'w-2', name: 'Old', isArchived: true }),
		]);

		await expect(adapter.list(PROJECT_ID)).resolves.toEqual([
			{ workflowId: 'w-1', name: 'Lead score', description: null },
		]);
		expect(runner.check).not.toHaveBeenCalled();
	});

	it('lists only the given workflows that the project owns', async () => {
		const { sharedWorkflows, workflows, adapter } = setup();
		sharedWorkflows.findOwnedWorkflowIdsByProjects.mockResolvedValue(['w-1', 'w-2']);
		workflows.findByIds.mockResolvedValue([]);

		await adapter.list(PROJECT_ID, ['w-2', 'w-9']);

		expect(workflows.findByIds).toHaveBeenCalledWith(['w-2'], expect.anything());
	});

	it('describes the workflow with the input schema of the runner', async () => {
		const { runner, adapter } = setup();
		const description = {
			callable: true as const,
			name: 'Get pipeline summary',
			description: null,
			inputSchema: { type: 'object' as const, additionalProperties: true },
			nodeNames: ['When Executed by Another Workflow'],
		};
		runner.describe.mockResolvedValue(description);

		await expect(adapter.describe(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual(description);
		expect(runner.describe).toHaveBeenCalledWith(PROJECT_ID, WORKFLOW_ID);
	});

	it('runs the workflow through the shared runner, with the wait of the caller', async () => {
		const { runner, adapter } = setup();
		runner.run.mockResolvedValue({ status: 'busy' });

		await expect(
			adapter.run(PROJECT_ID, WORKFLOW_ID, { email: 'a@b.c' }, { waitMs: 5_000 }),
		).resolves.toEqual({ status: 'busy' });
		expect(runner.run).toHaveBeenCalledWith(
			PROJECT_ID,
			WORKFLOW_ID,
			{ email: 'a@b.c' },
			{ waitMs: 5_000 },
		);
	});

	describe('inspect', () => {
		const user = mock<User>({ id: 'user-1' });
		const triggerNode: INode = {
			id: 'trigger',
			name: 'Start',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: {
				inputSource: 'workflowInputs',
				workflowInputs: {
					values: [
						{ name: 'campaign_id', type: 'string' },
						{ name: 'days', type: 'number' },
					],
				},
			},
		};

		beforeEach(() => {
			vi.mocked(userHasScopes).mockResolvedValue(true);
		});

		function setupOwnedWorkflow(
			deps: ReturnType<typeof setup>,
			name = 'Get campaign numbers',
			nodes: INode[] = [triggerNode],
		) {
			deps.sharedWorkflows.findOwnedWorkflowSummary.mockResolvedValue({
				id: WORKFLOW_ID,
				name,
				isArchived: false,
			});
			deps.workflowLoader.loadWorkflow.mockResolvedValue(
				Object.assign(new WorkflowEntity(), { id: WORKFLOW_ID, name, nodes }),
			);
		}

		it('returns the workflow name, trigger inputs, and output fields of the last successful execution', async () => {
			const deps = setup();
			setupOwnedWorkflow(deps);
			deps.executionService.getLastSuccessfulExecution.mockResolvedValue(
				mock<IExecutionResponse>({
					dataTooLargeToDisplay: false,
					data: {
						resultData: {
							lastNodeExecuted: 'Format',
							runData: {
								Start: [
									{
										startTime: 0,
										executionTime: 1,
										data: { main: [[{ json: { campaign_id: 'c1' } }]] },
									},
								],
								Format: [
									{
										startTime: 1,
										executionTime: 2,
										data: {
											main: [
												[
													{
														json: {
															campaign: 'Spring',
															clicks: 120,
															active: true,
															tags: ['a'],
															meta: { source: 'ads' },
															nullable: null,
															mixed: 'text',
														},
													},
													{
														json: {
															campaign: 'Summer',
															nullable: 42,
															mixed: 99,
															extra: 'later',
														},
													},
													{
														json: {
															mixed: true,
														},
													},
												],
											],
										},
									},
								],
							},
						},
					},
				}),
			);

			const result = await deps.adapter.inspect(PROJECT_ID, WORKFLOW_ID, user);

			expect(result).toEqual({
				sourceName: 'Get campaign numbers',
				inputs: [
					{ name: 'campaign_id', type: 'string' },
					{ name: 'days', type: 'number' },
				],
				outputs: [
					{ name: 'campaign', type: 'string' },
					{ name: 'clicks', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'tags', type: 'array' },
					{ name: 'meta', type: 'object' },
					{ name: 'nullable', type: 'number' },
					{ name: 'mixed', type: 'any' },
					{ name: 'extra', type: 'string' },
				],
			});
			expect(deps.executionService.getLastSuccessfulExecution).toHaveBeenCalledWith(
				WORKFLOW_ID,
				user,
			);
		});

		it('falls back to the draft workflow for inputs when the workflow is not published', async () => {
			const deps = setup();
			setupOwnedWorkflow(deps);
			deps.workflowLoader.loadWorkflow
				.mockRejectedValueOnce(new CallableWorkflowUnavailableError('not_published', 'Unpublished'))
				.mockResolvedValueOnce(
					Object.assign(new WorkflowEntity(), {
						id: WORKFLOW_ID,
						name: 'Get campaign numbers',
						nodes: [triggerNode],
					}),
				);
			deps.executionService.getLastSuccessfulExecution.mockResolvedValue(undefined);

			const result = await deps.adapter.inspect(PROJECT_ID, WORKFLOW_ID, user);

			expect(result).toEqual({
				sourceName: 'Get campaign numbers',
				inputs: [
					{ name: 'campaign_id', type: 'string' },
					{ name: 'days', type: 'number' },
				],
				outputs: null,
			});
		});

		it('returns null outputs when execution items are redacted, and widens field-redacted values to any', async () => {
			const deps = setup();
			setupOwnedWorkflow(deps);
			deps.executionService.getLastSuccessfulExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					dataTooLargeToDisplay: false,
					data: {
						resultData: {
							lastNodeExecuted: 'Format',
							runData: {
								Format: [
									{
										startTime: 1,
										executionTime: 2,
										data: {
											main: [
												[
													{
														json: {},
														redaction: { redacted: true, reason: 'workflow_redaction_policy' },
													},
												],
											],
										},
									},
								],
							},
						},
					},
				}),
			);

			await expect(deps.adapter.inspect(PROJECT_ID, WORKFLOW_ID, user)).resolves.toMatchObject({
				outputs: null,
			});

			deps.executionService.getLastSuccessfulExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					dataTooLargeToDisplay: false,
					data: {
						resultData: {
							lastNodeExecuted: 'Format',
							runData: {
								Format: [
									{
										startTime: 1,
										executionTime: 2,
										data: {
											main: [
												[
													{
														json: {
															secret: {
																__redacted: true,
																reason: 'node_defined_field',
																canReveal: false,
															},
															count: 5,
														},
													},
												],
											],
										},
									},
								],
							},
						},
					},
				}),
			);

			await expect(deps.adapter.inspect(PROJECT_ID, WORKFLOW_ID, user)).resolves.toMatchObject({
				outputs: [
					{ name: 'secret', type: 'any' },
					{ name: 'count', type: 'number' },
				],
			});
		});

		it('returns empty details when the user lacks workflow:read scope', async () => {
			const deps = setup();
			setupOwnedWorkflow(deps);
			vi.mocked(userHasScopes).mockResolvedValueOnce(false);

			const result = await deps.adapter.inspect(PROJECT_ID, WORKFLOW_ID, user);

			expect(result).toEqual({ sourceName: null, inputs: [], outputs: null });
			expect(deps.workflowLoader.loadWorkflow).not.toHaveBeenCalled();
			expect(deps.executionService.getLastSuccessfulExecution).not.toHaveBeenCalled();
		});

		it('returns empty details when the workflow moved to another project', async () => {
			const deps = setup();
			deps.sharedWorkflows.findOwnedWorkflowSummary.mockResolvedValue(null);

			await expect(deps.adapter.inspect(PROJECT_ID, WORKFLOW_ID, user)).resolves.toEqual({
				sourceName: null,
				inputs: [],
				outputs: null,
			});
			expect(deps.sharedWorkflows.findOwnedWorkflowSummary).toHaveBeenCalledWith(
				PROJECT_ID,
				WORKFLOW_ID,
			);
			expect(deps.workflowLoader.loadWorkflow).not.toHaveBeenCalled();
			expect(deps.executionService.getLastSuccessfulExecution).not.toHaveBeenCalled();
		});

		it('returns empty details when the workflow is archived in the same project', async () => {
			const deps = setup();
			deps.sharedWorkflows.findOwnedWorkflowSummary.mockResolvedValue({
				id: WORKFLOW_ID,
				name: 'Archived workflow',
				isArchived: true,
			});

			await expect(deps.adapter.inspect(PROJECT_ID, WORKFLOW_ID, user)).resolves.toEqual({
				sourceName: null,
				inputs: [],
				outputs: null,
			});
			expect(deps.sharedWorkflows.findOwnedWorkflowSummary).toHaveBeenCalledWith(
				PROJECT_ID,
				WORKFLOW_ID,
			);
			expect(deps.workflowLoader.loadWorkflow).not.toHaveBeenCalled();
			expect(deps.executionService.getLastSuccessfulExecution).not.toHaveBeenCalled();
		});
	});
});
