import Container from 'typedi';

import type { WorkerMessageCallback } from '../agent-manager.service';
import type { WorkerMessage } from '../agent-types';
import { AbstractEngine } from './abstract.engine';
import { AgentManager } from '../agent-manager.service';

export class SingleMainEngine extends AbstractEngine {
	agentManager: AgentManager;

	id: string = 'single-main';

	constructor() {
		super();
		this.registerWorker();
	}

	registerWorker() {
		this.agentManager = Container.get(AgentManager);

		this.agentManager.registerWorker(this.id, this.onMessage.bind(this) as WorkerMessageCallback);
	}

	sendMessage(message: WorkerMessage.ToN8n.All) {
		console.log(message);
		void this.agentManager.onWorkerMessage(this.id, message);
	}
}
