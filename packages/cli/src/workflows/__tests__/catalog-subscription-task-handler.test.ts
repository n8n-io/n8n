import type { Logger } from '@n8n/backend-common';
import type {
	ExecutionRepository,
	User,
	UserRepository,
	WorkflowCredentialBindingRepository,
	WorkflowEntity,
	WorkflowSubscription,
	WorkflowSubscriptionRepository,
} from '@n8n/db';
import type { ClaimedTask, DispatchDecision, DispatchReporter } from '@n8n/scheduler';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { ScheduledTriggerIdentityService } from '@/modules/dynamic-credentials.ee/credential-resolvers/identifiers/scheduled-trigger-identity';
import type { CatalogRunService } from '@/workflows/catalog-run.service';
import { CatalogSubscriptionTaskHandler } from '@/workflows/catalog-subscription-task-handler';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const workflow = mock<WorkflowEntity>({ id: 'wf-1', name: 'Weekly report' });

const activeUser = mock<User>({ id: 'user-1', disabled: false });

const task = mock<ClaimedTask>({
	id: 'task-7',
	jobId: 3,
	attempts: 1,
	payload: { subscriptionId: 'sub-1' },
	scheduledFor: new Date('2026-02-01T09:00:00.000Z'),
});

// A plain object rather than a mock: the handler passes `inputs` straight
// through, and a proxy for it would not compare equal to what the assertion
// expects on the other side.
const subscriptionRow = (overrides: Partial<WorkflowSubscription> = {}) =>
	({
		id: 'sub-1',
		workflowId: 'wf-1',
		userId: 'user-1',
		inputs: { customer: 'Acme Corp' },
		enabled: true,
		...overrides,
	}) as WorkflowSubscription;

describe('CatalogSubscriptionTaskHandler', () => {
	let handler: CatalogSubscriptionTaskHandler;
	let subscriptions: ReturnType<typeof mock<WorkflowSubscriptionRepository>>;
	let bindings: ReturnType<typeof mock<WorkflowCredentialBindingRepository>>;
	let userRepository: ReturnType<typeof mock<UserRepository>>;
	let finder: ReturnType<typeof mock<WorkflowFinderService>>;
	let identity: ReturnType<typeof mock<ScheduledTriggerIdentityService>>;
	let catalogRunService: ReturnType<typeof mock<CatalogRunService>>;
	let report: ReturnType<typeof mock<DispatchReporter>>;

	const dispatched = mock<DispatchDecision>();
	const notDispatched = mock<DispatchDecision>();

	beforeEach(() => {
		subscriptions = mock<WorkflowSubscriptionRepository>();
		bindings = mock<WorkflowCredentialBindingRepository>();
		userRepository = mock<UserRepository>();
		finder = mock<WorkflowFinderService>();
		identity = mock<ScheduledTriggerIdentityService>();
		catalogRunService = mock<CatalogRunService>();
		report = mock<DispatchReporter>();

		report.dispatched.mockReturnValue(dispatched);
		report.notDispatched.mockReturnValue(notDispatched);

		subscriptions.findOneById.mockResolvedValue(subscriptionRow());
		userRepository.findOneWithRole.mockResolvedValue(activeUser);
		bindings.isActive.mockResolvedValue(true);
		finder.findWorkflowForUser.mockResolvedValue(workflow);
		identity.mintCredentialContext.mockResolvedValue('encrypted-identity');
		catalogRunService.run.mockResolvedValue({ executionId: 'exec-1' });

		handler = new CatalogSubscriptionTaskHandler(
			mock<Logger>({ scoped: vi.fn().mockReturnThis() }),
			mock<ErrorReporter>(),
			subscriptions,
			bindings,
			userRepository,
			mock<ExecutionRepository>(),
			finder,
			identity,
			catalogRunService,
		);
	});

	it('should run the workflow as the person who subscribed', async () => {
		const decision = await handler.execute(task, report);

		expect(identity.mintCredentialContext).toHaveBeenCalledWith('user-1', 'wf-1');
		expect(catalogRunService.run).toHaveBeenCalledWith(
			workflow,
			activeUser,
			{ customer: 'Acme Corp' },
			expect.objectContaining({ encryptedRunnerIdentity: 'encrypted-identity' }),
		);
		expect(decision).toBe(dispatched);
	});

	it('should tag the run with the occurrence so a redelivery does not run it twice', async () => {
		await handler.execute(task, report);

		expect(catalogRunService.run).toHaveBeenCalledWith(
			workflow,
			expect.anything(),
			expect.anything(),
			expect.objectContaining({ deduplicationKey: '3:2026-02-01T09:00:00.000Z' }),
		);
	});

	describe('checks a live request would have made', () => {
		it('should not run a subscription that is gone', async () => {
			subscriptions.findOneById.mockResolvedValue(null);

			expect(await handler.execute(task, report)).toBe(notDispatched);
			expect(catalogRunService.run).not.toHaveBeenCalled();
		});

		it('should not run a paused subscription', async () => {
			subscriptions.findOneById.mockResolvedValue(subscriptionRow({ enabled: false }));

			expect(await handler.execute(task, report)).toBe(notDispatched);
			expect(catalogRunService.run).not.toHaveBeenCalled();
		});

		it('should not run for a disabled user', async () => {
			userRepository.findOneWithRole.mockResolvedValue(
				mock<User>({ id: 'user-1', disabled: true }),
			);

			expect(await handler.execute(task, report)).toBe(notDispatched);
			expect(catalogRunService.run).not.toHaveBeenCalled();
		});

		it('should not run once consent is withdrawn', async () => {
			bindings.isActive.mockResolvedValue(false);

			expect(await handler.execute(task, report)).toBe(notDispatched);
			expect(catalogRunService.run).not.toHaveBeenCalled();
		});

		it('should not run once execute access is gone', async () => {
			// Revoking project access never touches the binding, so this is the only
			// check that catches it.
			finder.findWorkflowForUser.mockResolvedValue(null);

			expect(await handler.execute(task, report)).toBe(notDispatched);
			expect(catalogRunService.run).not.toHaveBeenCalled();
		});

		it('should not mint an identity for a run it will not make', async () => {
			bindings.isActive.mockResolvedValue(false);

			await handler.execute(task, report);

			expect(identity.mintCredentialContext).not.toHaveBeenCalled();
		});
	});

	it('should reject a payload with no subscription to run', async () => {
		const empty = mock<ClaimedTask>({ id: 'task-8', jobId: 3, payload: {} });

		await expect(handler.execute(empty, report)).rejects.toThrow('missing subscriptionId');
	});
});
