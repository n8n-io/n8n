import type { InstanceAiConfirmationRequestEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { InstanceAiMemoryService } from '@/modules/instance-ai/instance-ai-memory.service';
import { InstanceAiSettingsService } from '@/modules/instance-ai/instance-ai-settings.service';
import { InstanceAiService } from '@/modules/instance-ai/instance-ai.service';
import { UrlService } from '@/services/url.service';
import { UserService } from '@/services/user.service';

import { SlackCommsConfig } from '../slack-comms.config';
import { SlackCommsModule } from '../slack-comms.module';
import {
	SlackErrorNotificationEventRelay,
	SlackInviteNotifier,
} from '../slack-error-notification.event-relay';
import { SlackInstallProvider } from '../slack-install.provider';
import { SlackInteractivityHandler } from '../slack-interactivity.handler';
import { SlackRunner } from '../slack-runner.service';
import { SlackSocketService } from '../slack-socket.service';
import { SlackStreamRenderer } from '../slack-stream-renderer';
import { SlackThreadRegistry } from '../slack-thread-registry';
import { SlackWebClient } from '../slack-web-client';

function config(over: Partial<SlackCommsConfig> = {}): SlackCommsConfig {
	return mock<SlackCommsConfig>({
		mode: 'direct',
		botToken: 'xoxb-token',
		appToken: 'xapp-token',
		signingSecret: 'sec',
		errorChannelId: '',
		streamMode: 'native',
		...over,
	});
}

function confirmationEvent(): InstanceAiConfirmationRequestEvent {
	return {
		type: 'confirmation-request',
		runId: 'run-1',
		agentId: 'agent-1',
		payload: {
			requestId: 'req-42',
			toolCallId: 'tc-1',
			toolName: 'n8n_update_workflow',
			args: {},
			severity: 'info',
			message: 'Turn on this workflow?',
		},
	} as InstanceAiConfirmationRequestEvent;
}

describe('SlackCommsModule', () => {
	let module: SlackCommsModule;
	let logger: Logger;
	let socket: SlackSocketService;

	beforeEach(() => {
		Container.reset();
		module = new SlackCommsModule();
		logger = mock<Logger>();
		socket = mock<SlackSocketService>();
		Container.set(Logger, logger);
		Container.set(SlackSocketService, socket);
	});

	describe('init()', () => {
		it('is inert when the bot or app token is missing', async () => {
			Container.set(SlackCommsConfig, config({ botToken: '' }));

			await expect(module.init()).resolves.toBeUndefined();

			expect(socket.start).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(
				'Slack comms not configured, skipping module wiring',
			);
		});

		describe('when configured', () => {
			let webClient: SlackWebClient;
			let installProvider: SlackInstallProvider;
			let renderer: SlackStreamRenderer;
			let relay: SlackErrorNotificationEventRelay;
			let runner: SlackRunner;
			let interactivity: SlackInteractivityHandler;

			beforeEach(async () => {
				webClient = mock<SlackWebClient>();
				vi.mocked(webClient.getBotUserId).mockResolvedValue('B_BOT');
				installProvider = mock<SlackInstallProvider>();
				renderer = mock<SlackStreamRenderer>();
				relay = mock<SlackErrorNotificationEventRelay>();
				const urlService = mock<UrlService>();
				vi.mocked(urlService.getInstanceBaseUrl).mockReturnValue('https://n8n.example.com');

				Container.set(SlackCommsConfig, config());
				Container.set(SlackWebClient, webClient);
				Container.set(SlackInstallProvider, installProvider);
				Container.set(SlackStreamRenderer, renderer);
				Container.set(SlackErrorNotificationEventRelay, relay);
				Container.set(SlackInviteNotifier, mock<SlackInviteNotifier>());
				Container.set(SlackThreadRegistry, mock<SlackThreadRegistry>());
				Container.set(UserRepository, mock<UserRepository>());
				Container.set(ProjectRepository, mock<ProjectRepository>());
				Container.set(UserService, mock<UserService>());
				Container.set(UrlService, urlService);
				Container.set(InstanceAiService, mock<InstanceAiService>());
				Container.set(InstanceAiMemoryService, mock<InstanceAiMemoryService>());
				Container.set(InstanceAiSettingsService, mock<InstanceAiSettingsService>());

				await module.init();

				runner = Container.get(SlackRunner);
				interactivity = Container.get(SlackInteractivityHandler);
			});

			it('caches the bot user id, starts the socket and inits the error relay', () => {
				expect(installProvider.setBotUserId).toHaveBeenCalledWith('B_BOT');
				expect(socket.start).toHaveBeenCalledTimes(1);
				expect(relay.init).toHaveBeenCalledTimes(1);
			});

			it('routes socket envelopes to the runner and interactivity handler', async () => {
				const handleRunner = vi.spyOn(runner, 'handle').mockResolvedValue(undefined);
				const handleInteractivity = vi.spyOn(interactivity, 'handle').mockResolvedValue(undefined);
				const handlers = vi.mocked(socket.start).mock.calls[0][0];

				await handlers.onEvent({ event_id: 'Ev1' });
				await handlers.onInteractivity({ trigger_id: 'T1' });

				expect(handleRunner).toHaveBeenCalledWith({ event_id: 'Ev1' });
				expect(handleInteractivity).toHaveBeenCalledWith({ trigger_id: 'T1' });
			});

			it('posts a confirmation card into the thread when the renderer seam fires', async () => {
				const handler = renderer.onConfirmationRequest;
				expect(handler).toBeDefined();

				await handler?.('thread-1', confirmationEvent(), {
					botToken: 'xoxb-token',
					channelId: 'C1',
					threadTs: '11.22',
					recipientUserId: 'U1',
					recipientTeamId: 'T1',
				});

				expect(webClient.postMessage).toHaveBeenCalledWith(
					'xoxb-token',
					expect.objectContaining({
						channel: 'C1',
						threadTs: '11.22',
						text: 'Turn on this workflow?',
					}),
				);
				const { blocks } = vi.mocked(webClient.postMessage).mock.calls[0][1];
				expect(JSON.stringify(blocks)).toContain('req-42');
			});
		});
	});
});
