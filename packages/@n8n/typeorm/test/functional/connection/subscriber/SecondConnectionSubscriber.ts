import { EntitySubscriberInterface } from '../../../../src/subscriber/EntitySubscriberInterface';
import { EventSubscriber } from '../../../../src/decorator/listeners/EventSubscriber';
import { InsertEvent } from '../../../../src/subscriber/event/InsertEvent';

@EventSubscriber()
export class SecondConnectionSubscriber implements EntitySubscriberInterface {
	/**
	 * Called after entity insertion.
	 */
	beforeInsert(event: InsertEvent<any>) {
		// Do nothing
	}
}
