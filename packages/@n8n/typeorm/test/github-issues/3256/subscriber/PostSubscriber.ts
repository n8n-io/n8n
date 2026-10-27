import { Post } from '../entity/Post';
import {
	EntitySubscriberInterface,
	EventSubscriber,
	InsertEvent,
	UpdateEvent,
} from '../../../../src';

@EventSubscriber()
export class PostSubscriber implements EntitySubscriberInterface<Post> {
	listenTo() {
		return Post;
	}

	async beforeInsert(event: InsertEvent<Post>) {
		event.entity.inserted = true;
	}

	async beforeUpdate(event: UpdateEvent<Post>) {
		if (event.entity) {
			event.entity.updated = true;
		}
	}
}
