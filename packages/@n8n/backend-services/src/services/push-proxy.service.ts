import type { PushMessage } from '@n8n/api-types';
import { Service } from '@n8n/di';

/** Sends push messages to the frontend connections of this instance. */
export interface PushSender {
	broadcast(pushMsg: PushMessage): void;
	sendToUsers(pushMsg: PushMessage, userIds: string[], options?: { excludePushRef?: string }): void;
}

/** Without a registered provider the instance has no frontend connections, so messages are dropped. */
@Service()
export class PushProxy implements PushSender {
	private provider: PushSender | null = null;

	registerProvider(provider: PushSender): void {
		this.provider = provider;
	}

	broadcast(pushMsg: PushMessage): void {
		this.provider?.broadcast(pushMsg);
	}

	sendToUsers(
		pushMsg: PushMessage,
		userIds: string[],
		options?: { excludePushRef?: string },
	): void {
		this.provider?.sendToUsers(pushMsg, userIds, options);
	}
}
