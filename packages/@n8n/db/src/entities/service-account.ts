import { ChildEntity, OneToOne, Relation } from '@n8n/typeorm';
import { type IUser, UnexpectedError } from 'n8n-workflow';

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

	/** No email. The name goes in `firstName`, as in `accountSummary`. */
	override toIUser(): IUser {
		// `details` loads eagerly, so this fails only for a query builder that skipped the join.
		if (!this.details) {
			throw new UnexpectedError('Service account details were not loaded', {
				extra: { userId: this.id },
			});
		}
		return { id: this.id, email: '', firstName: this.details.name, lastName: '' };
	}
}
