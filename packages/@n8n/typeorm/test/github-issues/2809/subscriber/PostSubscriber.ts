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

	afterUpdate(event: UpdateEvent<Post>) {
		if (event.entity) {
			event.entity['title'] = 'set in subscriber after updated';
		}
	}

	afterInsert(event: InsertEvent<Post>) {
		if (event.entity) {
			event.entity['title'] = 'set in subscriber after created';
		}
	}
}
