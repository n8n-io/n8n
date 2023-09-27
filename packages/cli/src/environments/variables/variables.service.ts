import { Service } from 'typedi';
import type { DeepPartial } from 'typeorm';
import { VariablesRepository } from '@/databases/repositories';
import type { Variables } from '@db/entities/Variables';
import { CacheService } from '@/services/cache.service';

@Service()
export class VariablesService {
	constructor(
		protected cacheService: CacheService,
		protected variablesRepository: VariablesRepository,
	) {}

	async getAllCached(): Promise<Variables[]> {
		const variables = await this.cacheService.get('variables', {
			// TODO: log refresh cache metric
			refreshFunction: async () => this.findAll(),
		});
		return (variables as Array<DeepPartial<Variables>>).map((v) =>
			this.variablesRepository.create(v),
		);
	}

	async getCount(): Promise<number> {
		return (await this.getAllCached()).length;
	}

	async getCached(id: string): Promise<Variables | null> {
		const variables = await this.getAllCached();
		const foundVariable = variables.find((variable) => variable.id === id);
		if (!foundVariable) {
			return null;
		}
		return this.variablesRepository.create(foundVariable as DeepPartial<Variables>);
	}

	async delete(id: string): Promise<void> {
		await this.variablesRepository.delete(id);
		await this.updateCache();
	}

	async updateCache(): Promise<void> {
		// TODO: log update cache metric
		const variables = await this.findAll();
		await this.cacheService.set('variables', variables);
	}

	async findAll(): Promise<Variables[]> {
		return this.variablesRepository.find();
	}
}
