import { DuplicateLeaseKindError, InvalidLeaseKindError, UnknownLeaseKindError } from './errors';
import type { LeaseProvider } from './provider';
import { DEFAULT_LEASE_KIND_OPTIONS, MAX_LEASE_KIND_LENGTH } from './types';
import type { LeaseKind, LeaseKindOptions, LeaseStatus } from './types';

const LEASE_KIND_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Registers lease kinds with a provider and forwards their changes to it. */
export class LeaseService<TTransaction> {
	private readonly kinds = new Map<string, LeaseKind<TTransaction>>();

	constructor(private readonly provider: LeaseProvider<TTransaction>) {}

	async registerKind(kind: LeaseKind<TTransaction>): Promise<void> {
		const { name } = kind;
		if (name.length > MAX_LEASE_KIND_LENGTH || !LEASE_KIND_NAME_PATTERN.test(name)) {
			throw new InvalidLeaseKindError(name);
		}
		if (this.kinds.has(name)) throw new DuplicateLeaseKindError(name);

		this.kinds.set(name, kind);

		const options: LeaseKindOptions = { ...DEFAULT_LEASE_KIND_OPTIONS };
		for (const [key, value] of Object.entries(kind.options ?? {})) {
			if (value !== undefined) Object.assign(options, { [key]: value });
		}

		this.provider.registerSource(name, kind.source);
		await this.provider.registerHolder(
			name,
			options,
			async (lease) => await kind.handler.hold(lease),
		);
	}

	async changed(kind: string, keys?: readonly string[]): Promise<void> {
		this.assertKnown(kind);
		if (keys === undefined) {
			await this.provider.sync(kind);
		} else {
			await this.provider.sync(kind, keys);
		}
	}

	async syncAll(): Promise<void> {
		for (const kind of this.kinds.keys()) {
			await this.provider.sync(kind);
		}
	}

	async status(kind: string, keys: readonly string[]): Promise<LeaseStatus[]> {
		this.assertKnown(kind);
		return await this.provider.status(kind, keys);
	}

	private assertKnown(kind: string) {
		if (!this.kinds.has(kind)) throw new UnknownLeaseKindError(kind);
	}
}
