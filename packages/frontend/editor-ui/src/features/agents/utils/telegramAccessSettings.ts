import type { AgentTelegramIntegrationSettings } from '@n8n/api-types';

export const TELEGRAM_INTEGRATION_TYPE = 'telegram';

export const DEFAULT_TELEGRAM_PUBLIC_SETTINGS = {
	accessMode: 'public',
	allowedUserIds: [],
} satisfies AgentTelegramIntegrationSettings;

/**
 * Resolve the form's "saved" state for a Telegram integration. Returns the
 * stored settings when present, the legacy public default for connected
 * integrations missing settings, and `undefined` for unconnected setups so the
 * form starts in private mode.
 */
export function resolveSavedTelegramSettings(
	settings: AgentTelegramIntegrationSettings | undefined,
	connected: boolean,
): AgentTelegramIntegrationSettings | undefined {
	if (!connected) return undefined;
	return settings ?? DEFAULT_TELEGRAM_PUBLIC_SETTINGS;
}

export type TelegramSettingsValidationError = 'required' | 'invalid';

export function parseTelegramUserIdsInput(input: string): {
	allowedUserIds: string[];
	invalidUserIds: string[];
} {
	const rawUserIds = input
		.split(',')
		.map((userId) => userId.trim())
		.filter(Boolean);
	const allowedUserIds = [...new Set(rawUserIds.filter((userId) => /^\d+$/.test(userId)))];
	const invalidUserIds = [...new Set(rawUserIds.filter((userId) => !/^\d+$/.test(userId)))];

	return { allowedUserIds, invalidUserIds };
}

export function createTelegramSettings(
	accessMode: AgentTelegramIntegrationSettings['accessMode'],
	userIdsInput: string,
): AgentTelegramIntegrationSettings {
	const { allowedUserIds } = parseTelegramUserIdsInput(userIdsInput);

	return { accessMode, allowedUserIds };
}

export function validateTelegramSettings(
	settings: AgentTelegramIntegrationSettings,
	userIdsInput: string,
): TelegramSettingsValidationError | null {
	if (settings.accessMode === 'public') return null;

	const { allowedUserIds, invalidUserIds } = parseTelegramUserIdsInput(userIdsInput);
	if (invalidUserIds.length > 0) return 'invalid';
	if (allowedUserIds.length === 0) return 'required';

	return null;
}

export function serializeTelegramUserIds(userIds: string[]): string {
	return userIds.join(', ');
}
