import { Post } from '../entity/Post';
import { EntitySubscriberInterface, EventSubscriber } from '../../../../src';
import { LoadEvent } from '../../../../src/subscriber/event/LoadEvent';

@EventSubscriber()
export class ExtendedAfterLoadSubscriber implements EntitySubscriberInterface<Post> {
	listenTo() {
		return Post;
	}

	async afterLoad(entity: Post, event: LoadEvent<Post>) {
		entity.extendedSubscriberSaw = event;
	}
}
