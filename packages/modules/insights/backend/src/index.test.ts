import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

describe('public API', () => {
	it('does not register the module entrypoint', async () => {
		const moduleMetadata = Container.get(ModuleMetadata);

		expect(moduleMetadata.get('insights')).toBeUndefined();

		await import('./index.js');

		expect(moduleMetadata.get('insights')).toBeUndefined();
	});
});
