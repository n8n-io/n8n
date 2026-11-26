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
		super(`Invalid lease kind name: ${name}`);
		this.name = 'InvalidLeaseKindError';
	}
}

export class InvalidLeaseKindOptionsError extends Error {
	constructor(name: string, option: string, value: unknown, options?: ErrorOptions) {
		super(`Invalid lease kind option ${option} for ${name}: ${String(value)}`, options);
		this.name = 'InvalidLeaseKindOptionsError';
	}
}

export class DuplicateLeaseKindError extends Error {
	constructor(name: string) {
		super(`Lease kind already registered: ${name}`);
		this.name = 'DuplicateLeaseKindError';
	}
}

export class UnknownLeaseKindError extends Error {
	constructor(name: string) {
		super(`Unknown lease kind: ${name}`);
		this.name = 'UnknownLeaseKindError';
	}
}
