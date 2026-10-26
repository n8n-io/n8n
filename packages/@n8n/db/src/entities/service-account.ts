import { ChildEntity, OneToOne, Relation } from '@n8n/typeorm';

import type { ServiceAccountDetails } from './service-account-details';
import { User } from './user';

/** An account that is not a person. Lives in the `user` table with `kind = 'service'`. */
@ChildEntity('service')
export class ServiceAccount extends User {
	override readonly kind = 'service' as const;

	/** Not set when the query did not load it. */
	@OneToOne('ServiceAccountDetails', 'serviceAccount')
	details?: Relation<ServiceAccountDetails>;

	/** A service account never waits for an invite. */
	override computeIsPending(): void {
		this.isPending = false;
	}
}
