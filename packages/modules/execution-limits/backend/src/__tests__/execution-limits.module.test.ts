import { LICENSE_FEATURES } from '@n8n/constants';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ExecutionLimitsModule } from '../execution-limits.module';

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
});
