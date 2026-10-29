import { ControllerRegistryMetadata, ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

describe('package entrypoints', () => {
	it('loads registration only through the module entrypoint', async () => {
		const moduleMetadata = Container.get(ModuleMetadata);
		const controllerMetadata = Container.get(ControllerRegistryMetadata);

		expect(moduleMetadata.get('quick-connect')).toBeUndefined();
		expect([...controllerMetadata.controllerClasses]).toEqual([]);

		const publicApi = await import('./index.js');

		expect(Object.keys(publicApi)).toEqual([]);
		expect(moduleMetadata.get('quick-connect')).toBeUndefined();
		expect([...controllerMetadata.controllerClasses]).toEqual([]);

		const { QuickConnectModule } = await import('./quick-connect.module.js');

		expect(moduleMetadata.get('quick-connect')).toEqual({ class: QuickConnectModule });
		expect([...controllerMetadata.controllerClasses]).toEqual([]);

		const { QuickConnectService } = await import('./quick-connect.service.js');
		const registerHandlers = vi
			.spyOn(QuickConnectService.prototype, 'registerHandlers')
			.mockImplementation(async () => {
				expect([...controllerMetadata.controllerClasses]).toEqual([]);
			});

		await new QuickConnectModule().init();

		expect(registerHandlers).toHaveBeenCalledOnce();
		const { QuickConnectController } = await import('./quick-connect.controller.js');
		expect([...controllerMetadata.controllerClasses]).toEqual([QuickConnectController]);
		for (const controller of controllerMetadata.controllerClasses) {
			const metadata = controllerMetadata.getControllerMetadata(controller);
			expect(metadata.basePath).toBe('/quick-connect');
			expect(metadata.routes.get('getCredentialData')).toMatchObject({ method: 'post', path: '/' });
		}
	});
});
