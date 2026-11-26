import { LicenseState, type Logger } from '@n8n/backend-common';
import { ProjectMutationHooksProxy } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { FoldStepRegistry } from '@n8n/db';
import { ControllerRegistryMetadata, ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { ExecutionLimitAudit } from '../execution-limit-audit.entity';
import { ExecutionLimitInstanceUsage } from '../execution-limit-instance-usage.entity';
import { ExecutionLimitUsage } from '../execution-limit-usage.entity';
import { ExecutionLimitsModule } from '../execution-limits.module';
import { ExecutionLimitsService } from '../execution-limits.service';
import { ExecutionLimitsSnapshot } from '../execution-limits-snapshot';
import { ProjectExecutionLimit } from '../project-execution-limit.entity';

describe('ExecutionLimitsModule', () => {
	let registry: FoldStepRegistry;
	let hooks: ProjectMutationHooksProxy;
	let licenseState: ReturnType<typeof mockInstance<LicenseState>>;

	beforeEach(() => {
		licenseState = mockInstance(LicenseState);
		registry = new FoldStepRegistry();
		Container.set(FoldStepRegistry, registry);
		hooks = new ProjectMutationHooksProxy(mock<Logger>());
		Container.set(ProjectMutationHooksProxy, hooks);
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

	it('registers the fold step and controller but does not load the limits when unlicensed', async () => {
		const controllerMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerMetadata);
		licenseState.isExecutionLimitsLicensed.mockReturnValue(false);
		const snapshot = mockInstance(ExecutionLimitsSnapshot);

		expect([...controllerMetadata.controllerClasses]).toEqual([]);

		await new ExecutionLimitsModule().init();

		const registeredControllers = [...controllerMetadata.controllerClasses];
		expect(registry.getAll().map((step) => step.name)).toEqual(['execution_limit_usage']);
		expect(registeredControllers).toHaveLength(1);
		const { ExecutionLimitsController } = await import('../execution-limits.controller.js');
		expect(registeredControllers).toEqual([ExecutionLimitsController]);
		expect(
			controllerMetadata.getControllerMetadata(ExecutionLimitsController as never).basePath,
		).toBe('/execution-limits');
		expect(snapshot.start).not.toHaveBeenCalled();
	});

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

	it('applies the default limit to a new team project when the license turns on after boot', async () => {
		licenseState.isExecutionLimitsLicensed.mockReturnValue(false);
		const service = mockInstance(ExecutionLimitsService);

		await new ExecutionLimitsModule().init();

		licenseState.isExecutionLimitsLicensed.mockReturnValue(true);
		await hooks.afterTeamProjectCreated('project-1');

		expect(service.applyDefaultLimitToNewProject).toHaveBeenCalledWith('project-1');
	});

	it('does not apply the default limit to a new team project when the license turns off after boot', async () => {
		licenseState.isExecutionLimitsLicensed.mockReturnValue(true);
		const snapshot = mockInstance(ExecutionLimitsSnapshot);
		snapshot.start.mockResolvedValue();
		const service = mockInstance(ExecutionLimitsService);

		await new ExecutionLimitsModule().init();

		licenseState.isExecutionLimitsLicensed.mockReturnValue(false);
		await hooks.afterTeamProjectCreated('project-1');

		expect(service.applyDefaultLimitToNewProject).not.toHaveBeenCalled();
	});

	it('owns the project limit entity, the two usage entities and the audit entity', async () => {
		const module = new ExecutionLimitsModule();

		expect(await module.entities()).toEqual([
			ProjectExecutionLimit,
			ExecutionLimitUsage,
			ExecutionLimitInstanceUsage,
			ExecutionLimitAudit,
		]);
	});
});
