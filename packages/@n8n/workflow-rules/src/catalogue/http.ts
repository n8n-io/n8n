import type { RuleNode } from '../types';

export const HTTP_REQUEST_NODE_TYPES: ReadonlySet<string> = new Set([
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.httpRequestTool',
	'@n8n/n8n-nodes-langchain.toolHttpRequest',
]);

export function isHttpRequestNode(node: RuleNode): boolean {
	return HTTP_REQUEST_NODE_TYPES.has(node.type);
}

/** The host of a literal URL, or `undefined` when the value is not a URL. */
export function hostOf(url: string): string | undefined {
	const trimmed = url.trim();
	if (trimmed.length === 0) return undefined;
	for (const candidate of [trimmed, `https://${trimmed}`]) {
		try {
			const { hostname } = new URL(candidate);
			if (hostname) return hostname.toLowerCase();
		} catch {
			// Try the next form.
		}
	}
	return undefined;
}

export function normalizeDomain(domain: string): string {
	return domain.trim().toLowerCase().replace(/^\*\./, '').replace(/\.$/, '');
}

/** `example.com` matches `example.com` and every subdomain of it. */
export function hostMatchesDomain(host: string, domain: string): boolean {
	const normalized = normalizeDomain(domain);
	return host === normalized || host.endsWith(`.${normalized}`);
}

export function intersectDomains(a: readonly string[], b: readonly string[]): string[] {
	// A domain survives when the other list allows it, directly or through a parent domain.
	const allowedBy = (domain: string, list: readonly string[]) =>
		list.some((other) => hostMatchesDomain(normalizeDomain(domain), other));
	const fromA = a.filter((domain) => allowedBy(domain, b));
	const fromB = b.filter((domain) => allowedBy(domain, a));
	return [...new Set([...fromA, ...fromB].map(normalizeDomain))];
}
