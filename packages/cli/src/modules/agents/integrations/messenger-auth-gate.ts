import type { Thread } from 'chat';
import type { Logger } from 'n8n-workflow';

import type {
	ChatAuthenticationProxyService,
	ChatProviderType,
} from '@/services/chat-authentication-proxy.service';
import type { UrlService } from '@/services/url.service';

/**
 * Gates inbound chat events behind a `ChatAuthenticationProxyService` linkage check.
 *
 * Constructed per-bridge when the integration sets `requiresUserAuth = true`.
 * On a miss, posts a one-time numeric code into the thread along with a link
 * to `/settings/personal`, where the user can redeem it to link their account.
 *
 * Fails closed: any service error (including a disabled chat-auth module) is
 * logged and the inbound event is dropped (no agent execution).
 */
export class MessengerAuthGate {
	constructor(
		private readonly platform: ChatProviderType,
		private readonly chatAuth: ChatAuthenticationProxyService,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
	) {}

	/**
	 * Returns true if the platform user is linked and the bridge can proceed.
	 * Returns false after either posting a linking-code message to the thread
	 * or logging a failure (any service/post error short-circuits to false).
	 */
	async check(platformUserId: string, thread: Thread<unknown, unknown>): Promise<boolean> {
		try {
			const linked = await this.chatAuth.getUserByChatUserId(platformUserId, this.platform);
			if (linked) return true;
		} catch (error) {
			this.logger.error('[MessengerAuthGate] Failed to check link', {
				platform: this.platform,
				platformUserId,
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}

		let code: string;
		try {
			code = await this.chatAuth.createVerificationCode(platformUserId, this.platform);
		} catch (error) {
			// Race: user linked between getUserByChatUserId and createVerificationCode.
			// Re-check; if now linked, allow the message through.
			const nowLinked = await this.chatAuth
				.getUserByChatUserId(platformUserId, this.platform)
				.catch(() => null);
			if (nowLinked) return true;

			this.logger.error('[MessengerAuthGate] Failed to create verification code', {
				platform: this.platform,
				platformUserId,
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}

		try {
			const settingsUrl = `${this.urlService.getInstanceBaseUrl()}/settings/personal`;
			await thread.post({ markdown: this.buildMessage(code, settingsUrl) });
		} catch (error) {
			this.logger.error('[MessengerAuthGate] Failed to post linking message', {
				platform: this.platform,
				platformUserId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
		return false;
	}

	private buildMessage(code: string, settingsUrl: string): string {
		return [
			'To use this agent, link your account first.',
			'',
			`Your code: **${code}**`,
			'',
			`Enter it on your [personal settings page](${settingsUrl}).`,
		].join('\n');
	}
}
