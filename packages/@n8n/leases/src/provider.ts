import type { Lease, LeaseKindOptions, LeaseSource, LeaseStatus } from './types';

/**
 * The port to the system that decides which process holds each lease. The
 * provider claims, renews, fences and hands over leases.
 */
export interface LeaseProvider<TTransaction> {
	/**
	 * Route the leases of `kind` that this process gets to `hold`. The provider
	 * builds each {@link Lease}, aborts its signal with a `LeaseEndedError`, and
	 * counts a failed start when `hold` throws or returns before `ready()`.
	 */
	registerHolder(
		kind: string,
		options: LeaseKindOptions,
		hold: (lease: Lease<TTransaction>) => Promise<void>,
	): Promise<void>;

	/** Set where the provider reads the desired leases of `kind`. */
	registerSource(kind: string, source: LeaseSource): void;

	/**
	 * Make the leases of `kind` match the source: add the missing ones, remove
	 * the extra ones, and hand over the ones whose data changed. With `scope`,
	 * read and change only the leases with those keys.
	 */
	sync(kind: string, scope?: readonly string[]): Promise<void>;

	/** The state of each of `keys`. Keys that the provider does not know are left out. */
	status(kind: string, keys: readonly string[]): Promise<LeaseStatus[]>;
}
