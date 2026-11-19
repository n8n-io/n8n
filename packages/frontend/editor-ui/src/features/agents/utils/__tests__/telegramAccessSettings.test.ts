import { describe, expect, it } from 'vitest';

import {
	DEFAULT_TELEGRAM_PUBLIC_SETTINGS,
	resolveSavedTelegramSettings,
} from '../telegramAccessSettings';

describe('resolveSavedTelegramSettings', () => {
	const settings = { accessMode: 'private' as const, allowedUsers: ['alice'] };

	it('uses the saved settings of a draft channel that is not connected yet', () => {
		expect(resolveSavedTelegramSettings(settings, false)).toEqual(settings);
	});

	it('starts an unconnected channel without settings from the form default', () => {
		expect(resolveSavedTelegramSettings(undefined, false)).toBeUndefined();
	});

	it('uses the legacy public default for a connected channel without settings', () => {
		expect(resolveSavedTelegramSettings(undefined, true)).toBe(DEFAULT_TELEGRAM_PUBLIC_SETTINGS);
	});
});
