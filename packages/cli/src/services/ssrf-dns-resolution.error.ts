/**
 * Error thrown when DNS resolution returns no usable address.
 */
export class SsrfDnsResolutionError extends Error {
	readonly hostname: string;

	constructor(hostname: string, options?: ErrorOptions) {
		super('DNS resolution failed', options);
		this.name = 'SsrfDnsResolutionError';
		this.hostname = hostname;
	}
}
