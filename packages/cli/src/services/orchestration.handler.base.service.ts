import type { WorkerCommandReceivedHandlerOptions } from './orchestration/worker/types';
import type { MainResponseReceivedHandlerOptions } from './orchestration/main/types';

export abstract class OrchestrationHandlerService {
	protected initialized = false;

	async init() {
		await this.initSubscriber();
		this.initialized = true;
	}

	async initWithOptions(
		options: WorkerCommandReceivedHandlerOptions | MainResponseReceivedHandlerOptions,
	) {
		await this.initSubscriber(options);
		this.initialized = true;
	}

	async shutdown() {
		this.initialized = false;
	}

	protected abstract initSubscriber(
		options?: WorkerCommandReceivedHandlerOptions | MainResponseReceivedHandlerOptions,
	): Promise<void>;
}
