import type { Lease, LeaseKindOptions, LeaseSpec } from './types';

/**
 * The port a host binds to the system that decides which process holds each
 * lease, for example the durable scheduler's held tasks. The provider claims,
 * renews, fences and hands over leases; this package only routes kinds to it.
 * `TTransaction` is the transaction handle each {@link Lease} checks itself in.
 */
export interface LeaseProvider<TTransaction> {
	/**
	 * Route the leases of `kind` that this process gets to `hold`. The provider
	 * builds each {@link Lease}, aborts its signal with a `LeaseEndedError`, and
	 * counts a failed start when `hold` throws or returns before `ready()`. Each
	 * lease must answer {@link Lease.isHeld} with the guarantee its fence states.
	 */
	registerHolder(
		kind: string,
		options: LeaseKindOptions,
		hold: (lease: Lease<TTransaction>) => Promise<void>,
	): void;

	/**
	 * Answer which of `keys` the kind still wants, so the provider can clean up
	 * leases whose owner disappeared without a {@link sync}.
	 */
	registerLiveness(kind: string, findDesired: (keys: string[]) => Promise<Set<string>>): void;

	/**
	 * Make the provider's leases of `kind` match `desired`: add the missing ones,
	 * remove the extra ones, and hand over the ones whose data changed. With
	 * `scope`, only leases with those keys are touched.
	 */
	sync(kind: string, desired: readonly LeaseSpec[], scope?: readonly string[]): Promise<void>;
}
