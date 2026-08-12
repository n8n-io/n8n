import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'slack-comms', instanceTypes: ['main'] })
export class SlackCommsModule implements ModuleInterface {
	async init() {
		const { SlackSocketService } = await import('./slack-socket.service.js');
		// const { SlackRunner } = await import('./slack-runner.service.js');
		// const { SlackInteractivityHandler } = await import('./slack-interactivity.handler.js');
		// const { SlackErrorNotificationEventRelay } = await import(
		// 	'./slack-error-notification.event-relay.js'
		// );

		// Container.get(SlackErrorNotificationEventRelay).init();

		// const runner = Container.get(SlackRunner);
		// const interactivity = Container.get(SlackInteractivityHandler);
		await Container.get(SlackSocketService).start({
			onEvent: async () => undefined,
			onInteractivity: async () => undefined,
			// onEvent: async (body) => await runner.handle(body),
			// onInteractivity: async (body) => await interactivity.handle(body),
		});
	}

	async shutdown() {
		const { SlackSocketService } = await import('./slack-socket.service.js');
		await Container.get(SlackSocketService).shutdown();
	}

	async settings() {
		const { SlackCommsConfig } = await import('./slack-comms.config.js');
		const config = Container.get(SlackCommsConfig);
		return { configured: Boolean(config.botToken), errorChannelId: config.errorChannelId || null };
	}
}
