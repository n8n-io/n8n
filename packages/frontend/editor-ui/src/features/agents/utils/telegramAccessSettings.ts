import {
	AgentTelegramAllowedUserSchema,
	type AgentIntegrationSettings,
	type AgentTelegramIntegrationSettings,
} from '@n8n/api-types';

export const DEFAULT_TELEGRAM_PUBLIC_SETTINGS = {
	accessMode: 'public',
	allowedUsers: [],
} satisfies AgentTelegramIntegrationSettings;

/**
 * Resolve the form's "saved" state for a Telegram integration. Returns the
 * stored settings when present, the legacy public default for connected
 * integrations missing settings, and `undefined` for unconnected setups so the
 * form starts in private mode.
 */
export function resolveSavedTelegramSettings(
	settings: AgentIntegrationSettings | undefined,
	connected: boolean,
): AgentTelegramIntegrationSettings | undefined {
	if (!connected) return undefined;
	return settings ?? DEFAULT_TELEGRAM_PUBLIC_SETTINGS;
}

export type TelegramSettingsValidationError = 'required' | 'invalid';

function splitTelegramUsersInput(input: string): string[] {
	const value = input.trim();
	if (!value) return [];
	if (value.startsWith('=')) return [value];
	return value.split(/[\s,]+/).filter(Boolean);
}

export function normalizeTelegramUsers(entries: string[]): string[] {
	return [...new Set(entries.flatMap(splitTelegramUsersInput))];
}

export function parseTelegramUsersInput(input: string): {
	allowedUsers: string[];
	invalidUsers: string[];
} {
	const rawEntries = splitTelegramUsersInput(input);

	const validEntries: string[] = [];
	const invalidEntries: string[] = [];

	for (const entry of rawEntries) {
		const result = AgentTelegramAllowedUserSchema.safeParse(entry);
		if (result.success) {
			validEntries.push(result.data);
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
