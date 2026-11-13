import type { LeaseEndReason } from './types';

export class LeaseEndedError extends Error {
	constructor(readonly reason: LeaseEndReason) {
		super(`The lease ended: ${reason}`);
		this.name = 'LeaseEndedError';
	}
}
