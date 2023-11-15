import { Service } from 'typedi';
import { CacheService } from './services/cache.service';

export type ActivationError = {
	time: number; // ms
	error: {
		message: string;
	};
};

@Service()
export class ActivationErrorsService {
	constructor(private readonly cacheService: CacheService) {}

	async set(workflowId: string, errorMessage: string) {
		const key = this.toCacheKey(workflowId);

		await this.cacheService.set(key, errorMessage);
	}

	async unset(workflowId: string) {
		const exists = await this.get(workflowId);

		if (!exists) return;

		const key = this.toCacheKey(workflowId);

		await this.cacheService.delete(key);
	}

	async get(workflowId: string) {
		const key = this.toCacheKey(workflowId);

		return this.cacheService.get<string>(key);
	}

	private toCacheKey(workflowId: string) {
		return `workflow-activation-error:${workflowId}`;
	}
}
