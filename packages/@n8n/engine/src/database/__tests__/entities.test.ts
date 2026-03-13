import type { DataSource } from '@n8n/typeorm';

import { createTestDataSource, cleanDatabase } from '../../../test/helpers';
import {
	WorkflowRepository,
	WebhookRepository,
	WorkflowExecutionRepository,
	WorkflowStepExecutionRepository,
} from '../repositories';
import { ExecutionStatus, StepStatus, StepType } from '../enums';

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)('Engine Database Entities', () => {
	let ds: DataSource;
	let workflowRepo: WorkflowRepository;
	let webhookRepo: WebhookRepository;
	let executionRepo: WorkflowExecutionRepository;
	let stepRepo: WorkflowStepExecutionRepository;

	beforeAll(async () => {
		ds = await createTestDataSource();
		workflowRepo = new WorkflowRepository(ds);
		webhookRepo = new WebhookRepository(ds);
		executionRepo = new WorkflowExecutionRepository(ds);
		stepRepo = new WorkflowStepExecutionRepository(ds);
	});

	afterAll(async () => {
		if (ds?.isInitialized) {
			await ds.destroy();
		}
	});

	beforeEach(async () => {
		await cleanDatabase(ds);
	});

	/** Helper: create a workflow with a generated UUID and return its id */
	function createWorkflowId(): string {
		return crypto.randomUUID();
	}

	describe('WorkflowEntity (versioned)', () => {
		it('should create multiple versions of the same workflow', async () => {
			const id = createWorkflowId();

			const v1 = workflowRepo.create({
				id,
				version: 1,
				name: 'Test Workflow',
				code: 'export default defineWorkflow({ steps: [] })',
				compiledCode: 'module.exports = {}',
				triggers: [{ type: 'webhook', config: {} }],
				settings: { timeout: 30000 },
				graph: { steps: [], edges: [] },
				active: true,
			});
			await workflowRepo.save(v1);

			const v2 = workflowRepo.create({
				id,
				version: 2,
				name: 'Test Workflow (updated)',
				code: 'export default defineWorkflow({ steps: [step1] })',
				compiledCode: 'module.exports = { step1() {} }',
				triggers: [{ type: 'webhook', config: { path: '/test' } }],
				settings: { timeout: 60000 },
				graph: { steps: ['step1'], edges: [] },
				active: true,
			});
			await workflowRepo.save(v2);

			const allVersions = await workflowRepo.find({
				where: { id },
				order: { version: 'ASC' },
			});
			expect(allVersions).toHaveLength(2);
			expect(allVersions[0].version).toBe(1);
			expect(allVersions[1].version).toBe(2);
		});

		it('should return the latest version via findLatestVersion', async () => {
			const id = createWorkflowId();

			await workflowRepo.save(
				workflowRepo.create({
					id,
					version: 1,
					name: 'v1',
					code: 'v1 code',
					compiledCode: 'v1 compiled',
					graph: {},
					active: true,
				}),
			);

			await workflowRepo.save(
				workflowRepo.create({
					id,
					version: 2,
					name: 'v2',
					code: 'v2 code',
					compiledCode: 'v2 compiled',
					graph: {},
					active: true,
				}),
			);

			const latest = await workflowRepo.findLatestVersion(id);
			expect(latest).not.toBeNull();
			expect(latest!.version).toBe(2);
			expect(latest!.name).toBe('v2');
		});

		it('should return a specific version via findByIdAndVersion', async () => {
			const id = createWorkflowId();

			await workflowRepo.save(
				workflowRepo.create({
					id,
					version: 1,
					name: 'v1',
					code: 'code',
					compiledCode: 'compiled',
					graph: {},
					active: true,
				}),
			);

			await workflowRepo.save(
				workflowRepo.create({
					id,
					version: 2,
					name: 'v2',
					code: 'code',
					compiledCode: 'compiled',
					graph: {},
					active: true,
				}),
			);

			const v1 = await workflowRepo.findByIdAndVersion(id, 1);
			expect(v1).not.toBeNull();
			expect(v1!.name).toBe('v1');
		});

		it('should store active and deletedAt fields', async () => {
			const id = createWorkflowId();

			const workflow = workflowRepo.create({
				id,
				version: 1,
				name: 'Test',
				code: 'code',
				compiledCode: 'compiled',
				graph: {},
				active: false,
			});
			const saved = await workflowRepo.save(workflow);

			expect(saved.active).toBe(false);
			expect(saved.deletedAt).toBeNull();

			// Update active
			await workflowRepo
				.createQueryBuilder()
				.update()
				.set({ active: true })
				.where('id = :id', { id })
				.execute();

			const updated = await workflowRepo.findByIdAndVersion(id, 1);
			expect(updated!.active).toBe(true);
		});
	});

	describe('WebhookEntity', () => {
		it('should create a webhook linked to a workflow', async () => {
			const id = createWorkflowId();

			await workflowRepo.save(
				workflowRepo.create({
					id,
					version: 1,
					name: 'Test',
					code: 'code',
					compiledCode: 'compiled',
					graph: {},
					active: true,
				}),
			);

			const webhook = webhookRepo.create({
				workflowId: id,
				method: 'POST',
				path: '/webhooks/test',
			});
			const saved = await webhookRepo.save(webhook);

			expect(saved.id).toBeDefined();
			expect(saved.workflowId).toBe(id);
			expect(saved.method).toBe('POST');
			expect(saved.path).toBe('/webhooks/test');
		});

		it('should enforce unique constraint on (method, path)', async () => {
			const id = createWorkflowId();

			await workflowRepo.save(
				workflowRepo.create({
					id,
					version: 1,
					name: 'Test',
					code: 'code',
					compiledCode: 'compiled',
					graph: {},
					active: true,
				}),
			);

			await webhookRepo.save(
				webhookRepo.create({
					workflowId: id,
					method: 'POST',
					path: '/webhooks/unique',
				}),
			);

			await expect(
				webhookRepo.save(
					webhookRepo.create({
						workflowId: id,
						method: 'POST',
						path: '/webhooks/unique',
					}),
				),
			).rejects.toThrow();
		});

		it('should find a webhook by method and path', async () => {
			const id = createWorkflowId();

			await workflowRepo.save(
				workflowRepo.create({
					id,
					version: 1,
					name: 'Test',
					code: 'code',
					compiledCode: 'compiled',
					graph: {},
					active: true,
				}),
			);

			await webhookRepo.save(
				webhookRepo.create({
					workflowId: id,
					method: 'GET',
					path: '/webhooks/find-me',
				}),
			);

			const found = await webhookRepo.findByMethodAndPath('GET', '/webhooks/find-me');
			expect(found).not.toBeNull();
			expect(found!.method).toBe('GET');
			expect(found!.path).toBe('/webhooks/find-me');

			const notFound = await webhookRepo.findByMethodAndPath('DELETE', '/webhooks/find-me');
			expect(notFound).toBeNull();
		});
	});

	describe('WorkflowExecution', () => {
		it('should create an execution referencing a workflow', async () => {
			const id = createWorkflowId();

			await workflowRepo.save(
				workflowRepo.create({
					id,
					version: 1,
					name: 'Test',
					code: 'code',
					compiledCode: 'compiled',
					graph: {},
					active: true,
				}),
			);

			const execution = executionRepo.create({
				workflowId: id,
				workflowVersion: 1,
				status: ExecutionStatus.Running,
				mode: 'manual',
			});
			const saved = await executionRepo.save(execution);

			expect(saved.id).toBeDefined();
			expect(saved.workflowId).toBe(id);
			expect(saved.workflowVersion).toBe(1);
			expect(saved.status).toBe(ExecutionStatus.Running);
			expect(saved.cancelRequested).toBe(false);
			expect(saved.pauseRequested).toBe(false);
			expect(saved.startedAt).toBeInstanceOf(Date);
			expect(saved.createdAt).toBeInstanceOf(Date);
			expect(saved.updatedAt).toBeInstanceOf(Date);
		});
	});

	describe('WorkflowStepExecution', () => {
		let executionId: string;
		let workflowId: string;

		beforeEach(async () => {
			workflowId = createWorkflowId();

			await workflowRepo.save(
				workflowRepo.create({
					id: workflowId,
					version: 1,
					name: 'Test',
					code: 'code',
					compiledCode: 'compiled',
					graph: {},
					active: true,
				}),
			);

			const execution = await executionRepo.save(
				executionRepo.create({
					workflowId,
					workflowVersion: 1,
					status: ExecutionStatus.Running,
				}),
			);
			executionId = execution.id;
		});

		it('should create step executions for an execution', async () => {
			const triggerStep = stepRepo.create({
				executionId,
				stepId: 'trigger_webhook',
				stepType: StepType.Trigger,
				status: StepStatus.Completed,
				output: { body: { name: 'test' } },
			});
			const saved = await stepRepo.save(triggerStep);

			expect(saved.id).toBeDefined();
			expect(saved.executionId).toBe(executionId);
			expect(saved.stepId).toBe('trigger_webhook');
			expect(saved.stepType).toBe(StepType.Trigger);
			expect(saved.status).toBe(StepStatus.Completed);
			expect(saved.attempt).toBe(1);
		});

		it('should find all steps for an execution via findByExecutionId', async () => {
			await stepRepo.save(
				stepRepo.create({
					executionId,
					stepId: 'trigger',
					stepType: StepType.Trigger,
					status: StepStatus.Completed,
				}),
			);
			await stepRepo.save(
				stepRepo.create({
					executionId,
					stepId: 'step_1',
					stepType: StepType.Step,
					status: StepStatus.Running,
				}),
			);
			await stepRepo.save(
				stepRepo.create({
					executionId,
					stepId: 'step_2',
					stepType: StepType.Step,
					status: StepStatus.Pending,
				}),
			);

			const steps = await stepRepo.findByExecutionId(executionId);
			expect(steps).toHaveLength(3);
		});

		it('should count non-terminal steps via countNonTerminal', async () => {
			await stepRepo.save(
				stepRepo.create({
					executionId,
					stepId: 'trigger',
					stepType: StepType.Trigger,
					status: StepStatus.Completed,
				}),
			);
			await stepRepo.save(
				stepRepo.create({
					executionId,
					stepId: 'step_running',
					stepType: StepType.Step,
					status: StepStatus.Running,
				}),
			);
			await stepRepo.save(
				stepRepo.create({
					executionId,
					stepId: 'step_pending',
					stepType: StepType.Step,
					status: StepStatus.Pending,
				}),
			);
			await stepRepo.save(
				stepRepo.create({
					executionId,
					stepId: 'step_failed',
					stepType: StepType.Step,
					status: StepStatus.Failed,
				}),
			);

			const count = await stepRepo.countNonTerminal(executionId);
			// Running and Pending are non-terminal; Completed and Failed are terminal
			expect(count).toBe(2);
		});

		it('should enforce unique constraint on (executionId, stepId)', async () => {
			await stepRepo.save(
				stepRepo.create({
					executionId,
					stepId: 'unique_step',
					stepType: StepType.Step,
					status: StepStatus.Pending,
				}),
			);

			await expect(
				stepRepo.save(
					stepRepo.create({
						executionId,
						stepId: 'unique_step',
						stepType: StepType.Step,
						status: StepStatus.Running,
					}),
				),
			).rejects.toThrow();
		});

		it('should cascade delete steps when execution is deleted', async () => {
			await stepRepo.save(
				stepRepo.create({
					executionId,
					stepId: 'step_a',
					stepType: StepType.Step,
					status: StepStatus.Completed,
				}),
			);
			await stepRepo.save(
				stepRepo.create({
					executionId,
					stepId: 'step_b',
					stepType: StepType.Step,
					status: StepStatus.Completed,
				}),
			);

			// Verify steps exist
			const stepsBefore = await stepRepo.findByExecutionId(executionId);
			expect(stepsBefore).toHaveLength(2);

			// Delete the execution
			await executionRepo.delete({ id: executionId });

			// Steps should be cascade-deleted
			const stepsAfter = await stepRepo.findByExecutionId(executionId);
			expect(stepsAfter).toHaveLength(0);
		});

		it('should support parent-child step relationships', async () => {
			const parentStep = await stepRepo.save(
				stepRepo.create({
					executionId,
					stepId: 'parent_step',
					stepType: StepType.Step,
					status: StepStatus.Waiting,
				}),
			);

			const childStep = await stepRepo.save(
				stepRepo.create({
					executionId,
					stepId: 'child_step',
					stepType: StepType.Step,
					status: StepStatus.Running,
					parentStepExecutionId: parentStep.id,
				}),
			);

			expect(childStep.parentStepExecutionId).toBe(parentStep.id);

			// Load child with parent relation
			const loadedChild = await stepRepo.findOne({
				where: { id: childStep.id },
				relations: ['parentStep'],
			});
			expect(loadedChild).not.toBeNull();
			expect(loadedChild!.parentStep).not.toBeNull();
			expect(loadedChild!.parentStep!.id).toBe(parentStep.id);
		});
	});
});
