/**
 * Error thrown when DNS resolution returns no usable address.
 */
export class SsrfDnsResolutionError extends Error {
	readonly hostname: string;

	constructor(hostname: string) {
		super('DNS resolution failed');
		this.name = 'SsrfDnsResolutionError';
		this.hostname = hostname;
	}
}
