import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { DEFAULT_MISFIRE_GRACE_SECONDS, ScheduledJobMisfirePolicy } from '@n8n/constants';
import type { ScheduledJobRepository } from '@n8n/db';
import type { SystemTask, SystemTaskSchedule } from '@n8n/decorators';
import type { ProvisionSummary } from '@n8n/scheduler';
import type { ErrorReporter } from 'n8n-core';
import { inc } from 'semver';
import { mock } from 'vitest-mock-extended';

import { N8N_VERSION } from '@/constants';
import type { EventService } from '@/events/event.service';

import type { DurableJobProvisioner } from '../../durable-job-provisioner';
import { SystemTaskJobRegistrar, systemTaskProvisionRequest } from '../system-task-job-registrar';
import { SystemTaskScheduledJobOwner } from '../system-task-scheduled-job-owner';

const NOW = new Date('2026-01-05T09:00:00.000Z');

const emptySummary: ProvisionSummary = {
	inserted: [],
	redefined: [],
	unchanged: [],
	removed: [],
};

const task = (over: Partial<SystemTask> = {}): SystemTask => ({
	name: 'prune-executions',
	schedule: { kind: 'interval', intervalSeconds: 60 },
	effects: 'idempotent',
	durable: true,
	run: async () => {},
	...over,
});

describe('systemTaskProvisionRequest', () => {
	const owner = new SystemTaskScheduledJobOwner(mock<ScheduledJobRepository>());
	const request = (over: Partial<SystemTask> = {}, defaultTimezone = 'UTC') =>
		systemTaskProvisionRequest(task(over), owner, defaultTimezone, NOW);

	it('owns the job by task name, with no member', () => {
		expect(request().owner).toEqual({
			ownerType: 'system-task',
			ownerId: 'prune-executions',
			ownerMemberId: null,
		});
	});

	it('names the one job after the task and routes it to the task type of the same name', () => {
		const { taskType, desired } = request();

		expect(taskType).toBe('system:prune-executions');
		expect(desired).toHaveLength(1);
		expect(desired[0]?.name).toBe('system:prune-executions');
	});

	it("stamps the payload with this instance's version", () => {
		expect(request().payload).toEqual({ n8nVersion: N8N_VERSION });
	});

	it('seeds an interval task one interval past now', () => {
		expect(request().desired[0]?.firstRunAt).toEqual(new Date('2026-01-05T09:01:00.000Z'));
	});

	it('seeds a task with no timezone of its own in the instance timezone', () => {
		// Now is already past 09:00 Berlin, so the first fire is the next day's, at
		// 08:00Z in January. A UTC fallback would seed it an hour later.
		const { desired } = request(
			{ schedule: { kind: 'cron', cronExpression: '0 0 9 * * *', timezone: null } },
			'Europe/Berlin',
		);

		expect(desired[0]?.firstRunAt).toEqual(new Date('2026-01-06T08:00:00.000Z'));
	});

	it('stores the declared schedule, leaving an absent timezone absent', () => {
		const schedule: SystemTaskSchedule = {
			kind: 'cron',
			cronExpression: '0 0 9 * * *',
			timezone: null,
		};

		const { desired } = request({ schedule }, 'Europe/Berlin');

		expect(desired[0]?.schedule).toEqual(schedule);
	});

	it('stores a fractional interval rounded to whole seconds and seeds from the rounded cadence', () => {
		const { desired } = request({ schedule: { kind: 'interval', intervalSeconds: 89.6 } });

		expect(desired[0]?.schedule).toEqual({ kind: 'interval', intervalSeconds: 90 });
		expect(desired[0]?.firstRunAt).toEqual(new Date('2026-01-05T09:01:30.000Z'));
	});

	it('coalesces and retries idempotent work', () => {
		expect(request({ effects: 'idempotent' })).toMatchObject({
			misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
			misfireGraceSeconds: DEFAULT_MISFIRE_GRACE_SECONDS,
			maxAttempts: 3,
		});
	});

	it('skips and never retries non-idempotent work, even where the task asks for retries', () => {
		expect(request({ effects: 'non-idempotent', maxAttempts: 5 })).toMatchObject({
			misfirePolicy: ScheduledJobMisfirePolicy.Skip,
			maxAttempts: 1,
		});
	});

	it("honours a task's own policy, grace and attempts", () => {
		expect(
			request({
				misfirePolicy: ScheduledJobMisfirePolicy.Skip,
				misfireGraceSeconds: 300,
				maxAttempts: 7,
			}),
		).toMatchObject({
			misfirePolicy: ScheduledJobMisfirePolicy.Skip,
			misfireGraceSeconds: 300,
			maxAttempts: 7,
		});
	});
});

describe('SystemTaskJobRegistrar', () => {
	const stored = (ownerId: string, n8nVersion: string = N8N_VERSION) => ({
		id: ownerId.length,
		ownerId,
		payload: { n8nVersion },
	});
	const asListed = (ownerId: string, n8nVersion: string = N8N_VERSION) => ({
		id: ownerId.length,
		payload: { n8nVersion },
	});

	function setup() {
		const logger = mock<Logger>();
		const durableJobProvisioner = mock<DurableJobProvisioner>();
		durableJobProvisioner.provision.mockResolvedValue(emptySummary);
		durableJobProvisioner.deprovisionUnchangedJob.mockResolvedValue({ removed: 1 });
		const jobs = mock<ScheduledJobRepository>();
		jobs.findPayloadsByOwnerType.mockResolvedValue([]);
		const owner = new SystemTaskScheduledJobOwner(jobs);
		const errorReporter = mock<ErrorReporter>();
		const eventService = mock<EventService>();
		const registrar = new SystemTaskJobRegistrar(
			mock<Logger>({ scoped: vi.fn().mockReturnValue(logger) }),
			jobs,
			durableJobProvisioner,
			owner,
			mock<GlobalConfig>({ generic: { timezone: 'UTC' } }),
			errorReporter,
			eventService,
		);
		return { registrar, durableJobProvisioner, jobs, owner, errorReporter, logger, eventService };
	}

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('provision', () => {
		it('provisions the one job of a task, owned by the task and seeded from now', async () => {
			const { registrar, durableJobProvisioner } = setup();

			await registrar.provision(task());

			expect(durableJobProvisioner.provision).toHaveBeenCalledExactlyOnceWith({
				owner: { ownerType: 'system-task', ownerId: 'prune-executions', ownerMemberId: null },
				taskType: 'system:prune-executions',
				payload: { n8nVersion: N8N_VERSION },
				desired: [
					{
						name: 'system:prune-executions',
						schedule: { kind: 'interval', intervalSeconds: 60 },
						firstRunAt: new Date('2026-01-05T09:01:00.000Z'),
					},
				],
				misfirePolicy: 'coalesce',
				misfireGraceSeconds: 60,
				maxAttempts: 3,
			});
		});

		it('reports a task it cannot provision and resolves', async () => {
			const error = new Error('insert failed');
			const { registrar, durableJobProvisioner, errorReporter, logger } = setup();
			durableJobProvisioner.provision.mockRejectedValueOnce(error);

			await expect(registrar.provision(task())).resolves.toBeUndefined();

			expect(errorReporter.error).toHaveBeenCalledExactlyOnceWith(error, {
				extra: { systemTask: 'prune-executions' },
				shouldBeLogged: false,
				shouldIsolate: true,
			});
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('will not run'), {
				name: 'prune-executions',
				error,
			});
		});

		it('emits a scheduling failure for a task it cannot provision, and nothing for one it can', async () => {
			const { registrar, durableJobProvisioner, eventService } = setup();

			await registrar.provision(task());
			expect(eventService.emit).not.toHaveBeenCalled();

			durableJobProvisioner.provision.mockRejectedValueOnce(new Error('connection lost'));
			await registrar.provision(task());

			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('system-task-scheduling-failed', {
				name: 'prune-executions',
				mode: 'durable',
			});
		});

		it('logs what the provisioning pass changed', async () => {
			const { registrar, durableJobProvisioner, logger } = setup();
			durableJobProvisioner.provision.mockResolvedValue({
				inserted: [{ id: 1, name: 'system:prune-executions' }],
				redefined: [],
				unchanged: [],
				removed: [],
			});

			await registrar.provision(task());

			expect(logger.debug).toHaveBeenCalledWith('Provisioned the durable job of a system task', {
				name: 'prune-executions',
				inserted: 1,
				redefined: 0,
				unchanged: 0,
				removed: 0,
			});
		});
	});

	describe('isProvisioned', () => {
		it('reports a task with a stored job as provisioned', async () => {
			const { registrar, jobs, owner } = setup();
			jobs.existsRunnableByOwner.mockResolvedValue(true);

			await expect(registrar.isProvisioned('prune-executions')).resolves.toBe(true);
			expect(jobs.existsRunnableByOwner).toHaveBeenCalledExactlyOnceWith(
				owner.owner('prune-executions'),
			);
		});

		it('reports a task without a stored job or with only a disabled or quarantined one as not provisioned', async () => {
			const { registrar, jobs } = setup();
			jobs.existsRunnableByOwner.mockResolvedValue(false);

			await expect(registrar.isProvisioned('prune-executions')).resolves.toBe(false);
		});

		it('reports a task as not provisioned and warns when the store cannot be read', async () => {
			const error = new Error('connection lost');
			const { registrar, jobs, logger, errorReporter } = setup();
			jobs.existsRunnableByOwner.mockRejectedValue(error);

			await expect(registrar.isProvisioned('prune-executions')).resolves.toBe(false);
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('durable job'), {
				name: 'prune-executions',
				error,
			});
			expect(errorReporter.error).not.toHaveBeenCalled();
		});

		it('emits a failed provision check when the store cannot be read, and nothing when it can', async () => {
			const { registrar, jobs, eventService } = setup();

			jobs.existsRunnableByOwner.mockResolvedValueOnce(false);
			await registrar.isProvisioned('prune-executions');
			expect(eventService.emit).not.toHaveBeenCalled();

			jobs.existsRunnableByOwner.mockRejectedValueOnce(new Error('connection lost'));
			await registrar.isProvisioned('prune-executions');

			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith(
				'system-task-provision-check-failed',
				{ name: 'prune-executions' },
			);
		});
	});

	describe('findStale', () => {
		it('lists the stored tasks this instance neither runs durably nor a newer version stamped, as read', async () => {
			const { registrar, jobs, owner } = setup();
			owner.declareDurable('prune-executions');
			jobs.findPayloadsByOwnerType.mockResolvedValue([
				stored('prune-executions'),
				stored('compact-insights', inc(N8N_VERSION, 'minor') as string),
				stored('renew-license', '0.0.1'),
				{ id: 4, ownerId: 'clean-jtis', payload: {} },
			]);

			await expect(registrar.findStale()).resolves.toEqual([
				stored('renew-license', '0.0.1'),
				{ id: 4, ownerId: 'clean-jtis', payload: {} },
			]);
			expect(jobs.findPayloadsByOwnerType).toHaveBeenCalledExactlyOnceWith('system-task');
		});

		it('lists nothing when every stored task is accounted for', async () => {
			const { registrar, jobs, owner } = setup();
			owner.declareDurable('prune-executions');
			jobs.findPayloadsByOwnerType.mockResolvedValue([stored('prune-executions')]);

			await expect(registrar.findStale()).resolves.toEqual([]);
		});

		it('rejects when the rows cannot be read', async () => {
			const error = new Error('connection lost');
			const { registrar, jobs } = setup();
			jobs.findPayloadsByOwnerType.mockRejectedValue(error);

			await expect(registrar.findStale()).rejects.toBe(error);
		});
	});

	describe('removeStale', () => {
		it('removes each stale job as it was listed', async () => {
			const { registrar, jobs, durableJobProvisioner } = setup();
			jobs.findPayloadsByOwnerType.mockResolvedValue([stored('gone'), stored('also-gone')]);

			await registrar.removeStale();

			expect(durableJobProvisioner.deprovisionUnchangedJob.mock.calls).toEqual([
				[asListed('gone')],
				[asListed('also-gone')],
			]);
		});

		it('keeps the job of a task declared durable', async () => {
			const { registrar, jobs, owner, durableJobProvisioner } = setup();
			owner.declareDurable('prune-executions');
			jobs.findPayloadsByOwnerType.mockResolvedValue([stored('prune-executions')]);

			await registrar.removeStale();

			expect(durableJobProvisioner.deprovisionUnchangedJob).not.toHaveBeenCalled();
		});

		it('keeps a job a newer version stamped', async () => {
			const { registrar, jobs, durableJobProvisioner } = setup();
			jobs.findPayloadsByOwnerType.mockResolvedValue([
				stored('gone', inc(N8N_VERSION, 'minor') as string),
			]);

			await registrar.removeStale();

			expect(durableJobProvisioner.deprovisionUnchangedJob).not.toHaveBeenCalled();
		});

		it('logs each removed job', async () => {
			const { registrar, jobs, logger } = setup();
			jobs.findPayloadsByOwnerType.mockResolvedValue([stored('gone')]);

			await registrar.removeStale();

			expect(logger.info).toHaveBeenCalledWith('Removed the stale durable job of a system task', {
				name: 'gone',
			});
		});

		it('logs a stale job another instance removed or took over since at debug', async () => {
			const { registrar, jobs, durableJobProvisioner, logger } = setup();
			jobs.findPayloadsByOwnerType.mockResolvedValue([stored('gone')]);
			durableJobProvisioner.deprovisionUnchangedJob.mockResolvedValue({ removed: 0 });

			await registrar.removeStale();

			expect(logger.info).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(
				'Found no durable job to remove for a stale system task',
				{ name: 'gone' },
			);
		});

		it('reports a job it cannot remove and removes the rest', async () => {
			const error = new Error('delete failed');
			const { registrar, jobs, durableJobProvisioner, errorReporter, logger } = setup();
			jobs.findPayloadsByOwnerType.mockResolvedValue([stored('gone-1'), stored('gone-2')]);
			durableJobProvisioner.deprovisionUnchangedJob.mockRejectedValueOnce(error);

			await expect(registrar.removeStale()).resolves.toBeUndefined();

			expect(errorReporter.error).toHaveBeenCalledExactlyOnceWith(error, {
				extra: { systemTask: 'gone-1' },
				shouldBeLogged: false,
				shouldIsolate: true,
			});
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Could not remove'), {
				name: 'gone-1',
				error,
			});
			expect(durableJobProvisioner.deprovisionUnchangedJob).toHaveBeenCalledTimes(2);
		});

		it('reports when the stored jobs cannot be listed and resolves', async () => {
			const error = new Error('connection lost');
			const { registrar, jobs, durableJobProvisioner, errorReporter } = setup();
			jobs.findPayloadsByOwnerType.mockRejectedValue(error);

			await expect(registrar.removeStale()).resolves.toBeUndefined();

			expect(errorReporter.error).toHaveBeenCalledExactlyOnceWith(error, {
				shouldBeLogged: false,
				shouldIsolate: true,
			});
			expect(durableJobProvisioner.deprovisionUnchangedJob).not.toHaveBeenCalled();
		});
	});
});
