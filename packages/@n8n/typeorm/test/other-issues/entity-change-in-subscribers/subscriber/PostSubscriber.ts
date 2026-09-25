import { Post } from '../entity/Post';
import { EntitySubscriberInterface, EventSubscriber, UpdateEvent } from '../../../../src';

@EventSubscriber()
export class PostSubscriber implements EntitySubscriberInterface<Post> {
	listenTo() {
		return Post;
	}

	beforeUpdate(event: UpdateEvent<Post>) {
		if (event.entity) {
			event.entity.updatedColumns = event.updatedColumns.length;
			event.entity.updatedRelations = event.updatedRelations.length;
		}
	}
}
