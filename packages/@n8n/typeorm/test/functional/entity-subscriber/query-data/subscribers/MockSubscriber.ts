import { EntitySubscriberInterface, EventSubscriber, UpdateEvent } from '../../../../../src';

@EventSubscriber()
export class MockSubscriber implements EntitySubscriberInterface {
	calledData: any[] = [];

	afterUpdate(event: UpdateEvent<any>): void {
		this.calledData.push(event.queryRunner.data);
	}
}
