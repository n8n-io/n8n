import type { LeaseEndReason } from './types';

/** The abort reason of a lease's signal. */
export class LeaseEndedError extends Error {
	constructor(readonly reason: LeaseEndReason) {
		super(`The lease ended: ${reason}`);
		this.name = 'LeaseEndedError';
	}
}

export class InvalidLeaseKindError extends Error {
	constructor(name: string) {
		super(`Invalid lease kind name: "${name}"`);
		this.name = 'InvalidLeaseKindError';
	}
}

export class DuplicateLeaseKindError extends Error {
	constructor(name: string) {
		super(`Lease kind "${name}" is already registered`);
		this.name = 'DuplicateLeaseKindError';
	}
}

export class UnknownLeaseKindError extends Error {
	constructor(name: string) {
		super(`Lease kind "${name}" is not registered`);
		this.name = 'UnknownLeaseKindError';
	}
}
