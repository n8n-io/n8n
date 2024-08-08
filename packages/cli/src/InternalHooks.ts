import { Service } from 'typedi';
import type { User } from '@db/entities/User';
import { Telemetry } from '@/telemetry';
import { MessageEventBus } from './eventbus/MessageEventBus/MessageEventBus';

/**
 * @deprecated Do not add to this class. To add log streaming or telemetry events, use
 * `EventService` to emit the event and then use the `LogStreamingEventRelay` or
 * `TelemetryEventRelay` to forward them to the event bus or telemetry.
 */
@Service()
export class InternalHooks {
	constructor(
		private readonly telemetry: Telemetry,
		// Can't use @ts-expect-error because only dev time tsconfig considers this as an error, but not build time
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore - needed until we decouple telemetry
		private readonly _eventBus: MessageEventBus, // needed until we decouple telemetry
	) {}

	async init() {
		await this.telemetry.init();
	}

	onUserInviteEmailClick(userInviteClickData: { inviter: User; invitee: User }) {
		this.telemetry.track('User clicked invite link from email', {
			user_id: userInviteClickData.invitee.id,
		});
	}

	onUserPasswordResetEmailClick(userPasswordResetData: { user: User }) {
		this.telemetry.track('User clicked password reset link from email', {
			user_id: userPasswordResetData.user.id,
		});
	}

	onUserTransactionalEmail(userTransactionalEmailData: {
		user_id: string;
		message_type:
			| 'Reset password'
			| 'New user invite'
			| 'Resend invite'
			| 'Workflow shared'
			| 'Credentials shared';
		public_api: boolean;
	}) {
		this.telemetry.track('Instance sent transactional email to user', userTransactionalEmailData);
	}

	onUserPasswordResetRequestClick(userPasswordResetData: { user: User }) {
		this.telemetry.track('User requested password reset while logged out', {
			user_id: userPasswordResetData.user.id,
		});
	}
}
