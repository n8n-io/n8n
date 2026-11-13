import type { Lease, LeaseKindOptions, LeaseSource, LeaseStatus } from './types';

export interface LeaseProvider<TTransaction> {
	registerHolder(
		kind: string,
		options: LeaseKindOptions,
		hold: (lease: Lease<TTransaction>) => Promise<void>,
	): Promise<void>;

	registerSource(kind: string, source: LeaseSource): void;

	sync(kind: string, scope?: readonly string[]): Promise<void>;

	status(kind: string, keys: readonly string[]): Promise<LeaseStatus[]>;
}
