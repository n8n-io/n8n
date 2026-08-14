import { EntitySubscriberInterface, EventSubscriber, UpdateEvent } from '../../../../src';
import { Post } from '../entity/Post';

@EventSubscriber()
export class PostSubscriber implements EntitySubscriberInterface {
	listenTo(): string | Function {
		return Post;
	}

	beforeUpdate(event: UpdateEvent<Post>): void | Promise<Post> {
		event.entity!.updatedNameColumnsCount = event.updatedColumns.reduce((p, c) => {
			return p + (c.propertyName === 'name' ? 1 : 0);
		}, 0);
	}

	afterUpdate(event: UpdateEvent<Post>): void | Promise<Post> {
		event.entity!.updatedNameColumnsCount = event.updatedColumns.reduce((p, c) => {
			return p + (c.propertyName === 'name' ? 1 : 0);
		}, 0);
	}
}
