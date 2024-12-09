import { Container, Service } from 'typedi';

import type { Variables } from '@/databases/entities/variables';
import { VariablesRepository } from '@/databases/repositories/variables.repository';
import { generateNanoId } from '@/databases/utils/generators';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';
import { VariableValidationError } from '@/errors/variable-validation.error';
import { EventService } from '@/events/event.service';
import { CacheService } from '@/services/cache/cache.service';

import { canCreateNewVariable } from './environment-helpers';

@Service()
export class VariablesService {
	constructor(
		protected cacheService: CacheService,
		protected variablesRepository: VariablesRepository,
		private readonly eventService: EventService,
	) {}

	async getAllCached(state?: 'empty'): Promise<Variables[]> {
		let variables = await this.cacheService.get('variables', {
			async refreshFn() {
				return await Container.get(VariablesService).findAll();
			},
		});

		if (variables === undefined) {
			return [];
		}

		if (state === 'empty') {
			variables = variables.filter((v) => v.value === '');
		}

		return variables.map((v) => this.variablesRepository.create(v));
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
		return this.variablesRepository.create(foundVariable as Partial<Variables>);
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
		return await this.variablesRepository.find();
	}

	validateVariable(variable: Omit<Variables, 'id'>): void {
		if (variable.key.length > 50) {
			throw new VariableValidationError('key cannot be longer than 50 characters');
		}
		if (variable.key.replace(/[A-Za-z0-9_]/g, '').length !== 0) {
			throw new VariableValidationError('key can only contain characters A-Za-z0-9_');
		}
		if (variable.value?.length > 255) {
			throw new VariableValidationError('value cannot be longer than 255 characters');
		}
	}

	async create(variable: Omit<Variables, 'id'>): Promise<Variables> {
		if (!canCreateNewVariable(await this.getCount())) {
			throw new VariableCountLimitReachedError('Variables limit reached');
		}
		this.validateVariable(variable);

		this.eventService.emit('variable-created');
		const saveResult = await this.variablesRepository.save(
			{
				...variable,
				id: generateNanoId(),
			},
			{ transaction: false },
		);
		await this.updateCache();
		return saveResult;
	}

	async update(id: string, variable: Omit<Variables, 'id'>): Promise<Variables> {
		this.validateVariable(variable);
		await this.variablesRepository.update(id, variable);
		await this.updateCache();
		return (await this.getCached(id))!;
	}
}
