import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { PageModule } from '../page.module';

describe('PageModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('page')?.class).toBe(PageModule);
	});
});
