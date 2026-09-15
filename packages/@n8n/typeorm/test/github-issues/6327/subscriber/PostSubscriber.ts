import { expect } from 'chai';
import { EntitySubscriberInterface, EventSubscriber } from '../../../../src';
import { RecoverEvent } from '../../../../src/subscriber/event/RecoverEvent';
import { SoftRemoveEvent } from '../../../../src/subscriber/event/SoftRemoveEvent';
import { Post } from '../entity/Post';

@EventSubscriber()
export class PostSubscriber implements EntitySubscriberInterface<Post> {
	listenTo() {
		return Post;
	}

	afterSoftRemove(event: SoftRemoveEvent<Post>): void {
		const { entity } = event;

		expect(Object.prototype.toString.call(entity!.deletedAt)).to.be.eq('[object Date]');
	}

	afterRecover(event: RecoverEvent<Post>): void {
		const { entity } = event;

		expect(entity!.deletedAt).to.be.null;
	}
}
