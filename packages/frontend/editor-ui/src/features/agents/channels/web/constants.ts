import {
	AgentWebSettingsSchema,
	type AgentIntegrationSettings,
	type AgentWebIntegrationSettings,
} from '@n8n/api-types';

/** n8n credential type the Basic Auth access mode reads its user and password from. */
export const BASIC_AUTH_CREDENTIAL_TYPE = 'httpBasicAuth';

/**
 * Saved settings arrive as the union of every channel's shape. Parse rather than
 * probe a field: `accessMode: 'public'` is also a Telegram setting, and only the
 * strict schema tells the two apart.
 */
export function isWebIntegrationSettings(
	settings: AgentIntegrationSettings | undefined,
): settings is AgentWebIntegrationSettings {
	return settings !== undefined && AgentWebSettingsSchema.safeParse(settings).success;
}
