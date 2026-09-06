import { SCHEDULED_JOB_OWNER_TYPE_MAX_LENGTH } from '@n8n/constants';

import { DuplicateOwnerResolverError, InvalidOwnerTypeError } from '../errors';

/**
 * Answers, for one owner type, which owners still exist.
 *
 * The scheduler cannot know what an owner is, so every module that owns
 * scheduled jobs registers one of these (see {@link ScheduledJobOwnerRegistry}).
 * It is the liveness half of the owner contract; the other half is
 * deprovisioning the owner's jobs in the module's own delete transaction.
 */
export interface ScheduledJobOwnerResolver {
	/**
	 * @param ownerIds the owner ids to check, all of this resolver's own owner
	 * type, deduplicated and non-empty.
	 * @returns the ids that still exist. Absence from the result is read as a
	 * positive statement that the owner is gone, so never omit an id the lookup
	 * simply could not cover.
	 * @throws when existence cannot be determined at all (a data source is
	 * unreachable, a dependency is not ready). The sweep then leaves every job of
	 * this owner type untouched, rather than treating "could not tell" as "gone".
	 */
	findExisting(ownerIds: string[]): Promise<Set<string>>;
}

/**
 * Where the liveness resolvers register, one per owner type. Populated by the
 * host before the reconciliation pass runs, and read by the provisioning
 * guardrail that refuses an owner type with no cleanup story.
 */
export class ScheduledJobOwnerRegistry {
	private readonly resolvers = new Map<string, ScheduledJobOwnerResolver>();

	/**
	 * Claim an owner type and bind its liveness resolver. Registering the same
	 * resolver again is a no-op, so a module may register defensively.
	 *
	 * @throws {InvalidOwnerTypeError} when the owner type is empty or longer
	 * than the column allows.
	 * @throws {DuplicateOwnerResolverError} when the owner type is already
	 * claimed by a different resolver.
	 */
	register(ownerType: string, resolver: ScheduledJobOwnerResolver): void {
		if (ownerType === '' || ownerType.length > SCHEDULED_JOB_OWNER_TYPE_MAX_LENGTH) {
			throw new InvalidOwnerTypeError(ownerType, SCHEDULED_JOB_OWNER_TYPE_MAX_LENGTH);
		}

		const existing = this.resolvers.get(ownerType);
		if (existing === resolver) {
			return;
		}
		if (existing !== undefined) {
			throw new DuplicateOwnerResolverError(ownerType);
		}

		this.resolvers.set(ownerType, resolver);
	}

	/** Whether provisioning is allowed for this owner type. */
	has(ownerType: string): boolean {
		return this.resolvers.has(ownerType);
	}

	/** The resolver for this owner type, or `undefined` when nothing claimed it. */
	resolverFor(ownerType: string): ScheduledJobOwnerResolver | undefined {
		return this.resolvers.get(ownerType);
	}

	/** The claimed owner types, so a composition point can report what it wired. */
	ownerTypes(): string[] {
		return [...this.resolvers.keys()];
	}
}
