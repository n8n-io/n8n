// A bare `token` counts as a suffix after any separator (`bot_token`, `x.token`,
// `auth:token`). It does not count as a prefix (`token_type`, `token_count`) or
// inside a word (`mytoken`).
export const SENSITIVE_KEY_PATTERN =
	/(api[_-]?key|private[_-]?key|authorization|bearer|cookie|credentials?|password|passwd|secret|access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?token|auth[_-]?token|(?:^|[^a-z0-9])token$)/i;

export function isSensitiveKey(key: string): boolean {
	return SENSITIVE_KEY_PATTERN.test(key);
}
