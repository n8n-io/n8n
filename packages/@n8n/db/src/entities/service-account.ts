import { ChildEntity, OneToOne, Relation } from '@n8n/typeorm';

import type { ServiceAccountDetails } from './service-account-details';
import { User } from './user';

/** An account that is not a person. Lives in the `user` table with `kind = 'service'`. */
@ChildEntity('service')
export class ServiceAccount extends User {
	override readonly kind = 'service' as const;

	/**
	 * Every service account has one. `ServiceAccountRepository.create` writes both
	 * rows in one transaction. Every `find*` query loads it. A query builder
	 * ignores eager relations, so it must join `details` itself.
	 *
	 * Because of the join, a limited `find*` on `User` (such as `findOne`) with a
	 * `select` must include `id`, and a `FOR UPDATE` lock must name its tables.
	 */
	@OneToOne('ServiceAccountDetails', 'serviceAccount', { eager: true })
	details: Relation<ServiceAccountDetails>;

	/** A service account never waits for an invite. */
	override computeIsPending(): void {
		this.isPending = false;
	}
}
