export function normalizeAgentTelemetrySource(source?: string): string {
	if (source === 'n8n_chat_production') return 'n8n_chat';
	return source || 'unknown';
}
