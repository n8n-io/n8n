/**
 * Error thrown when a resolved address is denied by SSRF IP policy.
 */
export class SsrfBlockedIpError extends Error {
	readonly ip: string;

	constructor(ip: string) {
		super('IP address is blocked');
		this.name = 'SsrfBlockedIpError';
		this.ip = ip;
	}
}
