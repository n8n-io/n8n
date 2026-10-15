import { ControllerRegistryMetadata, ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

describe('packaged module manifest', () => {
	it('loads the Quick Connect package only when requested', async () => {
		const metadata = Container.get(ModuleMetadata);
		const controllers = Container.get(ControllerRegistryMetadata);
		expect(metadata.get('quick-connect')).toBeUndefined();

		const { packagedModules } = await import('../modules.manifest.js');

		expect(metadata.get('quick-connect')).toBeUndefined();
		expect([...controllers.controllerClasses]).toEqual([]);
		const loadQuickConnect = packagedModules['quick-connect'];
		expect(loadQuickConnect).toBeTypeOf('function');
		const entrypoint = await loadQuickConnect?.();
		const packagedEntrypoint = await import('@n8n/backend-module-quick-connect/module');

		expect(entrypoint).toBe(packagedEntrypoint);
		expect(metadata.get('quick-connect')).toEqual({ class: packagedEntrypoint.QuickConnectModule });
		expect([...controllers.controllerClasses]).toEqual([]);
	});
});
