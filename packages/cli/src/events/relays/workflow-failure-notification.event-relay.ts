import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { EventService } from '@/events/event.service';
import { EventRelay } from '@/events/relays/event-relay';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { UserManagementMailer } from '@/user-management/email';

/**
 * Event relay to send email notifications when the first production workflow fails
 */
@Service()
export class WorkflowFailureNotificationEventRelay extends EventRelay {
	constructor(
		eventService: EventService,
		private readonly mailer: UserManagementMailer,
		private readonly userRepository: UserRepository,
		private readonly logger: Logger,
	) {
		super(eventService);
	}

	init() {
		this.setupListeners({
			'instance-first-production-workflow-failed': async (event) =>
				await this.onFirstProductionWorkflowFailed(event),
		});
	}

	/**
	 * Handles the first production workflow failure event.
	 * Sends an email notification to the workflow owner.
	 */
	private async onFirstProductionWorkflowFailed(
		event: RelayEventMap['instance-first-production-workflow-failed'],
	) {
		const { workflowId, workflowName, userId } = event;

		// Skip if email is not configured
		if (!this.mailer.isEmailSetUp) {
			this.logger.debug('Skipping first production failure email - SMTP not configured', {
				workflowId,
				userId,
			});
			return;
		}

		try {
			// Get the user to send email to
			const user = await this.userRepository.findOneBy({ id: userId });

			if (!user || !user.email) {
				this.logger.warn(
					'Cannot send first production failure email - user not found or no email',
					{
						workflowId,
						userId,
					},
				);
				return;
			}

			// Send email notification
			await this.mailer.workflowFailure({
				email: user.email,
				firstName: user.firstName,
				workflowId,
				workflowName,
			});

			this.logger.info('Sent first production failure email', {
				workflowId,
				userId,
				email: user.email,
			});
		} catch (error) {
			this.logger.error('Failed to send first production failure email', {
				workflowId,
				userId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
