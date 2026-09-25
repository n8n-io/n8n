import { mockInstance, mockLogger, testDb } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { ScheduledJob, ScheduledTask } from '@n8n/db';
import {
	DataSource,
	ScheduledJobRepository,
	ScheduledTaskRepository,
	SettingsRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { Scheduler, SchedulerPasses } from '@n8n/scheduler';
import type { InstanceSettings } from 'n8n-core';
import { Tracing } from 'n8n-core';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { SETTINGS_LICENSE_CERT_KEY } from '@/constants';
import type { EventService } from '@/events/event.service';
import { License } from '@/license';
import { LicenseRenewalTask } from '@/license/license-renewal.task';
import type { LicenseMetricsService } from '@/metrics/license-metrics.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';
import { SystemTaskHandler } from '@/scheduling/system-tasks/system-task-handler';
import { systemTaskProvisionRequest } from '@/scheduling/system-tasks/system-task-job-registrar';
import { SystemTaskScheduledJobOwner } from '@/scheduling/system-tasks/system-task-scheduled-job-owner';
import { systemTaskType } from '@/scheduling/system-tasks/system-task-type';

import { retryUntil } from '../shared/retry-until';

const { fakeLicenseServer, FakeLicenseManager } = vi.hoisted(() => {
	const HOUR_MS = 60 * 60 * 1000;
	const RENEWED_VALIDITY_MS = 10 * 24 * HOUR_MS;

	type FakeCert = { token: string; expiresAt: string };

	/** Rotates the renewal token on every renewal and rejects a token it rotated away. */
	const server = {
		token: 'token-0',
		requests: 0,
		rotations: 0,
		rejected: 0,
		failNext: null as Error | null,
		reset(): void {
			this.token = 'token-0';
			this.requests = 0;
			this.rotations = 0;
			this.rejected = 0;
			this.failNext = null;
		},
		issue(validForMs: number): string {
			const cert: FakeCert = {
				token: this.token,
				expiresAt: new Date(Date.now() + validForMs).toISOString(),
			};
			return JSON.stringify(cert);
		},
		renew(token: string): string {
			this.requests++;
			if (this.failNext) {
				const error = this.failNext;
				this.failNext = null;
				throw error;
			}
			if (token !== this.token) {
				this.rejected++;
				throw new Error('license renewal failed: invalid renewal token');
			}
			this.rotations++;
			this.token = `token-${this.rotations}`;
			return this.issue(RENEWED_VALIDITY_MS);
		},
	};

	type FakeConfig = {
		autoRenewOffset: number;
		loadCertStr: () => Promise<string>;
		saveCertStr: (cert: string) => Promise<void>;
		onLicenseRenewed?: () => Promise<void>;
	};

	/** Renews a due cert against the fake server through the store callbacks. */
	class FakeLicenseManager {
		private cert: FakeCert | undefined;

		constructor(private readonly config: FakeConfig) {}

		async initialize(): Promise<void> {
			await this.initCert();
		}

		async reload(): Promise<void> {
			await this.initCert();
		}

		async renewIfDue(): Promise<void> {
			if (!this.isRenewalDue()) return;
			const renewed = server.renew(this.cert!.token);
			await this.config.saveCertStr(renewed);
			void this.config.onLicenseRenewed?.();
			await this.initCert();
		}

		getExpiryDate(): Date {
			if (!this.cert) throw new Error('Cert is not initialized');
			return new Date(this.cert.expiresAt);
		}

		private isRenewalDue(): boolean {
			if (!this.cert) return false;
			const offsetMs = this.config.autoRenewOffset * 1000;
			return Date.now() > new Date(this.cert.expiresAt).getTime() - offsetMs;
		}

		private async initCert(): Promise<void> {
			const stored = await this.config.loadCertStr();
			this.cert = stored ? (JSON.parse(stored) as FakeCert) : undefined;
		}
	}

	return { fakeLicenseServer: server, FakeLicenseManager };
});

vi.mock('@n8n_io/license-sdk', () => ({
	AUTORENEWAL_INTERVAL: 900_000,
	LicenseManager: FakeLicenseManager,
}));

type Main = {
	scheduler: Scheduler & SchedulerPasses;
	license: License;
	task: LicenseRenewalTask;
	onRunError: Mock<(error: unknown) => void>;
};

const TASK_TYPE = systemTaskType('license-renewal');
const INSTANCE_ID = 'a'.repeat(32);
const DUE_VALIDITY_MS = 60 * 60 * 1000;

const certExpiry = (cert: string): Date =>
	new Date((JSON.parse(cert) as { expiresAt: string }).expiresAt);
const certToken = (cert: string): string => (JSON.parse(cert) as { token: string }).token;

/**
 * The license renewal task on the durable scheduler, over one database and two
 * mains. The scheduler, handler, task and `License` are the production classes;
 * the SDK is a fake and the license server is in memory.
 */
describe('license renewal across two mains over one database', () => {
	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let settingsRepo: SettingsRepository;
	let owner: SystemTaskScheduledJobOwner;
	let provisioner: DurableJobProvisioner;

	let publishCommand: Mock<Publisher['publishCommand']>;
	let initialCert: string;
	let a: Main;
	let b: Main;

	const buildLicense = (hostId: string, isLeader: boolean): License =>
		new License(
			mockLogger(),
			mock<InstanceSettings>({ instanceType: 'main', hostId, isLeader, instanceId: INSTANCE_ID }),
			settingsRepo,
			mock<LicenseMetricsService>(),
			mock<GlobalConfig>({
				license: {
					serverUrl: 'https://license.example.com/v1',
					autoRenewalEnabled: true,
					detachFloatingOnShutdown: false,
					activationKey: '',
					tenantId: 1,
					cert: '',
				},
				executions: { mode: 'queue' },
			}),
		);

	const buildMain = (hostId: string, license: License): Main => {
		const scheduler = createScheduler({
			hostId,
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
			executor: { leaseSeconds: 30, lookaheadSeconds: 5, batchSize: 5 },
		});
		const task = new LicenseRenewalTask(license);
		const onRunError = vi.fn<(error: unknown) => void>();
		scheduler.registerTaskHandler(
			TASK_TYPE,
			new SystemTaskHandler(
				task,
				new AbortController().signal,
				mockLogger(),
				mock<EventService>(),
				new Tracing(),
				onRunError,
			),
		);
		return { scheduler, license, task, onRunError };
	};

	const provisionJob = async (task: LicenseRenewalTask): Promise<ScheduledJob> => {
		await provisioner.provision(systemTaskProvisionRequest(task, owner, 'UTC', new Date()));
		return await jobRepo.findOneByOrFail({ name: TASK_TYPE });
	};

	const seedDueOccurrence = async (job: ScheduledJob): Promise<ScheduledTask> => {
		const past = new Date(Date.now() - 1000);
		return await taskRepo.save(
			taskRepo.create({
				jobId: job.id,
				taskType: job.taskType,
				payload: job.payload,
				scheduledFor: past,
				runAt: past,
				status: 'pending',
				maxAttempts: job.maxAttempts,
			}),
		);
	};

	const statusOf = async (occurrence: ScheduledTask): Promise<string> =>
		(await taskRepo.findOneByOrFail({ id: occurrence.id })).status;

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		settingsRepo = Container.get(SettingsRepository);
		owner = Container.get(SystemTaskScheduledJobOwner);
		provisioner = Container.get(DurableJobProvisioner);
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
		await settingsRepo.delete({ key: SETTINGS_LICENSE_CERT_KEY });
		fakeLicenseServer.reset();
		publishCommand = vi.fn<Publisher['publishCommand']>();
		mockInstance(Publisher, { publishCommand });

		const licenseA = buildLicense('main-a', true);
		const licenseB = buildLicense('main-b', false);
		initialCert = fakeLicenseServer.issue(DUE_VALIDITY_MS);
		await licenseA.saveCertStr(initialCert);
		await licenseA.init();
		await licenseB.init();
		a = buildMain('main-a', licenseA);
		b = buildMain('main-b', licenseB);
	});

	afterEach(async () => {
		await a.scheduler.stop();
		await b.scheduler.stop();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('renews once when both mains claim the due occurrence at the same instant', async () => {
		const job = await provisionJob(a.task);
		const occurrence = await seedDueOccurrence(job);

		const [claimedA, claimedB] = await Promise.all([a.scheduler.execute(), b.scheduler.execute()]);

		expect(claimedA.length + claimedB.length).toBe(1);
		await retryUntil(async () => expect(await statusOf(occurrence)).toBe('succeeded'));
		expect(fakeLicenseServer).toMatchObject({ requests: 1, rotations: 1, rejected: 0 });
		expect(certToken(await a.license.loadCertStr())).toBe(fakeLicenseServer.token);
		await retryUntil(() => expect(publishCommand).toHaveBeenCalledTimes(1));
		expect(publishCommand).toHaveBeenCalledWith({ command: 'reload-license' });

		await a.license.reload();
		await b.license.reload();
		const renewedExpiry = certExpiry(await a.license.loadCertStr());
		expect(a.license.getExpiryDate()).toEqual(renewedExpiry);
		expect(b.license.getExpiryDate()).toEqual(renewedExpiry);
	}, 15_000);

	it('renews and broadcasts from the non-leader main when it alone claims the due occurrence', async () => {
		const job = await provisionJob(a.task);
		const occurrence = await seedDueOccurrence(job);

		expect(await b.scheduler.execute()).toHaveLength(1);

		await retryUntil(async () => expect(await statusOf(occurrence)).toBe('succeeded'));
		expect(fakeLicenseServer).toMatchObject({ requests: 1, rotations: 1, rejected: 0 });
		await retryUntil(() => expect(publishCommand).toHaveBeenCalledTimes(1));
		expect(publishCommand).toHaveBeenCalledWith({ command: 'reload-license' });
		expect(b.onRunError).not.toHaveBeenCalled();
		const storedToken = certToken(await b.license.loadCertStr());
		expect(storedToken).toBe(fakeLicenseServer.token);
		expect(b.license.getExpiryDate()).not.toEqual(certExpiry(initialCert));
		expect(a.license.getExpiryDate()).toEqual(certExpiry(initialCert));
	}, 15_000);

	it('records a failed pass as failed after one attempt and never retries it', async () => {
		const job = await provisionJob(a.task);
		const occurrence = await seedDueOccurrence(job);
		fakeLicenseServer.failNext = new Error('Connection Error: license server unreachable');

		expect(await a.scheduler.execute()).toHaveLength(1);

		await retryUntil(async () => expect(await statusOf(occurrence)).toBe('failed'));
		expect(await taskRepo.findOneByOrFail({ id: occurrence.id })).toMatchObject({
			attempts: 1,
			errorMessage: 'Connection Error: license server unreachable',
		});
		expect(a.onRunError).toHaveBeenCalledTimes(1);
		expect(await a.scheduler.execute()).toEqual([]);
		expect(await b.scheduler.execute()).toEqual([]);
		expect(await b.scheduler.reap()).toEqual({ reclaimed: 0, deadLettered: 0, missed: 0 });
		expect(await a.license.loadCertStr()).toBe(initialCert);
		expect(fakeLicenseServer).toMatchObject({ requests: 1, rotations: 0 });
	}, 15_000);
});
