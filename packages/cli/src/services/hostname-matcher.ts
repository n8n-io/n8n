type ParsedPattern =
	| { isWildcard: true; suffix: string; bareDomain: string }
	| { isWildcard: false; value: string };

/**
 * Case-insensitive hostname matcher supporting wildcard patterns.
 *
 * Patterns like `*.n8n.internal` match any subdomain (e.g. `api.n8n.internal`,
 * `deep.sub.n8n.internal`) as well as the bare domain (`n8n.internal`).
 */
export class HostnameMatcher {
	private readonly parsed: ParsedPattern[];

	constructor(patterns: readonly string[]) {
		this.parsed = patterns.map((p) => {
			const lower = p.toLowerCase();
			if (lower.startsWith('*.')) {
				const suffix = lower.slice(1); // ".example.com"
				return { isWildcard: true, suffix, bareDomain: suffix.slice(1) };
			}
			return { isWildcard: false, value: lower };
		});
	}

	/**
	 * Check whether a hostname matches any configured allowlist pattern.
	 */
	matches(hostname: string): boolean {
		const hostnameLower = hostname.toLowerCase();

		for (const pattern of this.parsed) {
			if (pattern.isWildcard) {
				// Subdomain match: "api.example.com" ends with ".example.com" and is longer than just the suffix
				if (
					hostnameLower.endsWith(pattern.suffix) &&
					hostnameLower.length > pattern.suffix.length
				) {
					return true;
				}
				// Bare domain match: *.example.com also matches "example.com" itself
				if (hostnameLower === pattern.bareDomain) {
					return true;
				}
			} else if (hostnameLower === pattern.value) {
				return true;
			}
		}

		return false;
	}
}
