import { scrubSecretsInText } from '@n8n/utils';

const REDACTED_VALUE = '[REDACTED]';
const CIRCULAR_VALUE = '[Circular]';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSecretKey(key: string): boolean {
	const probe = `${key}=value`;
	return scrubSecretsInText(probe) !== probe;
}

export function scrubToolInputForEvent(value: unknown, seen = new WeakSet<object>()): unknown {
	if (typeof value === 'string') return scrubSecretsInText(value);

	if (Array.isArray(value)) {
		if (seen.has(value)) return CIRCULAR_VALUE;
		seen.add(value);
		const scrubbed = value.map((item) => scrubToolInputForEvent(item, seen));
		seen.delete(value);
		return scrubbed;
	}

	if (!isRecord(value)) return value;

	if (seen.has(value)) return CIRCULAR_VALUE;
	seen.add(value);

	const scrubbed: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(value)) {
		scrubbed[key] = isSecretKey(key) ? REDACTED_VALUE : scrubToolInputForEvent(item, seen);
	}

	seen.delete(value);
	return scrubbed;
}
