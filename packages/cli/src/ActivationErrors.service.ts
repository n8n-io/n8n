import { Service } from 'typedi';
import { CacheService } from '@/services/cache/cache.service';
import { jsonParse } from 'n8n-workflow';

type ActivationErrors = {
	[workflowId: string]: string; // error message
};

@Service()
export class ActivationErrorsService {
	private readonly cacheKey = 'workflow-activation-errors';

	constructor(private readonly cacheService: CacheService) {}

	async set(workflowId: string, errorMessage: string) {
		const errors = await this.getAll();

		errors[workflowId] = errorMessage;

		await this.cacheService.set(this.cacheKey, JSON.stringify(errors));
	}

	async unset(workflowId: string) {
		const errors = await this.getAll();

		if (Object.keys(errors).length === 0) return;

		delete errors[workflowId];

		await this.cacheService.set(this.cacheKey, JSON.stringify(errors));
	}

	async get(workflowId: string) {
		const errors = await this.getAll();

		if (Object.keys(errors).length === 0) return null;

		return errors[workflowId];
	}

	async getAll() {
		const errors = await this.cacheService.get<string>(this.cacheKey);

		if (!errors) return {};

		return jsonParse<ActivationErrors>(errors);
	}

	async clearAll() {
		await this.cacheService.delete(this.cacheKey);
	}
}
