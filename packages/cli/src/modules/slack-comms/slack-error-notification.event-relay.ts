import { Logger } from '@n8n/backend-common';
import { GLOBAL_OWNER_ROLE, UserRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { EventRelay } from '@/events/relays/event-relay';
import { UrlService } from '@/services/url.service';

import { errorBlocks, invitePromptBlocks } from './slack-blocks';
import { SlackInstallProvider } from './slack-install.provider';
import type { SlackUnmatchedMentionContext } from './slack-runner.service';
import { SlackWebClient } from './slack-web-client';

@Service()
export class SlackErrorNotificationEventRelay extends EventRelay {
	constructor(
		eventService: EventService,
		private readonly installProvider: SlackInstallProvider,
		private readonly webClient: SlackWebClient,
		private readonly logger: Logger,
	) {
		super(eventService);
	}

	init() {
		this.setupListeners({
			'workflow-post-execute': async (event) => await this.onWorkflowPostExecute(event),
		});
	}

	private async onWorkflowPostExecute(
		event: RelayEventMap['workflow-post-execute'],
	): Promise<void> {
		try {
			const status = event.runData?.status;
			if (status !== 'error' && status !== 'crashed') return;

			const install = this.installProvider.getInstall();
			if (!install?.errorChannelId) return;

			const error = event.runData?.data.resultData.error;
			const baseUrl = Container.get(UrlService).getInstanceBaseUrl();

			const blocks = errorBlocks({
				workflowName: event.workflow.name,
				workflowId: event.workflow.id,
				executionId: event.executionId,
				reason: error?.message ?? 'Unknown error',
				baseUrl,
				stoppedAt: event.runData?.stoppedAt?.toISOString(),
			});

			await this.webClient.postMessage(install.botToken, {
				channel: install.errorChannelId,
				text: `${event.workflow.name} failed to run.`,
				blocks,
			});
		} catch (error) {
			this.logger.warn('Slack error notification relay failed', { error });
		}
	}
}

@Service()
export class SlackInviteNotifier {
	private readonly notifiedRequesters = new Set<string>();

	constructor(
		private readonly installProvider: SlackInstallProvider,
		private readonly userRepository: UserRepository,
		private readonly webClient: SlackWebClient,
		private readonly logger: Logger,
	) {}

	async notify(context: SlackUnmatchedMentionContext): Promise<void> {
		const dedupeKey = context.email ?? context.slackUserId;
		if (this.notifiedRequesters.has(dedupeKey)) return;
		this.notifiedRequesters.add(dedupeKey);

		const install = this.installProvider.getInstall();
		if (!install) return;

		try {
			const owner = await this.userRepository.findOne({
				where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			});
			if (!owner?.email) return;

			const slackOwnerId = await this.webClient.lookupUserByEmail(install.botToken, owner.email);
			if (!slackOwnerId) {
				this.logger.warn('No Slack account found for the n8n owner; skipping the invite DM', {
					ownerId: owner.id,
				});
				return;
			}

			const channelId = await this.webClient.openDm(install.botToken, slackOwnerId);
			const requesterEmail = context.email ?? 'unknown email';

			await this.webClient.postMessage(install.botToken, {
				channel: channelId,
				text: `${requesterEmail} tried to use n8n from Slack.`,
				blocks: invitePromptBlocks({
					requesterName: requesterEmail,
					requesterEmail,
					channelName: `<#${context.channelId}>`,
				}),
			});
		} catch (error) {
			this.logger.warn('Slack invite notifier failed to DM an admin', { error });
		}
	}
}
