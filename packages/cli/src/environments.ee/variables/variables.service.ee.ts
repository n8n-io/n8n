import { CreateVariableRequestDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import type { User, Variables } from '@n8n/db';
import { generateNanoId, VariablesRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, Scope } from '@n8n/permissions';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';
import { EventService } from '@/events/event.service';
import { CacheService } from '@/services/cache/cache.service';
import { ProjectService } from '@/services/project.service.ee';

export type VariableData = {
	key: string;
	id: string;
	type: Variables['type'];
	value: string;
	project: { id: string; name: string } | null;
};

const allProjectsScopes: Partial<Record<Scope, Scope>> = {
	'variable:list': 'projectVariable:list',
	'variable:read': 'projectVariable:read',
	'variable:create': 'projectVariable:create',
	'variable:update': 'projectVariable:update',
	'variable:delete': 'projectVariable:delete',
};

const variableEntityToData = (variable: Variables): VariableData => ({
	id: variable.id,
	key: variable.key,
	type: variable.type,
	value: variable.value,
	project: variable.project ? { id: variable.project.id, name: variable.project.name } : null,
});

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
		return variables.map(variableEntityToData);
	}

	async getAllCached(): Promise<VariableData[]> {
		const variables = await this.cacheService.get('variables', {
			refreshFn: async () => await this.findAll(),
		});

		return (variables ?? []).map(variableEntityToData);
	}

	async getCached(id: string): Promise<VariableData | null> {
		const variables = await this.getAllCached();
		const foundVariable = variables.find((variable) => variable.id === id);
		if (!foundVariable) {
			return null;
		}
		return foundVariable;
	}

	async userHasRightToAccessVariable(user: User, scope: Scope, projectId?: string) {
		if (!projectId) {
			return hasGlobalScope(user, scope);
		}

		// Check if user has global access to all projects variables
		const allProjectScope = allProjectsScopes[scope];
		if (allProjectScope && hasGlobalScope(user, allProjectScope)) {
			return true;
		}

		const projects = await this.projectService.getProjectsWithScope(user, [scope], [projectId]);
		return projects.length === 1;
	}

	async getAllForUser(
		user: User,
		filter: { state?: 'empty'; projectId?: string | null } = {},
	): Promise<VariableData[]> {
		const allCachedVariables = await this.getAllCached();
		const canListGlobalVariables = hasGlobalScope(user, 'variable:list');
		const canListProjectVariables = hasGlobalScope(user, 'projectVariable:list');
		const projects = await this.projectService.getProjectsWithScope(user, ['variable:list']);
		const projectIds = projects.map((p) => p.id);

		return allCachedVariables.filter((variable) => {
			const userHasAccess =
				// Global variable access
				(!variable.project && canListGlobalVariables) ||
				// Project variable
				(variable.project &&
					// Global access to project variables
					(canListProjectVariables ||
						// Project variable access
						projectIds.includes(variable.project.id)));

			if (
				userHasAccess &&
				// State filter
				(filter.state !== 'empty' || variable.value === '') &&
				// Project filter
				(typeof filter.projectId === 'undefined' ||
					(variable.project?.id ?? null) === filter.projectId)
			) {
				return true;
			}
			return false;
		});
	}

	async getForUser(
		user: User,
		variableId: string,
		scope: Scope = 'variable:read',
	): Promise<VariableData | null> {
		const variable = await this.getCached(variableId);
		if (!variable) {
			return null;
		}

		console.log('variable:', variable);
		const userHasAccess = await this.userHasRightToAccessVariable(
			user,
			scope,
			variable.project?.id,
		);
		if (!userHasAccess) {
			throw new ForbiddenError('You are not allowed to access this variable');
		}

		return variable;
	}

	async deleteForUser(user: User, id: string): Promise<void> {
		const existingVariable = await this.getCached(id);

		const userHasRight = await this.userHasRightToAccessVariable(
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

	async updateCache(): Promise<void> {
		// TODO: log update cache metric
		const variables = await this.findAll();
		console.log('variables to cache:', variables);
		await this.cacheService.set('variables', variables);
	}

	private async canCreateNewVariable(): Promise<boolean> {
		if (!this.licenseState.isVariablesLicensed()) {
			return false;
		}

		// This defaults to -1 which is what we want if we've enabled
		// variables via the config
		const limit = this.licenseState.getMaxVariables();
		if (limit === -1) {
			return true;
		}

		const variablesCount = (await this.getAllCached()).length;
		return limit > variablesCount;
	}

	async create(user: User, variable: CreateVariableRequestDto): Promise<Variables> {
		const userHasRight = await this.userHasRightToAccessVariable(
			user,
			'variable:create',
			variable.projectId,
		);
		if (!userHasRight) {
			throw new ForbiddenError(
				`You are not allowed to create a variable${variable.projectId ? ' in this project' : ''}`,
			);
		}

		if (!(await this.canCreateNewVariable())) {
			throw new VariableCountLimitReachedError('Variables limit reached');
		}

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

	async update(user: User, id: string, variable: CreateVariableRequestDto): Promise<VariableData> {
		const existingVariable = await this.getCached(id);

		// Check that user has rights to update the existing variable
		const userHasRightOnExistingVariable = await this.userHasRightToAccessVariable(
			user,
			'variable:update',
			existingVariable?.project?.id,
		);
		if (!userHasRightOnExistingVariable) {
			throw new ForbiddenError('You are not allowed to update this variable');
		}

		// Check that user has rights to move the variable to the new project (if projectId changed)
		if (existingVariable?.project?.id !== variable.projectId) {
			const userHasRightOnNewProject = await this.userHasRightToAccessVariable(
				user,
				'variable:update',
				variable.projectId ?? undefined,
			);
			if (!userHasRightOnNewProject) {
				throw new ForbiddenError(
					'You are not allowed to move this variable to the specified project',
				);
			}
		}

		await this.variablesRepository.update(id, {
			...variable,
			project: variable.projectId ? { id: variable.projectId } : null,
		});
		await this.updateCache();
		return (await this.getCached(id))!;
	}
}
