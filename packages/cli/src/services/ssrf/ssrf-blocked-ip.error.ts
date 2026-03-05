import { UserError } from 'n8n-workflow';

/**
 * Error thrown when a resolved address is denied by SSRF IP policy.
 */
export class SsrfBlockedIpError extends UserError {
	readonly ip: string;
	readonly hostname?: string;

	constructor(ip: string, hostname?: string) {
		super('IP address is blocked', {
			extra: { ip, hostname },
		});

		this.name = 'SsrfBlockedIpError';
		this.ip = ip;
		this.hostname = hostname;
	}
}
