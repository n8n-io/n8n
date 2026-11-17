import { DuplicateLeaseKindError, InvalidLeaseKindError, UnknownLeaseKindError } from './errors';
import type { LeaseProvider } from './provider';
import { DEFAULT_LEASE_KIND_OPTIONS, MAX_LEASE_KIND_LENGTH } from './types';
import type { LeaseKind, LeaseKindOptions, LeaseStatus } from './types';

const LEASE_KIND_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Registers lease kinds with a provider and forwards their changes to it. */
export class LeaseService<TTransaction> {
	private readonly kinds = new Map<string, LeaseKind<TTransaction>>();

	constructor(private readonly provider: LeaseProvider<TTransaction>) {}

	/** Register a kind with the provider. Rejects when the name is invalid or already registered. */
	async registerKind(kind: LeaseKind<TTransaction>): Promise<void> {
		const { name } = kind;
		if (name.length > MAX_LEASE_KIND_LENGTH || !LEASE_KIND_NAME_PATTERN.test(name)) {
			throw new InvalidLeaseKindError(name);
		}
		if (this.kinds.has(name)) throw new DuplicateLeaseKindError(name);

		this.kinds.set(name, kind);

		const {
			leaseSeconds,
			startTimeoutSeconds = DEFAULT_LEASE_KIND_OPTIONS.startTimeoutSeconds,
			maxFailedStarts = DEFAULT_LEASE_KIND_OPTIONS.maxFailedStarts,
		} = kind.options ?? {};
		const options: LeaseKindOptions = { leaseSeconds, startTimeoutSeconds, maxFailedStarts };

		this.provider.registerSource(name, kind.source);
		await this.provider.registerHolder(
			name,
			options,
			async (lease) => await kind.handler.hold(lease),
		);
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
		for (const kind of this.kinds.keys()) {
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
		if (!this.kinds.has(kind)) throw new UnknownLeaseKindError(kind);
	}
}
