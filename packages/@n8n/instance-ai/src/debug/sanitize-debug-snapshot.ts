import { isRecord } from '@n8n/utils/is-record';
import { isSensitiveKey } from '@n8n/utils/redaction/sensitive-key';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

const OMIT_KEYS = new Set(['abortSignal']);

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
	if (isSensitiveKey(key) && typeof value === 'string') {
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
	const ancestors = seen ?? new WeakSet<object>();

	if (value === undefined || value === null) {
		return value;
	}

	if (typeof value === 'string') {
		if (keyHint && isSensitiveKey(keyHint)) {
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

	// Only objects on the current path count as circular. A shared reference that
	// appears in several sibling branches is serialized in each of them.
	if (Array.isArray(value)) {
		if (ancestors.has(value)) {
			return '[Circular]';
		}
		ancestors.add(value);
		const sanitized = value.map((entry) => sanitizeDebugSnapshotValue(entry, keyHint, ancestors));
		ancestors.delete(value);
		return sanitized;
	}

	if (isRecord(value)) {
		if (ancestors.has(value)) {
			return '[Circular]';
		}
		ancestors.add(value);
		const sanitized: Record<string, unknown> = {};
		for (const [key, entryValue] of Object.entries(value)) {
			if (shouldOmitKey(key, keyHint)) {
				continue;
			}
			sanitized[key] = redactSensitiveKey(key, entryValue, ancestors);
		}
		ancestors.delete(value);
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
