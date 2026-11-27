import { LicenseState } from '@n8n/backend-common';
import { ProjectMutationHooksProxy } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { FoldStepRegistry } from '@n8n/db';
import { ModuleMetadata, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { InstanceSettings } from 'n8n-core';

import { ExecutionLimitAudit } from '../execution-limit-audit.entity';
import { ExecutionLimitInstanceUsage } from '../execution-limit-instance-usage.entity';
import { ExecutionLimitPolicy } from '../execution-limit-policy.entity';
import { ExecutionLimitPolicyAssignment } from '../execution-limit-policy-assignment.entity';
import { ExecutionLimitPolicyGroupAssignment } from '../execution-limit-policy-group-assignment.entity';
import { ExecutionLimitUsage } from '../execution-limit-usage.entity';
import { ExecutionLimitUsagePruningTask } from '../execution-limit-usage-pruning.task';
import { ExecutionUsageCache } from '../execution-usage-cache';
import { ExecutionLimitsModule } from '../execution-limits.module';
import { ExecutionLimitsSnapshot } from '../execution-limits-snapshot';

const registeredCheckNames = () =>
	Container.get(PolicyCheckMetadata)
		.getClasses()
		.map((checkClass) => checkClass.name);

describe('ExecutionLimitsModule', () => {
	let registry: FoldStepRegistry;
	let licenseState: ReturnType<typeof mockInstance<LicenseState>>;
	let usageCache: ReturnType<typeof mockInstance<ExecutionUsageCache>>;
	let hooks: ReturnType<typeof mockInstance<ProjectMutationHooksProxy>>;

	beforeEach(() => {
		licenseState = mockInstance(LicenseState);
		usageCache = mockInstance(ExecutionUsageCache);
		hooks = mockInstance(ProjectMutationHooksProxy);
		mockInstance(ExecutionLimitsSnapshot);
		mockInstance(InstanceSettings, { instanceType: 'main' });
		registry = new FoldStepRegistry();
		Container.set(FoldStepRegistry, registry);
		// The repository of the step reads the manager when it is built.
		Container.set(DataSource, { manager: {} } as unknown as DataSource);
	});

	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('execution-limits')?.class).toBe(
			ExecutionLimitsModule,
		);
	});

	it('has no license flag, so init runs on an unlicensed instance', () => {
		expect(Container.get(ModuleMetadata).get('execution-limits')?.licenseFlag).toBeUndefined();
	});

	it('registers the fold step but does not load the limits when unlicensed', async () => {
		licenseState.isExecutionLimitsLicensed.mockReturnValue(false);
		const snapshot = mockInstance(ExecutionLimitsSnapshot);

		await new ExecutionLimitsModule().init();

		expect(registry.getAll().map((step) => step.name)).toEqual(['execution_limit_usage']);
		expect(snapshot.start).not.toHaveBeenCalled();
		expect(usageCache.start).not.toHaveBeenCalled();
	});

	const registeredHookNames = () =>
		hooks.registerProvider.mock.calls.flatMap(([provider]) => Object.keys(provider));

	it('registers the project delete hook when unlicensed, and not the project create hook', async () => {
		licenseState.isExecutionLimitsLicensed.mockReturnValue(false);

		await new ExecutionLimitsModule().init();

		expect(registeredHookNames()).toEqual(['beforeProjectDeleted']);
	});

	it('registers both project hooks when licensed', async () => {
		licenseState.isExecutionLimitsLicensed.mockReturnValue(true);

		await new ExecutionLimitsModule().init();

		expect(registeredHookNames().sort()).toEqual([
			'afterTeamProjectCreated',
			'beforeProjectDeleted',
		]);
	});

	// By class name: importing the check here would register it and make the test vacuous.
	it('registers the execution limit check when licensed', async () => {
		licenseState.isExecutionLimitsLicensed.mockReturnValue(true);

		await new ExecutionLimitsModule().init();

		expect(registeredCheckNames()).toContain('ExecutionLimitPolicyCheck');
	});

	it.each([
		['worker', 0],
		['main', 1],
		['webhook', 1],
	] as const)(
		'on a %s instance starts the usage cache %i times when licensed',
		async (instanceType, calls) => {
			licenseState.isExecutionLimitsLicensed.mockReturnValue(true);
			mockInstance(InstanceSettings, { instanceType });

			await new ExecutionLimitsModule().init();

			expect(usageCache.start).toHaveBeenCalledTimes(calls);
		},
	);

	it('loads the limits on init, before the process takes work', async () => {
		licenseState.isExecutionLimitsLicensed.mockReturnValue(true);
		const snapshot = mockInstance(ExecutionLimitsSnapshot);
		let finishStart = () => {};
		snapshot.start.mockReturnValue(new Promise<void>((resolve) => (finishStart = resolve)));
		const onInitDone = vi.fn();

		const init = new ExecutionLimitsModule().init().then(onInitDone);
		await vi.waitFor(() => expect(snapshot.start).toHaveBeenCalledTimes(1));
		await new Promise(setImmediate);
		expect(onInitDone).not.toHaveBeenCalled();

		finishStart();
		await init;
		expect(onInitDone).toHaveBeenCalledTimes(1);
	});

	it('owns the policy entities, the two usage entities and the audit entity', async () => {
		const module = new ExecutionLimitsModule();

		expect(await module.entities()).toEqual([
			ExecutionLimitPolicy,
			ExecutionLimitPolicyAssignment,
			ExecutionLimitPolicyGroupAssignment,
			ExecutionLimitUsage,
			ExecutionLimitInstanceUsage,
			ExecutionLimitAudit,
		]);
	});

	it('declares the usage pruning task', async () => {
		expect(await new ExecutionLimitsModule().systemTasks()).toEqual([
			ExecutionLimitUsagePruningTask,
		]);
	});
});
