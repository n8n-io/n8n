import type { MessengerPlatform } from './messenger-platform';

export type MessengerAccountDto = {
	platform: MessengerPlatform;
	platformUserId: string;
	linkedAt: string;
};
