import { EntitySubscriberInterface, EventSubscriber } from '../../../../src';
import { BORROWED } from '../entity/User';

@EventSubscriber()
export class BorrowedSubscriber implements EntitySubscriberInterface {
	listenTo(): string | Function {
		return BORROWED;
	}

	afterInsert(): void | Promise<any> {}
}
