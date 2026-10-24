import type { OperationContext } from '@n8n/db';
import type { Lease, LeaseKindOptions } from '@n8n/leases';
import { LeaseEndedError } from '@n8n/leases';
import type { ClaimedTask, HoldReporter, HoldTaskHandler } from '@n8n/scheduler';
import { HolderShutdownError, LeaseLostError, TaskTimeoutError } from '@n8n/scheduler';
import { mock } from 'vitest-mock-extended';

import type {
	LeaseFenceCheck,
	LeaseProvisioner,
	LeaseScheduler,
} from '../durable-scheduler-lease-provider';
import {
	DurableSchedulerLeaseProvider,
	MAX_LEASE_KEY_LENGTH,
} from '../durable-scheduler-lease-provider';

const OPTIONS: LeaseKindOptions = { startTimeoutSeconds: 30, maxFailedStarts: 4, leaseSeconds: 20 };

const setup = () => {
	const scheduler = mock<LeaseScheduler>();
	const provisioner = mock<LeaseProvisioner>();
	const fence = mock<LeaseFenceCheck>();
	const provider = new DurableSchedulerLeaseProvider(scheduler, provisioner, fence, 'main-a');
	return { scheduler, provisioner, fence, provider };
};

const claimedTask = (payload: Record<string, unknown>): ClaimedTask => ({
	id: '7',
	jobId: 3,
	taskType: 'lease:workflow-trigger',
	payload,
	scheduledFor: new Date(0),
	runAt: new Date(0),
	status: 'running',
	attempts: 0,
	maxAttempts: 4,
	timeoutSeconds: 30,
	leaseEpoch: 12,
	mode: 'hold',
});

const registeredHandler = (scheduler: ReturnType<typeof setup>['scheduler']): HoldTaskHandler => {
	const [taskType, handler] = scheduler.registerHoldTaskHandler.mock.calls[0];
	expect(taskType).toBe('lease:workflow-trigger');
	return handler;
};

describe('DurableSchedulerLeaseProvider', () => {
	it('hands a held task to the kind as a lease fenced by the lease epoch', async () => {
		const { scheduler, provider } = setup();
		const hold = vi.fn(async (_lease: Lease<OperationContext>) => {});
		provider.registerHolder('workflow-trigger', OPTIONS, hold);
		const holder = mock<HoldReporter>();

		await registeredHandler(scheduler).hold(
			claimedTask({ key: 'wf-1:node-1', data: { topic: 'orders' } }),
			holder,
			{ signal: new AbortController().signal },
		);

		const [lease] = hold.mock.calls[0];
		expect(lease).toMatchObject({
			kind: 'workflow-trigger',
			key: 'wf-1:node-1',
			data: { topic: 'orders' },
			fencingToken: 12,
		});
		await lease.ready();
		expect(holder.ready).toHaveBeenCalledOnce();
	});

	it.each([true, false])(
		'answers the lease fence from the held task claim of this host (%s)',
		async (held) => {
			const { scheduler, fence, provider } = setup();
			let lease: Lease<OperationContext> | undefined;
			provider.registerHolder('workflow-trigger', OPTIONS, async (l) => {
				lease = l;
			});
			fence.isHeld.mockResolvedValue(held);
			const ctx = mock<OperationContext>();

			await registeredHandler(scheduler).hold(
				claimedTask({ key: 'wf-1:node-1', data: {} }),
				mock<HoldReporter>(),
				{ signal: new AbortController().signal },
			);

			await expect(lease?.isHeld(ctx)).resolves.toBe(held);
			expect(fence.isHeld).toHaveBeenCalledWith({ id: '7', claimedEpoch: 12, host: 'main-a' }, ctx);
		},
	);

	it.each([
		[new HolderShutdownError(), 'shutdown'],
		[new TaskTimeoutError(30), 'start-timeout'],
		[new LeaseLostError(), 'lost'],
	] as const)('ends the lease with %s mapped to %s', async (runReason, leaseReason) => {
		const { scheduler, provider } = setup();
		let signal: AbortSignal | undefined;
		provider.registerHolder('workflow-trigger', OPTIONS, async (lease) => {
			signal = lease.signal;
		});
		const run = new AbortController();

		await registeredHandler(scheduler).hold(
			claimedTask({ key: 'wf-1:node-1', data: {} }),
			mock<HoldReporter>(),
			{ signal: run.signal },
		);
		run.abort(runReason);

		expect(signal?.reason).toEqual(new LeaseEndedError(leaseReason));
	});

	it('rejects a held task with an invalid payload', async () => {
		const { scheduler, provider } = setup();
		provider.registerHolder('workflow-trigger', OPTIONS, async () => {});

		await expect(
			registeredHandler(scheduler).hold(claimedTask({ key: 1 }), mock<HoldReporter>(), {
				signal: new AbortController().signal,
			}),
		).rejects.toThrow('Held lease task has an invalid payload');
	});

	it('claims the owner type for liveness', async () => {
		const { scheduler, provider } = setup();
		const findDesired = vi.fn(async () => new Set(['wf-1:node-1']));

		provider.registerLiveness('workflow-trigger', findDesired);

		const [ownerType, resolver] = scheduler.registerJobOwner.mock.calls[0];
		expect(ownerType).toBe('lease:workflow-trigger');
		await expect(resolver.findExisting(['wf-1:node-1', 'wf-2:node-1'])).resolves.toEqual(
			new Set(['wf-1:node-1']),
		);
	});

	it('syncs one hold job per lease with the kind options', async () => {
		const { provisioner, provider } = setup();
		provider.registerHolder('workflow-trigger', OPTIONS, async () => {});

		await provider.sync(
			'workflow-trigger',
			[{ key: 'wf-1:node-1', data: { n: 1 } }],
			['wf-1:node-1'],
		);

		expect(provisioner.sync).toHaveBeenCalledWith(
			'lease:workflow-trigger',
			[
				{
					name: 'lease:workflow-trigger:wf-1:node-1',
					owner: {
						ownerType: 'lease:workflow-trigger',
						ownerId: 'wf-1:node-1',
						ownerMemberId: null,
					},
					taskType: 'lease:workflow-trigger',
					payload: { key: 'wf-1:node-1', data: { n: 1 } },
					timeoutSeconds: 30,
					maxAttempts: 4,
					leaseSeconds: 20,
				},
			],
			['wf-1:node-1'],
		);
	});

	it.each(['', 'k'.repeat(MAX_LEASE_KEY_LENGTH + 1)])(
		'rejects a lease key of length %#',
		async (key) => {
			const { provider } = setup();
			provider.registerHolder('workflow-trigger', OPTIONS, async () => {});

			await expect(provider.sync('workflow-trigger', [{ key, data: {} }])).rejects.toThrow(
				'Lease key is empty or too long',
			);
		},
	);

	it('rejects a sync for a kind with no holder', async () => {
		await expect(setup().provider.sync('workflow-trigger', [])).rejects.toThrow(
			'Lease kind has no registered holder',
		);
	});
});
