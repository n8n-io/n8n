import {
	EntitySubscriberInterface,
	EventSubscriber,
	InsertEvent,
	LoadEvent,
	UpdateEvent,
} from '../../../../src';
import { Setting } from './Setting';

@EventSubscriber()
export class SettingSubscriber implements EntitySubscriberInterface {
	counter: any;

	constructor() {
		this.reset();
	}

	listenTo() {
		return Setting;
	}

	afterLoad(item: Setting, event?: LoadEvent<Setting>) {
		// just an example, any entity modification on after load will lead to this issue
		item.value = 'x';
	}

	beforeUpdate(event: UpdateEvent<any>): void {
		this.counter.updates++;
	}

	beforeInsert(event: InsertEvent<any>): void {
		this.counter.inserts++;
	}

	beforeRemove(event: UpdateEvent<any>): void {
		this.counter.deletes++;
	}

	reset() {
		this.counter = {
			deletes: 0,
			inserts: 0,
			updates: 0,
		};
	}
}
