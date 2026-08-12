/**
 * Parsed wildcard pattern for suffix matching (e.g. `*.example.com`).
 * `suffix` includes the leading dot (`.example.com`).
 */
type WildcardPattern = { isWildcard: true; suffix: string };

/** Parsed exact-match hostname pattern (e.g. `api.example.com`). */
type ExactPattern = { isWildcard: false; value: string };

type ParsedPattern = WildcardPattern | ExactPattern;

/**
 * Case-insensitive hostname matcher supporting wildcard patterns.
 *
 * Patterns like `*.bitcoin-miner.com` match any subdomain
 * (e.g. `pool.bitcoin-miner.com`, `deep.sub.bitcoin-miner.com`),
 * but not the bare domain.
 */
export class HostnameMatcher {
	private readonly parsed: ParsedPattern[];

	constructor(patterns: readonly string[]) {
		this.parsed = patterns
			.map((p) => this.normalizeHostname(p))
			.filter(Boolean)
			.map((value) => {
				if (value.startsWith('*.')) {
					const suffix = value.slice(1); // ".example.com"
					return { isWildcard: true, suffix };
				}
				return { isWildcard: false, value };
			});
	}

	/**
	 * Check whether a hostname matches any configured allowlist pattern.
	 */
	matches(hostname: string): boolean {
		const normalizedHostname = this.normalizeHostname(hostname);

		for (const pattern of this.parsed) {
			if (pattern.isWildcard) {
				// Subdomain match: "api.example.com" ends with ".example.com" and
				// is longer than just the suffix
				if (
					normalizedHostname.endsWith(pattern.suffix) &&
					normalizedHostname.length > pattern.suffix.length
				) {
					return true;
				}
				continue;
			}

			// Direct match
			if (normalizedHostname === pattern.value) {
				return true;
			}
		}

		return false;
	}

	private normalizeHostname(hostname: string): string {
		const trimmed = hostname.trim().toLowerCase();
		return trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
	}
}
