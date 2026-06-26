import { UserError } from 'n8n-workflow';

/**
 * Error thrown when a destination hostname is denied by egress hostname policy.
 *
 * This is an egress-governance control (deny by name, before DNS resolution),
 * distinct from the IP-based {@link SsrfBlockedIpError} that backs the robust
 * SSRF guarantees. It is bypassable by an attacker who controls the URL
 * (IP-literal targets, alias hostnames, DNS rebinding); the IP-based checks
 * remain the post-resolution safety net.
 */
export class SsrfBlockedHostnameError extends UserError {
	readonly hostname: string;

	constructor(hostname: string) {
		super('The request was blocked because the destination hostname is restricted', {
			description:
				`The hostname '${hostname}' is on the configured blocked hostnames list. ` +
				'If you need to reach this destination, ask your n8n administrator to remove it from ' +
				'the blocked hostnames or add it to the allowed hostnames.',
			extra: { hostname },
		});

		this.name = 'SsrfBlockedHostnameError';
		this.hostname = hostname;
	}
}
