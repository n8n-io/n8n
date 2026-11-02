import { DuplicateLeaseKindError, InvalidLeaseKindError, UnknownLeaseKindError } from './errors';
import type { LeaseProvider } from './provider';
import type { LeaseKind } from './types';
import { DEFAULT_LEASE_KIND_OPTIONS, MAX_LEASE_KIND_LENGTH } from './types';

const LEASE_KIND_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Where kinds register and report changes to the leases they want. The
 * {@link LeaseProvider} decides which process holds each lease.
 */
export class LeaseService<TTransaction> {
	private readonly kinds = new Map<string, LeaseKind<TTransaction>>();

	constructor(private readonly provider: LeaseProvider<TTransaction>) {}

	registerKind(kind: LeaseKind<TTransaction>): void {
		if (!LEASE_KIND_PATTERN.test(kind.name) || kind.name.length > MAX_LEASE_KIND_LENGTH) {
			throw new InvalidLeaseKindError(kind.name);
		}
		if (this.kinds.has(kind.name)) throw new DuplicateLeaseKindError(kind.name);
		this.kinds.set(kind.name, kind);

		this.provider.registerHolder(
			kind.name,
			{ ...DEFAULT_LEASE_KIND_OPTIONS, ...kind.options },
			async (lease) => await kind.handler.hold(lease),
		);
		this.provider.registerLiveness(kind.name, async (keys) => {
			const desired = await kind.listDesired(keys);
			return new Set(desired.map((spec) => spec.key));
		});
	}

	/** Tell the provider that the desired leases of `kind` changed, for `keys` or for all of them. */
	async changed(kindName: string, keys?: readonly string[]): Promise<void> {
		const kind = this.kinds.get(kindName);
		if (kind === undefined) throw new UnknownLeaseKindError(kindName);
		const desired = await kind.listDesired(keys);
		await this.provider.sync(kindName, desired, keys);
	}

	/** Sync every kind in full, for example at startup. */
	async syncAll(): Promise<void> {
		for (const kind of this.kinds.keys()) {
			await this.changed(kind);
		}
	}
}
