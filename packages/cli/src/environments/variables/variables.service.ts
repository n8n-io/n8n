import type { Variables } from '@db/entities/Variables';
import { collections } from '@/Db';
import { CacheService } from '@/services/cache.service';
import { Service } from 'typedi';

@Service()
export class VariablesService {
	constructor(private cacheService: CacheService) {}

	async getAll(): Promise<Variables[]> {
		const variables = await this.cacheService.get('variables', {
			async refreshFunction() {
				// TODO: log refresh cache metric
				return collections.Variables.find();
			},
		});
		return variables as Variables[];
	}

	async getCount(): Promise<number> {
		return (await this.getAll()).length;
	}

	async get(id: string): Promise<Variables | null> {
		const variables = await this.getAll();
		return variables.find((variable) => variable.id === id) ?? null;
	}

	async delete(id: string): Promise<void> {
		await collections.Variables.delete(id);
		await this.updateCache();
	}

	async updateCache(): Promise<void> {
		// TODO: log update cache metric
		const variables = await collections.Variables.find();
		await this.cacheService.set('variables', variables);
	}
}
