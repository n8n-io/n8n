import {
	DuplicateLeaseKindError,
	InvalidLeaseKindError,
	InvalidLeaseKindOptionsError,
	UnknownLeaseKindError,
} from './errors';
import type { LeaseProvider } from './provider';
import { DEFAULT_LEASE_KIND_OPTIONS, MAX_LEASE_KIND_LENGTH } from './constants';
import type { LeaseKind, LeaseKindOptions, LeaseStatus } from './types';

const LEASE_KIND_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

function assertPositiveInteger(kind: string, option: string, value: unknown) {
	if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
		throw new InvalidLeaseKindOptionsError(kind, option, value);
	}
}

/** Registers lease kinds with a provider and forwards their changes to it. */
export class LeaseService<TTransaction> {
	private readonly acceptedKindNames = new Set<string>();

	private readonly kindNamesPendingRegistration = new Set<string>();

	constructor(private readonly provider: LeaseProvider<TTransaction>) {}

	/**
	 * Register a kind with the provider. Rejects when the name is invalid or already registered,
	 * or when an option is not a positive integer.
	 * When the provider fails, the kind is not registered and can be registered again.
	 * Until the provider accepts the kind, `changed`, `syncAll` and `status` treat it as unknown.
	 */
	async registerKind(kind: LeaseKind<TTransaction>): Promise<void> {
		const { name } = kind;
		if (name.length > MAX_LEASE_KIND_LENGTH || !LEASE_KIND_NAME_PATTERN.test(name)) {
			throw new InvalidLeaseKindError(name);
		}
		if (this.acceptedKindNames.has(name) || this.kindNamesPendingRegistration.has(name))
			throw new DuplicateLeaseKindError(name);

		const {
			leaseSeconds,
			startTimeoutSeconds = DEFAULT_LEASE_KIND_OPTIONS.startTimeoutSeconds,
			maxFailedStarts = DEFAULT_LEASE_KIND_OPTIONS.maxFailedStarts,
		} = kind.options ?? {};
		if (leaseSeconds !== undefined) assertPositiveInteger(name, 'leaseSeconds', leaseSeconds);
		assertPositiveInteger(name, 'startTimeoutSeconds', startTimeoutSeconds);
		if (maxFailedStarts !== null) assertPositiveInteger(name, 'maxFailedStarts', maxFailedStarts);
		const options: LeaseKindOptions = { startTimeoutSeconds, maxFailedStarts };
		if (leaseSeconds !== undefined) options.leaseSeconds = leaseSeconds;

		this.kindNamesPendingRegistration.add(name);
		try {
			this.provider.registerSource(name, kind.source);
			await this.provider.registerHolder(
				name,
				options,
				async (lease) => await kind.handler.hold(lease),
			);
		} finally {
			this.kindNamesPendingRegistration.delete(name);
		}
		this.acceptedKindNames.add(name);
	}

	/** Sync the leases of a registered kind, or only those with `keys`. */
	async changed(kind: string, keys?: readonly string[]): Promise<void> {
		this.assertKnown(kind);
		if (keys === undefined) {
			await this.provider.sync(kind);
		} else {
			await this.provider.sync(kind, keys);
		}
	}

	/** Sync the leases of every registered kind. */
	async syncAll(): Promise<void> {
		const failed: string[] = [];
		const errors: unknown[] = [];
		for (const kind of this.acceptedKindNames) {
			try {
				await this.provider.sync(kind);
			} catch (error) {
				failed.push(kind);
				errors.push(error);
			}
		}
		if (errors.length > 0) {
			throw new AggregateError(errors, `Failed to sync lease kinds: ${failed.join(', ')}`);
		}
	}

	/** The state of each of `keys` in a registered kind. */
	async status(kind: string, keys: readonly string[]): Promise<LeaseStatus[]> {
		this.assertKnown(kind);
		return await this.provider.status(kind, keys);
	}

	private assertKnown(kind: string) {
		if (!this.acceptedKindNames.has(kind)) throw new UnknownLeaseKindError(kind);
	}
}
