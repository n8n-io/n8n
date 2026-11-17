import type { LeaseEndReason } from './types';

/** The abort reason of a lease's signal. */
export class LeaseEndedError extends Error {
	constructor(readonly reason: LeaseEndReason) {
		super(`The lease ended: ${reason}`);
		this.name = 'LeaseEndedError';
	}
}
