import { isRecord, scrubSecretsInText } from '@n8n/utils';

const OMIT_KEYS = new Set(['abortSignal']);
const SENSITIVE_KEY_PATTERN =
	/(api[_-]?key|authorization|bearer|cookie|credentials?|password|secret|access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?token|auth[_-]?token|(?:^|[._-])token$)/i;

function shouldOmitKey(key: string, parentKey?: string): boolean {
	if (OMIT_KEYS.has(key)) {
		return true;
	}

	// Raw provider HTTP payloads are not useful in the debug buffer.
	if (key === 'body' && parentKey === 'response') {
		return true;
	}

	return false;
}

function redactSensitiveKey(key: string, value: unknown, seen: WeakSet<object>): unknown {
	if (SENSITIVE_KEY_PATTERN.test(key) && typeof value === 'string') {
		return '[redacted]';
	}

	return sanitizeDebugSnapshotValue(value, key, seen);
}

/**
 * Full-fidelity JSON-safe snapshot for the in-memory run debug buffer.
 * Unlike trace sanitization, this does not truncate strings, arrays, or object keys.
 */
export function sanitizeDebugSnapshotValue(
	value: unknown,
	keyHint?: string,
	seen?: WeakSet<object>,
): unknown {
	const seenObjects = seen ?? new WeakSet<object>();

	if (value === undefined || value === null) {
		return value;
	}

	if (typeof value === 'string') {
		if (keyHint && SENSITIVE_KEY_PATTERN.test(keyHint)) {
			return '[redacted]';
		}
		return scrubSecretsInText(value);
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'bigint') {
		return value.toString();
	}

	if (typeof value === 'function') {
		return `[function ${value.name || 'anonymous'}]`;
	}

	if (value instanceof AbortSignal) {
		return '[AbortSignal]';
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (value instanceof Error) {
		return {
			name: value.name,
			message: scrubSecretsInText(value.message),
		};
	}

	if (value instanceof Uint8Array) {
		return `[binary ${value.byteLength} bytes]`;
	}

	if (Array.isArray(value)) {
		if (seenObjects.has(value)) {
			return '[Circular]';
		}
		seenObjects.add(value);
		return value.map((entry) => sanitizeDebugSnapshotValue(entry, keyHint, seenObjects));
	}

	if (isRecord(value)) {
		if (seenObjects.has(value)) {
			return '[Circular]';
		}
		seenObjects.add(value);
		const sanitized: Record<string, unknown> = {};
		for (const [key, entryValue] of Object.entries(value)) {
			if (shouldOmitKey(key, keyHint)) {
				continue;
			}
			sanitized[key] = redactSensitiveKey(key, entryValue, seenObjects);
		}
		return sanitized;
	}

	if (typeof value === 'symbol') {
		return value.toString();
	}

	return '[unsupported value]';
}

export function sanitizeDebugSnapshotRecord(value: unknown): Record<string, unknown> {
	const sanitized = sanitizeDebugSnapshotValue(value);
	return isRecord(sanitized) ? sanitized : { value: sanitized };
}
