// A bare `token` only counts as a suffix (`bot_token`, `x.token`): keys that
// merely start with it (`token_type`, `token_count`) describe a token rather
// than hold one.
export const SENSITIVE_KEY_PATTERN =
	/(api[_-]?key|private[_-]?key|authorization|bearer|cookie|credentials?|password|passwd|secret|access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?token|auth[_-]?token|(?:^|[._-])token$)/i;

export function isSensitiveKey(key: string): boolean {
	return SENSITIVE_KEY_PATTERN.test(key);
}
