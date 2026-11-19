import { mockInstance } from '@n8n/backend-test-utils';
import { FoldStepRegistry } from '@n8n/db';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { ExecutionLimitInstanceUsage } from '../execution-limit-instance-usage.entity';
import { ExecutionLimitUsage } from '../execution-limit-usage.entity';
import { ExecutionLimitsModule } from '../execution-limits.module';
import { ExecutionLimitsSnapshot } from '../execution-limits-snapshot';
import { ProjectExecutionLimit } from '../project-execution-limit.entity';

describe('ExecutionLimitsModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('execution-limits')?.class).toBe(
			ExecutionLimitsModule,
		);
	});

	it('has no license flag, so init runs on an unlicensed instance', () => {
		expect(Container.get(ModuleMetadata).get('execution-limits')?.licenseFlag).toBeUndefined();
	});

	it('init registers the usage fold step', async () => {
		const registry = new FoldStepRegistry();
		Container.set(FoldStepRegistry, registry);
		// The repository of the step reads the manager when it is built.
		Container.set(DataSource, { manager: {} } as unknown as DataSource);
		mockInstance(ExecutionLimitsSnapshot);

		await new ExecutionLimitsModule().init();

		expect(registry.getAll().map((step) => step.name)).toEqual(['execution_limit_usage']);
	});

	it('loads the limits on init, before the process takes work', async () => {
		Container.set(FoldStepRegistry, new FoldStepRegistry());
		Container.set(DataSource, { manager: {} } as unknown as DataSource);
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

	it('owns the project limit entity and the two usage entities', async () => {
		const module = new ExecutionLimitsModule();

		expect(await module.entities()).toEqual([
			ProjectExecutionLimit,
			ExecutionLimitUsage,
			ExecutionLimitInstanceUsage,
		]);
	});
});
