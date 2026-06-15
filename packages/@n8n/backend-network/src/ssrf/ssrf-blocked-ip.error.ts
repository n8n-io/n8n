import { UserError } from 'n8n-workflow';

/**
 * Error thrown when a resolved address is denied by SSRF IP policy.
 */
export class SsrfBlockedIpError extends UserError {
	readonly ip: string;
	readonly hostname?: string;

	constructor(ip: string, hostname?: string) {
		const target = hostname ? `'${hostname}' (${ip})` : ip;
		super('The request was blocked because it resolves to a restricted IP address', {
			description:
				`The target ${target} is not allowed. ` +
				'This is a security measure to prevent Server-Side Request Forgery (SSRF). ' +
				'If you need to access internal resources, ask your n8n administrator to allowlist ' +
				'the hostname or IP range in the environment configuration.',
			extra: { ip, hostname },
		});

		this.name = 'SsrfBlockedIpError';
		this.ip = ip;
		this.hostname = hostname;
	}
}
