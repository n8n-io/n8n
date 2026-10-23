import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

describe('public API', () => {
	it('does not register the module entrypoint', async () => {
		const metadata = Container.get(ModuleMetadata);
		expect(metadata.get('workflow-builder')).toBeUndefined();

		const publicApi = await import('./index.js');

		expect(metadata.get('workflow-builder')).toBeUndefined();
		expect(Object.keys(publicApi).sort()).toEqual([
			'WorkflowBuilderSession',
			'WorkflowBuilderSessionRepository',
		]);
	});
});
