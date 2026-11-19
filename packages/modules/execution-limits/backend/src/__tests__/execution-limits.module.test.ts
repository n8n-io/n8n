import { mockInstance } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ExecutionLimitsModule } from '../execution-limits.module';
import { ExecutionLimitsSnapshot } from '../execution-limits-snapshot';
import { ProjectExecutionLimit } from '../project-execution-limit.entity';

describe('ExecutionLimitsModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('execution-limits')?.class).toBe(
			ExecutionLimitsModule,
		);
	});

	it('is gated by the execution limits license feature, so an unlicensed instance skips init', () => {
		expect(Container.get(ModuleMetadata).get('execution-limits')?.licenseFlag).toBe(
			LICENSE_FEATURES.EXECUTION_LIMITS,
		);
	});

	it('loads the limits on init, before the process takes work', async () => {
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

	it('owns the project execution limit entity', async () => {
		const module = new ExecutionLimitsModule();

		expect(await module.entities()).toEqual([ProjectExecutionLimit]);
	});
});
