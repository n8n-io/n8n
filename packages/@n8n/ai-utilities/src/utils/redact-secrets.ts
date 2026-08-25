const SECRET_REDACTION = '[redacted]';

/**
 * Masks credential-shaped values while keeping the key, so
 * `invalid api_key: <secret>` still names which credential was rejected.
 *
 * A sibling of the redaction in `packages/@n8n/agents/src/skills/tools.ts`;
 * kept separate because `@n8n/agents` is not a dependency here.
 *
 * The leading `[\w-]*` matters: `\b` alone never fires inside a compound key
 * such as `client_secret`. The auth scheme is optional so an `Authorization`
 * header holding a bare key is masked too.
 */
export const redactSecrets = (content: string): string =>
	content
		.replace(
			/\b(authorization)(["']?\s*[:=]\s*["']?\s*(?:(?:bearer|basic)\s+)?)[^\s"',;}]+/gi,
			`$1$2${SECRET_REDACTION}`,
		)
		.replace(
			/([\w-]*(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|passwd|secret|credential|private[_-]?key))(["']?\s*[:=]\s*)(["']?)[^\s"',;}]+\3/gi,
			`$1$2$3${SECRET_REDACTION}$3`,
		);
