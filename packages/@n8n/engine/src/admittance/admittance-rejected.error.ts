/**
 * Thrown when the admittance gate rejects an execution (e.g. backpressure).
 * The HTTP layer maps this to a 429.
 */
export class AdmittanceRejectedError extends Error {
	constructor(readonly reason: string) {
		super(`Execution admittance rejected: ${reason}`);
		this.name = 'AdmittanceRejectedError';
	}
}
