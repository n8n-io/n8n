/**
 * Stub for Push service
 * This will be replaced with actual implementation or API calls
 */

import { Service } from '@n8n/di';

type PushMessage = unknown;

@Service()
export class Push {
	broadcast(_message: PushMessage): void {
		// no-op
	}

	send(_message: PushMessage, _sessionId: string): void {
		// no-op
	}

	sendToUsers(_message: PushMessage, _userIds: string[]): void {
		// no-op
	}

	hasPushRef(_pushRef: string): boolean {
		return false;
	}
}
