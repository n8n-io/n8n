import type { CreateVariableRequestDto, UpdateVariableRequestDto } from '@n8n/api-types';
import { Container, Service } from 'typedi';

import type { User } from '@/databases/entities/user';
import type { Variables } from '@/databases/entities/variables';
import { VariablesRepository } from '@/databases/repositories/variables.repository';
import { generateNanoId } from '@/databases/utils/generators';
import { MissingScopeError } from '@/errors/response-errors/missing-scope.error';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';
import { VariableValidationError } from '@/errors/variable-validation.error';
import { EventService } from '@/events/event.service';
import { CacheService } from '@/services/cache/cache.service';
// TODO: figure out how to avoid this cycle
import { ProjectService } from '@/services/project.service';

import { canCreateNewVariable } from './environment-helpers';

@Service()
export class VariablesService {
	constructor(
		protected cacheService: CacheService,
		protected variablesRepository: VariablesRepository,
		private readonly eventService: EventService,
		private readonly projectService: ProjectService,
	) {}

	async getAllCached(): Promise<Variables[]> {
		const variables = await this.cacheService.get('variables', {
			async refreshFn() {
				return await Container.get(VariablesService).findAll();
			},
		});
		return (variables as Array<Partial<Variables>>).map((v) => this.variablesRepository.create(v));
	}

	async getAllForUser(user: User): Promise<Variables[]> {
		const projects = await this.projectService.getAccessibleProjects(user);
		const projectIds = projects.map((p) => p.id);

		const unfilteredVariables = await this.getAllCached();
		const canReadGlobalVariables = user.hasGlobalScope('globalVariable:read');

		const foundVariables = unfilteredVariables.filter((variable) => {
			if (!variable.projectId && canReadGlobalVariables) {
				return true;
			} else if (variable.projectId && projectIds.includes(variable.projectId)) {
				return true;
			}
			return false;
		});

		return (foundVariables as Array<Partial<Variables>>).map((v) =>
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
		return this.variablesRepository.create(foundVariable as Partial<Variables>);
	}

	async getForUser(id: string, user: User): Promise<Variables | null> {
		const projects = await this.projectService.getAccessibleProjects(user);
		const projectIds = projects.map((p) => p.id);

		const variables = await this.getAllCached();
		const canReadGlobalVariables = user.hasGlobalScope('globalVariable:read');

		const foundVariable = variables.find((variable) => {
			if (variable.id !== id) {
				return false;
			} else if (!variable.projectId && canReadGlobalVariables) {
				return true;
			} else if (variable.projectId && projectIds.includes(variable.projectId)) {
				return true;
			}
			return false;
		});

		if (!foundVariable) {
			return null;
		}
		return this.variablesRepository.create(foundVariable as Partial<Variables>);
	}

	async delete(id: string, user: User): Promise<void> {
		const originalVariable = await this.variablesRepository.findOneOrFail({
			where: {
				id,
			},
		});

		// Updating a global variable
		if (!originalVariable.projectId && !user.hasGlobalScope('globalVariable:delete')) {
			throw new MissingScopeError();
		}

		// Updating a project variable
		if (
			originalVariable.projectId &&
			!(await this.projectService.getProjectWithScope(user, originalVariable.projectId, [
				'variable:delete',
			]))
		) {
			throw new MissingScopeError();
		}

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

	async create(variable: CreateVariableRequestDto, user: User): Promise<Variables> {
		if (!canCreateNewVariable(await this.getCount())) {
			throw new VariableCountLimitReachedError('Variables limit reached');
		}

		// Creating a global variable
		if (!variable.projectId && !user.hasGlobalScope('globalVariable:create')) {
			throw new MissingScopeError();
		}

		// Creating a project variable
		if (
			variable.projectId &&
			!(await this.projectService.getProjectWithScope(user, variable.projectId, [
				'variable:create',
			]))
		) {
			throw new MissingScopeError();
		}

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

	async update(id: string, variable: UpdateVariableRequestDto, user: User): Promise<Variables> {
		const originalVariable = await this.variablesRepository.findOneOrFail({
			where: {
				id,
			},
		});

		// Updating a global variable
		if (!originalVariable.projectId && !user.hasGlobalScope('globalVariable:create')) {
			throw new MissingScopeError();
		}

		// Updating a project variable
		if (
			originalVariable.projectId &&
			!(await this.projectService.getProjectWithScope(user, originalVariable.projectId, [
				'variable:create',
			]))
		) {
			throw new MissingScopeError();
		}

		await this.variablesRepository.update(id, variable);
		await this.updateCache();
		return (await this.getCached(id))!;
	}
}
