import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'slack-comms', instanceTypes: ['main'] })
export class SlackCommsModule implements ModuleInterface {
	async init() {
		const { SlackCommsConfig } = await import('./slack-comms.config.js');
		const config = Container.get(SlackCommsConfig);
		const logger = Container.get(Logger);

		if (!config.botToken || !config.appToken) {
			logger.debug('Slack comms not configured, skipping module wiring');
			return;
		}

		const { UserRepository, ProjectRepository } = await import('@n8n/db');
		const { UserService } = await import('@/services/user.service.js');
		const { UrlService } = await import('@/services/url.service.js');
		const { InstanceAiService } = await import('@/modules/instance-ai/instance-ai.service.js');
		const { InstanceAiMemoryService } = await import(
			'@/modules/instance-ai/instance-ai-memory.service.js'
		);
		const { InstanceAiSettingsService } = await import(
			'@/modules/instance-ai/instance-ai-settings.service.js'
		);
		const { SlackWebClient } = await import('./slack-web-client.js');
		const { SlackInstallProvider } = await import('./slack-install.provider.js');
		const { SlackIdentityService } = await import('./slack-identity.service.js');
		const { SlackThreadRegistry } = await import('./slack-thread-registry.js');
		const { SlackStreamRenderer } = await import('./slack-stream-renderer.js');
		const { SlackRunner } = await import('./slack-runner.service.js');
		const { SlackInteractivityHandler } = await import('./slack-interactivity.handler.js');
		const { SlackSocketService } = await import('./slack-socket.service.js');
		const { SlackErrorNotificationEventRelay, SlackInviteNotifier } = await import(
			'./slack-error-notification.event-relay.js'
		);
		const { confirmationBlocks } = await import('./slack-blocks.js');

		const webClient = Container.get(SlackWebClient);
		const installProvider = Container.get(SlackInstallProvider);
		const urlService = Container.get(UrlService);

		const identity = new SlackIdentityService(webClient, Container.get(UserRepository));
		Container.set(SlackIdentityService, identity);

		const renderer = Container.get(SlackStreamRenderer);
		renderer.onConfirmationRequest = async (_threadId, event, target) => {
			await webClient.postMessage(target.botToken, {
				channel: target.channelId,
				threadTs: target.threadTs,
				text: event.payload.message || 'Approval needed.',
				blocks: confirmationBlocks(event.payload, {
					baseUrl: urlService.getInstanceBaseUrl(),
				}),
			});
		};

		const inviteNotifier = Container.get(SlackInviteNotifier);
		const runner = new SlackRunner(
			installProvider,
			identity,
			Container.get(SlackThreadRegistry),
			webClient,
			renderer,
			Container.get(InstanceAiService),
			Container.get(InstanceAiMemoryService),
			Container.get(ProjectRepository),
			Container.get(InstanceAiSettingsService),
			logger,
			async (context) => await inviteNotifier.notify(context),
		);
		Container.set(SlackRunner, runner);

		const interactivity = new SlackInteractivityHandler(
			installProvider,
			identity,
			webClient,
			Container.get(InstanceAiService),
			Container.get(InstanceAiMemoryService),
			Container.get(ProjectRepository),
			Container.get(SlackThreadRegistry),
			renderer,
			Container.get(InstanceAiSettingsService),
			Container.get(UserService),
			urlService,
			logger,
		);
		Container.set(SlackInteractivityHandler, interactivity);

		try {
			installProvider.setBotUserId(await webClient.getBotUserId(config.botToken));
		} catch (error) {
			logger.warn('Failed to resolve the Slack bot user id', { error });
		}

		await Container.get(SlackSocketService).start({
			onEvent: async (body) => await runner.handle(body),
			onInteractivity: async (body) => await interactivity.handle(body),
		});

		Container.get(SlackErrorNotificationEventRelay).init();
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
