import type { CredentialProvider, ResolvedCredential } from '@n8n/agents';
import { OperationalError, UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import { isSensitiveKey } from '@n8n/utils/redaction/sensitive-key';
import escapeRegExp from 'lodash/escapeRegExp';

const MAX_MESSAGE_LENGTH = 500;
const FALLBACK_MESSAGE = 'Vector store request failed';
const SERIALIZED_STACK_FIELD = /(["'])(?:stack(?:_?trace)?|traceback)\\*\1\s*:/i;
const STACK_TRACE_START =
	/(?:\r?\n|\\r\\n|\\n)[^\S\r\n]*(?:at\s|Traceback \(most recent call last\):)|Traceback \(most recent call last\):/;

function createSanitizedError(error: unknown, message: string): Error {
	const sanitized =
		error instanceof UserError ? new UserError(message) : new OperationalError(message);
	// Do not retain provider properties, causes or stack traces on the outward error.
	sanitized.stack = undefined;
	return sanitized;
}

/**
 * Keep resolved secrets local to one connection or search tool. Use a fixed message if resolution fails.
 * Remove known secrets and V8/Python traces. Use a fallback for serialized stack fields.
 * Keep other provider diagnostics and limit the message to 500 characters.
 */
export function createVectorStoreErrorSanitizer(provider: CredentialProvider) {
	const secrets = new Set<string>();
	const credentialProvider: CredentialProvider = {
		list: async () => await provider.list(),
		async resolve(id) {
			let credential: ResolvedCredential;
			try {
				credential = await provider.resolve(id);
			} catch (error) {
				// A failed lookup gives us no credential values to redact.
				throw createSanitizedError(error, 'Could not resolve vector store credentials');
			}
			for (const [key, value] of Object.entries(credential)) {
				if (
					typeof value !== 'string' ||
					!value ||
					!(isSensitiveKey(key) || key === 'serviceRole' || key === 'accessKeyId')
				) {
					continue;
				}
				secrets.add(value);
				secrets.add(JSON.stringify(value).slice(1, -1));
				try {
					secrets.add(encodeURIComponent(value));
				} catch {
					// A string with an unpaired surrogate has no URI-encoded form.
				}
			}
			return credential;
		},
	};

	return {
		credentialProvider,
		sanitize(error: unknown): Error {
			const detail = error instanceof Error || isRecord(error) ? error.message : error;
			let message = typeof detail === 'string' ? detail : FALLBACK_MESSAGE;
			// Serialized stacks can contain arrays or nested objects. Do not return that payload.
			if (SERIALIZED_STACK_FIELD.test(message)) message = FALLBACK_MESSAGE;
			const stackMarker = STACK_TRACE_START.exec(message);
			let stackMarkerRedacted = false;
			if (secrets.size) {
				// Match once, longest first, so overlapping secrets cannot leave a suffix behind.
				const pattern = [...secrets]
					.sort((a, b) => b.length - a.length)
					.map(escapeRegExp)
					.join('|');
				message = message.replace(new RegExp(pattern, 'g'), (secret: string, offset: number) => {
					if (
						stackMarker &&
						offset < stackMarker.index + stackMarker[0].length &&
						offset + secret.length > stackMarker.index
					) {
						stackMarkerRedacted = true;
					}
					return '[REDACTED]';
				});
			}
			// If redaction changes the marker, the remaining text can still contain frames.
			message = stackMarkerRedacted ? FALLBACK_MESSAGE : message.split(STACK_TRACE_START, 1)[0];
			message = sanitizeErrorDetail(message, MAX_MESSAGE_LENGTH).trim() || FALLBACK_MESSAGE;
			return createSanitizedError(error, message);
		},
	};
}
