import { EventSubscriber } from '../../../../../../src/decorator/listeners/EventSubscriber';
import { EntitySubscriberInterface } from '../../../../../../src/subscriber/EntitySubscriberInterface';
import { InsertEvent } from '../../../../../../src/subscriber/event/InsertEvent';

@EventSubscriber()
export class TestQuestionSubscriber implements EntitySubscriberInterface {
	/**
	 * Called before entity insertion.
	 */
	beforeInsert(event: InsertEvent<any>) {
		// Do nothing
	}
}
