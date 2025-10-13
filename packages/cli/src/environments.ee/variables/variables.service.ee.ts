import { CreateVariableRequestDto, UpdateVariableRequestDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import type { User, Variables } from '@n8n/db';
import { generateNanoId, VariablesRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, Scope } from '@n8n/permissions';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';
import { EventService } from '@/events/event.service';
import { CacheService } from '@/services/cache/cache.service';
import { ProjectService } from '@/services/project.service.ee';

const projectVariableScopes: Partial<Record<Scope, Scope>> = {
	'variable:list': 'projectVariable:list',
	'variable:read': 'projectVariable:read',
	'variable:create': 'projectVariable:create',
	'variable:update': 'projectVariable:update',
	'variable:delete': 'projectVariable:delete',
};

@Service()
export class VariablesService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly variablesRepository: VariablesRepository,
		private readonly eventService: EventService,
		private readonly licenseState: LicenseState,
		private readonly projectService: ProjectService,
	) {}

	private async findAll() {
		const variables = await this.variablesRepository.find({
			relations: ['project'],
		});
		return variables;
	}

	private async isAuthorizedForVariable(
		user: User,
		scope: Scope,
		projectId?: string,
	): Promise<boolean> {
		if (!projectId) {
			// If the variable is global, only check for global scope
			return hasGlobalScope(user, scope);
		}

		// Get the scope required to access a project variable
		const projectVariableScope = projectVariableScopes[scope];
		if (!projectVariableScope)
			throw new Error(`No project variable scope mapping for scope "${scope}"`);

		// Check if user has access to the specific project with the required variable scope
		const project = await this.projectService.getProjectWithScope(user, projectId, [
			projectVariableScope,
		]);

		return !!project;
	}

	async getAllCached(): Promise<Variables[]> {
		const variables = await this.cacheService.get('variables', {
			refreshFn: async () => await this.findAll(),
		});
		return variables ?? [];
	}

	async getCached(id: string): Promise<Variables | null> {
		const variables = await this.getAllCached();
		const foundVariable = variables.find((variable) => variable.id === id);
		if (!foundVariable) {
			return null;
		}
		return foundVariable;
	}

	async updateCache(): Promise<void> {
		// TODO: log update cache metric
		const variables = await this.findAll();
		await this.cacheService.set('variables', variables);
	}

	async getAllForUser(
		user: User,
		filter: { state?: 'empty'; projectId?: string | null } = {},
	): Promise<Variables[]> {
		const allCachedVariables = await this.getAllCached();
		const canListGlobalVariables = hasGlobalScope(user, 'variable:list');
		const projectIds = await this.projectService.getProjectIdsWithScope(user, [
			'projectVariable:list',
		]);

		const userHasAccess = (variable: Variables) =>
			(!variable.project && canListGlobalVariables) ||
			// Project variable
			(variable.project &&
				// Project variable access
				projectIds.includes(variable.project.id));

		const stateAndProjectFilter = (variable: Variables) =>
			// State filter
			(filter.state !== 'empty' || variable.value === '') &&
			// Project filter
			(typeof filter.projectId === 'undefined' ||
				(variable.project?.id ?? null) === filter.projectId);

		return allCachedVariables.filter(
			(variable) => userHasAccess(variable) && stateAndProjectFilter(variable),
		);
	}

	async getForUser(
		user: User,
		variableId: string,
		scope: Scope = 'variable:read',
	): Promise<Variables | null> {
		const variable = await this.getCached(variableId);
		if (!variable) {
			return null;
		}

		const userHasAccess = await this.isAuthorizedForVariable(user, scope, variable.project?.id);
		if (!userHasAccess) {
			throw new ForbiddenError('You are not allowed to access this variable');
		}

		return variable;
	}

	async deleteForUser(user: User, id: string): Promise<void> {
		const existingVariable = await this.getCached(id);

		const userHasRight = await this.isAuthorizedForVariable(
			user,
			'variable:delete',
			existingVariable?.project?.id,
		);
		if (!userHasRight) {
			throw new ForbiddenError('You are not allowed to delete this variable');
		}

		await this.delete(id);
	}

	async delete(id: string): Promise<void> {
		await this.variablesRepository.delete(id);
		await this.updateCache();
	}

	private async canCreateNewVariable() {
		if (!this.licenseState.isVariablesLicensed()) {
			throw new FeatureNotLicensedError('feat:variables');
		}

		// This defaults to -1 which is what we want if we've enabled
		// variables via the config
		const limit = this.licenseState.getMaxVariables();
		if (limit === -1) {
			return;
		}

		const variablesCount = (await this.getAllCached()).length;
		if (limit <= variablesCount) {
			throw new VariableCountLimitReachedError('Variables limit reached');
		}
	}

	async validateUniqueVariable(key: string, projectId?: string, id?: string) {
		const existingVariablesByKey = (await this.getAllCached()).filter(
			(v) => v.key === key && (!id || v.id !== id),
		);
		// If variable is global, check that it does not already exist with the same key
		if (!projectId && existingVariablesByKey.find((v) => !v.project)) {
			throw new VariableCountLimitReachedError(
				`A global variable with key "${key}" already exists`,
			);
		}

		// If variable is for a project, check that it does not already exist in the same project with the same key
		if (projectId && existingVariablesByKey.find((v) => v.project?.id === projectId)) {
			throw new VariableCountLimitReachedError(
				`A variable with key "${key}" already exists in the specified project`,
			);
		}
	}

	async create(user: User, variable: CreateVariableRequestDto): Promise<Variables> {
		const userHasRight = await this.isAuthorizedForVariable(
			user,
			'variable:create',
			variable.projectId,
		);
		if (!userHasRight) {
			throw new ForbiddenError(
				`You are not allowed to create a variable${variable.projectId ? ' in this project' : ''}`,
			);
		}

		// Check license and limits
		await this.canCreateNewVariable();

		// Check that variable key is unique (globally or in the project)
		await this.validateUniqueVariable(variable.key, variable.projectId);

		this.eventService.emit('variable-created');
		const saveResult = await this.variablesRepository.save(
			{
				...variable,
				project: variable.projectId ? { id: variable.projectId } : null,
				id: generateNanoId(),
			},
			{ transaction: false },
		);
		await this.updateCache();
		return saveResult;
	}

	async update(user: User, id: string, variable: UpdateVariableRequestDto): Promise<Variables> {
		const existingVariable = await this.getCached(id);
		if (!existingVariable) {
			throw new NotFoundError(`Variable with id ${id} not found`);
		}

		const userHasRightOnExistingVariable = await this.isAuthorizedForVariable(
			user,
			'variable:update',
			existingVariable?.project?.id,
		);
		if (!userHasRightOnExistingVariable) {
			throw new ForbiddenError('You are not allowed to update this variable');
		}

		// Project id can be undefined (not provided, keep the existing) or null (move to global scope) or a string (move to project)
		// Default to existing project id if not provided in the update
		let newProjectId = existingVariable.project?.id;
		if (typeof variable.projectId !== 'undefined') {
			newProjectId = variable.projectId ?? undefined;
		}

		// Check that user has rights to move the variable to the new project (if projectId changed)
		if (existingVariable?.project?.id !== newProjectId) {
			const userHasRightOnNewProject = await this.isAuthorizedForVariable(
				user,
				'variable:update',
				newProjectId,
			);
			if (!userHasRightOnNewProject) {
				throw new ForbiddenError(
					`You are not allowed to move this variable to ${variable.projectId ? 'the specified project' : 'the global scope'}`,
				);
			}
		}

		if (variable.key) {
			await this.validateUniqueVariable(variable.key, newProjectId, id);
		}

		await this.variablesRepository.update(id, {
			key: variable.key,
			value: variable.value,
			// Only update the project if it was explicitly set in the update
			// If project id is undefined, keep the existing
			// If project id is null, move to global (no project)
			...(typeof variable.projectId !== 'undefined'
				? { project: variable.projectId ? { id: variable.projectId } : null }
				: {}),
		});
		await this.updateCache();
		return (await this.getCached(id))!;
	}
}
