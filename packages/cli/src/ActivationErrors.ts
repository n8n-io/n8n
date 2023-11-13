import { Service } from 'typedi';
import { CacheService } from './services/cache.service';

export type WorkflowActivationError = {
	time: number; // ms
	error: {
		message: string;
	};
};

@Service()
export class ActivationErrors {
	constructor(private readonly cacheService: CacheService) {}

	async set(workflowId: string, error: WorkflowActivationError) {
		const key = this.toCacheKey(workflowId);

		await this.cacheService.set(key, error);
	}

	async unset(workflowId: string) {
		const key = this.toCacheKey(workflowId);

		const exists = await this.get(workflowId);

		if (!exists) return;

		await this.cacheService.delete(key);
	}

	async get(workflowId: string) {
		const key = this.toCacheKey(workflowId);

		return this.cacheService.get<WorkflowActivationError>(key);
	}

	create(error: Error): WorkflowActivationError {
		return {
			time: new Date().getTime(),
			error: {
				message: error.message,
			},
		};
	}

	private toCacheKey(workflowId: string) {
		return `workflow-activation-error:${workflowId}`;
	}
}
