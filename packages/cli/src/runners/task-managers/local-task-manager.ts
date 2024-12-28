import type { RequesterMessage } from '@n8n/task-runner';
import Container, { Service } from 'typedi';

import { NodeTypes } from '@/node-types';

import { TaskManager } from './task-manager';
import type { RequesterMessageCallback } from '../task-broker.service';
import { TaskBroker } from '../task-broker.service';

@Service()
export class LocalTaskManager extends TaskManager {
	taskBroker: TaskBroker;

	id: string = 'single-main';

	constructor(nodeTypes: NodeTypes) {
		super(nodeTypes);
		this.registerRequester();
	}

	registerRequester() {
		this.taskBroker = Container.get(TaskBroker);

		this.taskBroker.registerRequester(
			this.id,
			this.onMessage.bind(this) as RequesterMessageCallback,
		);
	}

	sendMessage(message: RequesterMessage.ToBroker.All) {
		void this.taskBroker.onRequesterMessage(this.id, message);
	}
}
