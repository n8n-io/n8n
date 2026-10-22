import { ChildEntity } from '@n8n/typeorm';

import { Actor } from './actor';

/** An account that is not a person. Lives in the `user` table with `kind = 'service'`. */
@ChildEntity('service')
export class ServiceAccount extends Actor {
	declare readonly kind: 'service';
}
