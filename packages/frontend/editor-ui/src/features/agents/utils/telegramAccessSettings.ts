import type { AgentIntegrationSettings, AgentTelegramIntegrationSettings } from '@n8n/api-types';

export const DEFAULT_TELEGRAM_PUBLIC_SETTINGS = {
	accessMode: 'public',
	allowedUsers: [],
	sessionIdleTimeoutMinutes: null,
} satisfies AgentTelegramIntegrationSettings;

/**
 * Resolve the form's "saved" state for a Telegram integration. Returns the
 * stored settings when present, the legacy public default for connected
 * integrations missing settings, and `undefined` for unconnected setups without
 * settings so the form starts in private mode. A draft channel is not connected
 * yet, but its saved settings still apply.
 */
export function resolveSavedTelegramSettings(
	settings: AgentIntegrationSettings | undefined,
	connected: boolean,
): AgentTelegramIntegrationSettings | undefined {
	if (settings && 'accessMode' in settings) return settings;
	return connected ? DEFAULT_TELEGRAM_PUBLIC_SETTINGS : undefined;
}

export type TelegramSettingsValidationError = 'required' | 'invalid';

// Matches a Telegram user ID (numeric) or username (letters, numbers, underscores),
// optionally prefixed with "@".
export const VALID_TELEGRAM_ENTRY_RE = /^@?[a-zA-Z0-9_]+$/;

export function parseTelegramUsersInput(input: string): {
	allowedUsers: string[];
	invalidUsers: string[];
} {
	const rawEntries = input
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);

	const validEntries: string[] = [];
	const invalidEntries: string[] = [];

	for (const entry of rawEntries) {
		if (VALID_TELEGRAM_ENTRY_RE.test(entry)) {
			validEntries.push(entry);
		} else {
			invalidEntries.push(entry);
		}
	}

	return {
		allowedUsers: [...new Set(validEntries)],
		invalidUsers: [...new Set(invalidEntries)],
	};
}

export function createTelegramSettings(
	accessMode: AgentTelegramIntegrationSettings['accessMode'],
	usersInput: string,
): AgentTelegramIntegrationSettings {
	const { allowedUsers } = parseTelegramUsersInput(usersInput);
	return { accessMode, allowedUsers };
}

export function validateTelegramSettings(
	settings: AgentTelegramIntegrationSettings,
	usersInput: string,
): TelegramSettingsValidationError | null {
	if (settings.accessMode === 'public') return null;

	const { allowedUsers, invalidUsers } = parseTelegramUsersInput(usersInput);
	if (invalidUsers.length > 0) return 'invalid';
	if (allowedUsers.length === 0) return 'required';

	return null;
}

export function serializeTelegramUsers(users: string[]): string {
	return users.join(', ');
}
