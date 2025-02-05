import { Container, Service } from '@n8n/di';
import type { RequesterMessage } from '@n8n/task-runner';

import { NodeTypes } from '@/node-types';
import type { RequesterMessageCallback } from '@/task-runners/task-broker/task-broker.service';
import { TaskBroker } from '@/task-runners/task-broker/task-broker.service';

import { TaskRequester } from './task-requester';

@Service()
export class LocalTaskRequester extends TaskRequester {
	taskBroker: TaskBroker;

	id = 'local-task-requester';

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
