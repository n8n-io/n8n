import { Post } from '../entity/Post';
import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from '../../../../src';

/**
 * Subscriber which checks the validity of the entity passed to beforeInsert().
 * Tests the fix for issue #5734 in which we saw an empty array leak into
 * beforeInsert().
 */
@EventSubscriber()
export class ValidEntityCheckSubscriber implements EntitySubscriberInterface<Post> {
	listenTo() {
		return Post;
	}

	beforeInsert(event: InsertEvent<Post>) {
		const entity = event.entity;
		if (Array.isArray(entity) || !entity.id) {
			throw new Error(`Subscriber saw invalid entity: ${JSON.stringify(entity)}`);
		}
	}
}
