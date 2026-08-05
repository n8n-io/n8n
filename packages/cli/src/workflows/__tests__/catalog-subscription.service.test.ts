import type { Logger } from '@n8n/backend-common';
import type {
	OperationContext,
	TransactionRunner,
	User,
	WorkflowCredentialBindingRepository,
	WorkflowRepository,
	WorkflowSubscription,
	WorkflowEntity,
	WorkflowSubscriptionRepository,
} from '@n8n/db';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import { CATALOG_SUBSCRIPTION_TASK_TYPE } from '@/workflows/catalog-subscription-task';
import {
	CatalogSubscriptionService,
	MAX_SUBSCRIPTIONS_PER_USER,
} from '@/workflows/catalog-subscription.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowInputSchemaService } from '@/workflows/workflow-input-schema.service';

const user = mock<User>({ id: 'user-1' });

const workflow = mock<WorkflowEntity>({ id: 'wf-1', name: 'Weekly report' });

const subscriptionRow = (overrides: Partial<WorkflowSubscription> = {}) =>
	mock<WorkflowSubscription>({
		id: 'sub-1',
		workflowId: 'wf-1',
		userId: 'user-1',
		cronExpression: '0 0 9 * * *',
		timezone: 'Europe/Berlin',
		inputs: {},
		enabled: true,
		...overrides,
	});

const validInput = {
	cronExpression: '0 0 9 * * *',
	timezone: 'Europe/Berlin',
	inputs: {},
	enabled: true,
};

describe('CatalogSubscriptionService', () => {
	let service: CatalogSubscriptionService;
	let txRunner: ReturnType<typeof mock<TransactionRunner>>;
	let subscriptions: ReturnType<typeof mock<WorkflowSubscriptionRepository>>;
	let bindings: ReturnType<typeof mock<WorkflowCredentialBindingRepository>>;
	let workflowRepository: ReturnType<typeof mock<WorkflowRepository>>;
	let finder: ReturnType<typeof mock<WorkflowFinderService>>;
	let schemas: ReturnType<typeof mock<WorkflowInputSchemaService>>;
	let provisioner: ReturnType<typeof mock<DurableJobProvisioner>>;

	beforeEach(() => {
		txRunner = mock<TransactionRunner>();
		subscriptions = mock<WorkflowSubscriptionRepository>();
		bindings = mock<WorkflowCredentialBindingRepository>();
		workflowRepository = mock<WorkflowRepository>();
		finder = mock<WorkflowFinderService>();
		schemas = mock<WorkflowInputSchemaService>();
		provisioner = mock<DurableJobProvisioner>();

		// Run the unit of work inline; the transaction itself is the runner's concern.
		txRunner.run.mockImplementation(
			async (_ctx: OperationContext, fn: (ctx: OperationContext) => Promise<unknown>) =>
				await fn({}),
		);
		finder.findWorkflowForUser.mockResolvedValue(workflow);
		schemas.describe.mockResolvedValue({
			eligible: true,
			trigger: 'execute-workflow-trigger',
			fields: [{ name: 'customer', type: 'string' }],
		});
		subscriptions.countForUser.mockResolvedValue(0);
		subscriptions.createOne.mockResolvedValue(subscriptionRow());

		service = new CatalogSubscriptionService(
			mock<Logger>(),
			txRunner,
			subscriptions,
			bindings,
			workflowRepository,
			finder,
			schemas,
			provisioner,
		);
	});

	describe('create', () => {
		it('should record consent alongside the schedule', async () => {
			await service.create(user, 'wf-1', validInput);

			expect(bindings.grant).toHaveBeenCalledWith('wf-1', 'user-1', expect.anything());
		});

		it('should provision a job for the new subscription', async () => {
			await service.create(user, 'wf-1', validInput);

			expect(provisioner.provisionForOwner).toHaveBeenCalledWith(
				'sub-1',
				CATALOG_SUBSCRIPTION_TASK_TYPE,
				{ subscriptionId: 'sub-1' },
				[expect.objectContaining({ schedule: expect.objectContaining({ kind: 'cron' }) })],
				expect.anything(),
			);
		});

		it('should not stamp the job with a workflow id', async () => {
			// `scheduled_job.workflowId` is a foreign key onto the published version,
			// and a catalog workflow is never published — stamping it would make
			// every provision fail on the constraint.
			await service.create(user, 'wf-1', validInput);

			expect(provisioner.provisionForOwner).not.toHaveBeenCalledWith(
				expect.anything(),
				'wf-1',
				expect.anything(),
				expect.anything(),
				expect.anything(),
				expect.anything(),
			);
		});

		it('should drop values the workflow does not declare', async () => {
			await service.create(user, 'wf-1', {
				...validInput,
				inputs: { customer: 'Acme Corp', secret: 'nope' },
			});

			expect(subscriptions.createOne).toHaveBeenCalledWith(
				'wf-1',
				'user-1',
				expect.objectContaining({ inputs: { customer: 'Acme Corp' } }),
				expect.anything(),
			);
		});

		it('should refuse a schedule the scheduler cannot read', async () => {
			await expect(
				service.create(user, 'wf-1', { ...validInput, cronExpression: 'every thursday-ish' }),
			).rejects.toThrow(UserError);

			// Nothing was written, so a rejected expression leaves no row behind.
			expect(subscriptions.createOne).not.toHaveBeenCalled();
		});

		it('should refuse a workflow that cannot be run directly', async () => {
			schemas.describe.mockResolvedValue({ eligible: false, reason: 'own-schedule' });

			await expect(service.create(user, 'wf-1', validInput)).rejects.toThrow(UserError);
		});

		it('should refuse a workflow whose builder never opened it up', async () => {
			// A manual trigger is enough to run something once with the person there;
			// it is not the builder saying the workflow may run unattended forever.
			schemas.describe.mockResolvedValue({
				eligible: true,
				trigger: 'manual-trigger',
				fields: [],
			});

			await expect(service.create(user, 'wf-1', validInput)).rejects.toThrow(
				'can only be run on demand',
			);
			expect(subscriptions.createOne).not.toHaveBeenCalled();
			expect(bindings.grant).not.toHaveBeenCalled();
		});

		it('should refuse a workflow the person may not execute', async () => {
			finder.findWorkflowForUser.mockResolvedValue(null);

			await expect(service.create(user, 'wf-1', validInput)).rejects.toThrow(UserError);
		});

		it('should refuse once the person holds the maximum', async () => {
			subscriptions.countForUser.mockResolvedValue(MAX_SUBSCRIPTIONS_PER_USER);

			await expect(service.create(user, 'wf-1', validInput)).rejects.toThrow(UserError);
		});

		it('should take the row back out when provisioning fails', async () => {
			provisioner.provisionForOwner.mockRejectedValue(new Error('scheduler down'));

			await expect(service.create(user, 'wf-1', validInput)).rejects.toThrow('scheduler down');

			// Otherwise the person sees a schedule that will never fire.
			expect(subscriptions.deleteOne).toHaveBeenCalledWith('sub-1');
		});

		it('should provision no job for a schedule created paused', async () => {
			subscriptions.createOne.mockResolvedValue(subscriptionRow({ enabled: false }));

			await service.create(user, 'wf-1', { ...validInput, enabled: false });

			expect(provisioner.provisionForOwner).not.toHaveBeenCalled();
			expect(provisioner.deprovisionOwner).toHaveBeenCalledWith(
				'sub-1',
				CATALOG_SUBSCRIPTION_TASK_TYPE,
			);
		});
	});

	describe('update', () => {
		beforeEach(() => {
			subscriptions.findOneForUser.mockResolvedValue(subscriptionRow());
		});

		it('should reject a subscription belonging to someone else', async () => {
			subscriptions.findOneForUser.mockResolvedValue(null);

			await expect(service.update(user, 'sub-1', validInput)).rejects.toThrow(UserError);
		});

		it('should refuse once the workflow no longer declares a callable trigger', async () => {
			// The builder can take the Execute Workflow Trigger back out after someone
			// subscribed; changing the schedule must not quietly re-bless it.
			schemas.describe.mockResolvedValue({
				eligible: true,
				trigger: 'manual-trigger',
				fields: [],
			});

			await expect(service.update(user, 'sub-1', validInput)).rejects.toThrow(
				'can only be run on demand',
			);
		});

		it('should remove the job when the schedule is paused', async () => {
			await service.update(user, 'sub-1', { ...validInput, enabled: false });

			expect(provisioner.deprovisionOwner).toHaveBeenCalledWith(
				'sub-1',
				CATALOG_SUBSCRIPTION_TASK_TYPE,
			);
		});

		it('should restore the previous values when provisioning fails', async () => {
			provisioner.provisionForOwner.mockRejectedValue(new Error('scheduler down'));

			await expect(
				service.update(user, 'sub-1', { ...validInput, cronExpression: '0 30 6 * * *' }),
			).rejects.toThrow('scheduler down');

			// The last write must put back what the row said before, not leave it
			// describing a schedule the scheduler refused.
			expect(subscriptions.updateOne).toHaveBeenLastCalledWith(
				'sub-1',
				expect.objectContaining({ cronExpression: '0 0 9 * * *' }),
			);
		});
	});

	describe('remove', () => {
		it('should deprovision before deleting the row', async () => {
			subscriptions.findOneForUser.mockResolvedValue(subscriptionRow());
			const order: string[] = [];
			provisioner.deprovisionOwner.mockImplementation(async () => {
				order.push('deprovision');
				return { removed: 1 };
			});
			subscriptions.deleteOne.mockImplementation(async () => {
				order.push('delete');
			});

			await service.remove(user, 'sub-1');

			// A deleted row leaves no way to find the jobs it owned.
			expect(order).toEqual(['deprovision', 'delete']);
		});

		it('should leave the row alone when deprovisioning fails', async () => {
			subscriptions.findOneForUser.mockResolvedValue(subscriptionRow());
			provisioner.deprovisionOwner.mockRejectedValue(new Error('scheduler down'));

			await expect(service.remove(user, 'sub-1')).rejects.toThrow('scheduler down');

			expect(subscriptions.deleteOne).not.toHaveBeenCalled();
		});
	});

	describe('revokeConsent', () => {
		it('should take every schedule for the workflow down before revoking', async () => {
			subscriptions.findEnabledForBinding.mockResolvedValue([
				subscriptionRow({ id: 'sub-1' }),
				subscriptionRow({ id: 'sub-2' }),
			]);

			await service.revokeConsent(user, 'wf-1');

			expect(provisioner.deprovisionOwner).toHaveBeenCalledWith(
				'sub-1',
				CATALOG_SUBSCRIPTION_TASK_TYPE,
			);
			expect(provisioner.deprovisionOwner).toHaveBeenCalledWith(
				'sub-2',
				CATALOG_SUBSCRIPTION_TASK_TYPE,
			);
			expect(bindings.revoke).toHaveBeenCalledWith('wf-1', 'user-1', expect.anything());
		});
	});
});
