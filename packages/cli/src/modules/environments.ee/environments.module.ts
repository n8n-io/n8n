import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'environments' })
export class MyFeatureModule implements ModuleInterface {
	async init() {
		await import('./environments.controller.ee');

		const { MyFeatureService } = await import('./environments.service.ee');
		Container.get(MyFeatureService).start();
	}

	@OnShutdown()
	async shutdown() {
		const { MyFeatureService } = await import('./environments.service.ee');

		await Container.get(MyFeatureService).shutdown();
	}

	async entities() {
		// const { MyFeatureEntity } = await import('./environments.entity.ee');
		return [];
	}

	async context() {
		const { MyFeatureService } = await import('./environments.service.ee');

		return { myFeatureProxy: Container.get(MyFeatureService) };
	}
}
