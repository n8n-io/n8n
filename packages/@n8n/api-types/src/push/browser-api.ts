/**
 * Browser API push message types.
 * This provides a generic system for triggering browser APIs from workflow nodes.
 * New browser API types can be added by extending the BrowserApiData union.
 */

export type BrowserApiNotificationData = {
	type: 'notification';
	notification: {
		title: string;
		body?: string;
		icon?: string;
	};
};

export type BrowserApiPlaySoundData = {
	type: 'playSound';
	playSound: {
		sound: 'success' | 'error' | 'warning' | 'info' | 'custom';
		/** Custom sound URL (required when sound is 'custom') */
		url?: string;
		/** Volume level from 0.0 to 1.0 (default: 1.0) */
		volume?: number;
	};
};

// Future browser API types can be added here:

// Union of all browser API data types
export type BrowserApiData = BrowserApiNotificationData | BrowserApiPlaySoundData;

export type BrowserApiPushMessage = {
	type: 'browserApi';
	data: BrowserApiData & {
		workflowId?: string;
		workflowName?: string;
	};
};
