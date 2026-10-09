import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { HelloWorldModule } from '../hello-world.module';

describe('HelloWorldModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('hello-world')?.class).toBe(HelloWorldModule);
	});
});
