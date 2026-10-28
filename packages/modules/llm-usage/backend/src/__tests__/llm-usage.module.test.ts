import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { LlmUsageModule } from '../llm-usage.module';

describe('LlmUsageModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('llm-usage')?.class).toBe(LlmUsageModule);
	});
});
