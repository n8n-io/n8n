import {
	EntitySubscriberInterface,
	EventSubscriber,
	RecoverEvent,
	SoftRemoveEvent,
	UpdateEvent,
} from '../../../../src';
import { Post } from '../entity/Post';

@EventSubscriber()
export class PostSubscriber implements EntitySubscriberInterface {
	listenTo() {
		return Post;
	}

	beforeUpdate(event: UpdateEvent<Post>): void {
		const { entity } = event;
		entity!.beforeUpdateSubscriber++;
	}

	afterUpdate(event: UpdateEvent<Post>): void {
		const { entity } = event;
		entity!.afterUpdateSubscriber++;
	}

	beforeSoftRemove(event: SoftRemoveEvent<Post>): void {
		const { entity } = event;
		entity!.beforeSoftRemoveSubscriber++;
	}

	afterSoftRemove(event: SoftRemoveEvent<Post>): void {
		const { entity } = event;
		entity!.afterSoftRemoveSubscriber++;
	}

	beforeRecover(event: RecoverEvent<Post>): void {
		const { entity } = event;
		entity!.beforeRecoverSubscriber++;
	}

	afterRecover(event: RecoverEvent<Post>): void {
		const { entity } = event;
		entity!.afterRecoverSubscriber++;
	}
}
