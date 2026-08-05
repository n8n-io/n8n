import { Post } from '../entity/Post';
import {
	EntitySubscriberInterface,
	EventSubscriber,
	UpdateEvent,
	InsertEvent,
} from '../../../../src';

@EventSubscriber()
export class PostSubscriber implements EntitySubscriberInterface<Post> {
	listenTo() {
		return Post;
	}

	beforeUpdate(event: UpdateEvent<Post>) {
		if (event.entity) {
			event.entity['title'] = 'set in subscriber when updated';
		}
	}

	beforeInsert(event: InsertEvent<Post>) {
		if (event.entity) {
			event.entity['title'] = 'set in subscriber when created';
		}
	}
}
