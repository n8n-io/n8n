import { ChildEntity } from '@n8n/typeorm';
import type { IUser } from 'n8n-workflow';

import { Actor } from './actor';

/**
 * A non-human caller. Lives in the `user` table with `type = 'service'`.
 * Columns that only a service account needs are added as nullable columns on
 * `user`, or in a side table keyed by `id`.
 */
@ChildEntity('service')
export class ServiceAccount extends Actor {
	declare readonly type: 'service';

	override createPersonalProjectName() {
		return 'Unnamed Project';
	}

	/** A service account has no mailbox and no name yet. The display name comes with its own ticket. */
	override toIUser(): IUser {
		return { id: this.id, email: '', firstName: '', lastName: '' };
	}
}
