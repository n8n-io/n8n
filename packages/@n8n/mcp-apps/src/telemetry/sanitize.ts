import { scrubSecretsInText } from '@n8n/utils';

const MAX_TELEMETRY_ERROR_MESSAGE_LENGTH = 500;
const REDACTED_VALUE = '[REDACTED]';
const CIRCULAR_VALUE = '[Circular]';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSecretKey(key: string): boolean {
	const probe = `${key}=value`;
	return scrubSecretsInText(probe) !== probe;
}

function sanitizeTelemetryValue(
	value: unknown,
	key?: string,
	seen = new WeakSet<object>(),
): unknown {
	if (key && isSecretKey(key)) return REDACTED_VALUE;

	if (typeof value === 'string') return scrubSecretsInText(value);
	if (Array.isArray(value)) {
		if (seen.has(value)) return CIRCULAR_VALUE;
		seen.add(value);
		const sanitized = value.map((item) => sanitizeTelemetryValue(item, undefined, seen));
		seen.delete(value);
		return sanitized;
	}
	if (!isRecord(value)) return value;
	if (seen.has(value)) return CIRCULAR_VALUE;

	seen.add(value);
	const sanitized: Record<string, unknown> = {};
	for (const [entryKey, entryValue] of Object.entries(value)) {
		sanitized[entryKey] = sanitizeTelemetryValue(entryValue, entryKey, seen);
	}
	seen.delete(value);

	return sanitized;
}

export function sanitizeTelemetryErrorMessage(message: string): string {
	return scrubSecretsInText(message).slice(0, MAX_TELEMETRY_ERROR_MESSAGE_LENGTH);
}

export function sanitizeTelemetryProperties(properties: Record<string, unknown>) {
	return sanitizeTelemetryValue(properties) as Record<string, unknown>;
}
