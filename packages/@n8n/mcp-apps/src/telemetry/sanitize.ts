import { scrubSecretsInText } from '@n8n/utils';

const MAX_TELEMETRY_ERROR_MESSAGE_LENGTH = 500;

export function sanitizeTelemetryErrorMessage(message: string): string {
	return scrubSecretsInText(message).slice(0, MAX_TELEMETRY_ERROR_MESSAGE_LENGTH);
}
