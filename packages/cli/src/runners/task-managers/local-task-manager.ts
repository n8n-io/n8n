import Container from 'typedi';

import { TaskManager } from './task-manager';
import type { RequesterMessage } from '../runner-types';
import type { RequesterMessageCallback } from '../task-broker.service';
import { TaskBroker } from '../task-broker.service';

export class LocalTaskManager extends TaskManager {
	taskBroker: TaskBroker;

	id: string = 'single-main';

	constructor() {
		super();
		this.registerRequester();
	}

	registerRequester() {
		this.taskBroker = Container.get(TaskBroker);

		this.taskBroker.registerRequester(
			this.id,
			this.onMessage.bind(this) as RequesterMessageCallback,
		);
	}

	sendMessage(message: RequesterMessage.ToN8n.All) {
		void this.taskBroker.onRequesterMessage(this.id, message);
	}
}
