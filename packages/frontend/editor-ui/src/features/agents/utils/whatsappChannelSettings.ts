import type { AgentIntegrationSettings, AgentWhatsAppIntegrationSettings } from '@n8n/api-types';

export const DEFAULT_WHATSAPP_SETTINGS = {
	downloadMedia: true,
	typingIndicator: false,
} satisfies Omit<AgentWhatsAppIntegrationSettings, 'sessionIdleTimeoutMinutes'>;

/**
 * Resolve the form's "saved" state for a WhatsApp integration. Returns the
 * stored settings when present, and the documented defaults for a connected
 * integration that predates these settings (or one that hasn't saved any yet).
 */
export function resolveSavedWhatsAppSettings(
	settings: AgentIntegrationSettings | undefined,
): AgentWhatsAppIntegrationSettings {
	if (settings && 'downloadMedia' in settings) return settings;
	return DEFAULT_WHATSAPP_SETTINGS;
}
