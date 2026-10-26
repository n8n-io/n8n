import { ChildEntity } from '@n8n/typeorm';

import { User } from './user';

/** An account that is not a person. Lives in the `user` table with `kind = 'service'`. */
@ChildEntity('service')
export class ServiceAccount extends User {
	override readonly kind = 'service' as const;

	/** A service account never waits for an invite. */
	override computeIsPending(): void {
		this.isPending = false;
	}
}
