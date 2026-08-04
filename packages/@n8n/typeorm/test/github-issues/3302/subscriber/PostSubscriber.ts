import { Post } from '../entity/Post';
import { EntitySubscriberInterface, EventSubscriber } from '../../../../src';
import { AfterQueryEvent, BeforeQueryEvent } from '../../../../src/subscriber/event/QueryEvent';
import { PlatformTools } from '../../../../src/platform/PlatformTools';
import appRootPath from 'app-root-path';
@EventSubscriber()
export class PostSubscriber implements EntitySubscriberInterface<Post> {
	listenTo() {
		return Post;
	}

	beforeQuery(event: BeforeQueryEvent<Post>): void | Promise<any> {
		PlatformTools.appendFileSync(appRootPath.path + '/before-query.log', event.query);
	}

	afterQuery(event: AfterQueryEvent<Post>): void | Promise<any> {
		PlatformTools.appendFileSync(appRootPath.path + '/after-query.log', event.query);
	}
}
