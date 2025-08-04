import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

@BackendModule({ name: 'insights' })
export class InsightsModule implements ModuleInterface {
	async init() {
		/**
		 * Only main- and webhook-type instances collect insights because
		 * only they are informed of finished workflow executions.
		 */
		if (Container.get(InstanceSettings).instanceType === 'worker') return;

		await import('./insights.controller');

		const { InsightsService } = await import('./insights.service');
		Container.get(InsightsService).startTimers();
	}

	async entities() {
		const { AnnotationTagEntity } = await import('@n8n/db');

		return [AnnotationTagEntity];
	}

	async settings() {
		const { InsightsService } = await import('./insights.service');

		return Container.get(InsightsService).settings();
	}

	@OnShutdown()
	async shutdown() {
		const { InsightsService } = await import('./insights.service');

		await Container.get(InsightsService).shutdown();
	}
}
