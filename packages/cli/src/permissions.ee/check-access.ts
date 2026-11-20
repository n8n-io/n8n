import { ModuleRegistry } from '@n8n/backend-common';
import type { User, EntityManager } from '@n8n/db';
import {
	CredentialsEntity,
	CredentialsRepository,
	Project,
	ProjectRepository,
	RoleRepository,
	SharedCredentials,
	SharedCredentialsRepository,
	SharedWorkflow,
	SharedWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';

import { CredentialsFinderService, RoleService } from '@n8n/backend-services';
import { NotFoundError, UnexpectedError } from '@n8n/errors';

const INSTANCE_CREDENTIAL_MANAGEMENT_SCOPES = new Set<Scope>([
	'credential:read',
	'credential:update',
	'credential:delete',
]);

/**
 * Global credentials bypass per-recipient sharing rows, so they are checked
 * separately: read-only access for any global credential, plus connect
 * access when the credential is an end-user (resolvable) credential.
 */
async function hasGlobalCredentialAccess(
	credentialsFinderService: CredentialsFinderService,
	credentialId: string,
	scopes: Scope[],
): Promise<boolean> {
	const isReadOnlyRequest = credentialsFinderService.hasGlobalReadOnlyAccess(scopes);
	const isConnectRequest = credentialsFinderService.hasGlobalConnectAccess(scopes);
	if (!isReadOnlyRequest && !isConnectRequest) return false;

	const globalCredential = await credentialsFinderService.findGlobalCredentialById(credentialId);
	if (!globalCredential) return false;

	return isReadOnlyRequest || globalCredential.isResolvable;
}

/**
 * Check if a user has the required scopes. The check can be:
 *
 * - only for scopes in the user's global role, or
 * - for scopes in the user's global role, else for scopes in the resource roles
 *   of projects including the user and the resource, else for scopes in the
 *   project roles in those projects.
 */
export async function userHasScopes(
	user: User,
	scopes: Scope[],
	globalOnly: boolean,
	{
		credentialId,
		workflowId,
		projectId,
		dataTableId,
		agentId,
	}: {
		credentialId?: string;
		workflowId?: string;
		projectId?: string;
		dataTableId?: string;
		agentId?: string;
	} /* only one */,
	entityManager?: EntityManager,
): Promise<boolean> {
	if (hasGlobalScope(user, scopes, { mode: 'allOf' })) return true;

	if (
		credentialId &&
		hasGlobalScope(user, 'credential:manageInstance') &&
		scopes.every((scope) => INSTANCE_CREDENTIAL_MANAGEMENT_SCOPES.has(scope))
	) {
		const credentialsRepository = entityManager
			? entityManager.getRepository(CredentialsEntity)
			: Container.get(CredentialsRepository);
		if (
			await credentialsRepository.existsBy({
				id: credentialId,
				usageScope: 'instance',
			})
		) {
			return true;
		}
	}

	if (globalOnly) return false;

	// Find which projects the user has access to with the required scopes.
	// This is done by finding the projects where the user has a role with at least the required scopes.
	const userProjectIdsCache = new Map<string, Promise<string[]>>();
	const getUserProjectIds = async (requiredScopes: Scope[]): Promise<string[]> => {
		const uniqueScopes = [...new Set(requiredScopes)];
		const cacheKey = uniqueScopes.join(',');
		const cached = userProjectIdsCache.get(cacheKey);
		if (cached) return await cached;

		const projectQueryBuilder = entityManager
			? entityManager.createQueryBuilder(Project, 'project')
			: Container.get(ProjectRepository).createQueryBuilder('project');

		const projectIds = projectQueryBuilder
			.innerJoin('project.projectRelations', 'relation')
			.innerJoin('relation.role', 'role')
			.innerJoin('role.scopes', 'scope')
			.where('relation.userId = :userId', { userId: user.id })
			.andWhere('scope.slug IN (:...scopes)', { scopes: uniqueScopes })
			.groupBy('project.id')
			.having('COUNT(DISTINCT scope.slug) = :scopeCount', {
				scopeCount: uniqueScopes.length,
			})
			.select(['project.id AS id'])
			.getRawMany()
			.then((rows: Array<{ id: string }>) => rows.map((row) => row.id));

		userProjectIdsCache.set(cacheKey, projectIds);
		return await projectIds;
	};

	// Find which resource roles are defined to contain the required scopes.
	// Then find at least one of the above qualifying projects having one of
	// those resource roles over the resource being checked.
	const roleService = Container.get(RoleService);
	const loadRoles = entityManager
		? async () => await Container.get(RoleRepository).findAll(entityManager)
		: undefined;
	const rolesWithScope = async (namespace: 'credential' | 'workflow', roleScopes: Scope[]) =>
		loadRoles
			? await roleService.rolesWithScope(namespace, roleScopes, loadRoles)
			: await roleService.rolesWithScope(namespace, roleScopes);

	const checkCredential = async (id: string, credentialScopes: Scope[]): Promise<boolean> => {
		const credentialRepo = entityManager
			? entityManager.getRepository(SharedCredentials)
			: Container.get(SharedCredentialsRepository);

		const credentials = await credentialRepo.findBy({ credentialsId: id });
		if (!credentials.length) {
			throw new NotFoundError(`Credential with ID "${id}" not found.`);
		}

		const validRoles = await rolesWithScope('credential', credentialScopes);
		const userProjectIds = await getUserProjectIds(credentialScopes);

		const hasValidRoles = credentials.some(
			(c) => userProjectIds.includes(c.projectId) && validRoles.includes(c.role),
		);

		if (hasValidRoles) {
			return true;
		}

		const credentialsFinderService = Container.get(CredentialsFinderService);
		return await hasGlobalCredentialAccess(credentialsFinderService, id, credentialScopes);
	};

	const checkWorkflow = async (id: string, workflowScopes: Scope[]): Promise<boolean> => {
		const workflowRepo = entityManager
			? entityManager.getRepository(SharedWorkflow)
			: Container.get(SharedWorkflowRepository);

		const workflows = await workflowRepo.findBy({ workflowId: id });

		if (!workflows.length) {
			throw new NotFoundError(`Workflow with ID "${id}" not found.`);
		}

		const validRoles = await rolesWithScope('workflow', workflowScopes);
		const userProjectIds = await getUserProjectIds(workflowScopes);

		return workflows.some(
			(w) => userProjectIds.includes(w.projectId) && validRoles.includes(w.role),
		);
	};

	const checkDataTable = async (id: string, dataTableScopes: Scope[]): Promise<boolean> => {
		const moduleRegistry = Container.get(ModuleRegistry);
		if (!moduleRegistry.isActive('data-table')) {
			throw new NotFoundError(`Data table with ID "${id}" not found.`);
		}

		const { DataTableRepository } = await import('@n8n/backend-module-data-table');
		const dataTable = await Container.get(DataTableRepository).findOne({
			where: { id },
			relations: ['project'],
		});

		if (!dataTable) {
			throw new NotFoundError(`Data table with ID "${id}" not found.`);
		}

		// Data tables don't have resource-level roles, only project-level access
		const userProjectIds = await getUserProjectIds(dataTableScopes);
		return userProjectIds.includes(dataTable.project.id);
	};

	const checkAgent = async (id: string, agentScopes: Scope[]): Promise<boolean> => {
		const moduleRegistry = Container.get(ModuleRegistry);
		if (!moduleRegistry.isActive('agents')) {
			throw new NotFoundError(`Agent with ID "${id}" not found.`);
		}

		const { AgentRepository } = await import('@/modules/agents/repositories/agent.repository.js');
		// Project-scoped lookup: an instance agent resolves to no agent, same
		// as a missing one, so both read as not found.
		const agent = await Container.get(AgentRepository).findById(id);

		if (!agent) {
			throw new NotFoundError(`Agent with ID "${id}" not found.`);
		}

		// Agents don't have resource-level roles, only project-level access
		const userProjectIds = await getUserProjectIds(agentScopes);
		return userProjectIds.includes(agent.projectId);
	};

	const checkProject = async (id: string, projectScopes: Scope[]): Promise<boolean> => {
		const userProjectIds = await getUserProjectIds(projectScopes);
		return userProjectIds.includes(id);
	};

	type ResourceType = 'credential' | 'workflow' | 'dataTable' | 'agent' | 'project';
	type ResourceCheck = { type: ResourceType; id: string };

	// Composite routes can carry multiple resource IDs. Authorize each scope
	// against the resource its namespace names, so an unrelated ID cannot
	// preempt the check. Unknown namespaces keep the legacy ID precedence.
	const resourceIds: Record<ResourceType, string | undefined> = {
		credential: credentialId,
		workflow: workflowId,
		dataTable: dataTableId,
		agent: agentId,
		project: projectId,
	};

	const scopeResourcePrefixes: Array<{ prefix: string; type: ResourceType }> = [
		{ prefix: 'credential:', type: 'credential' },
		{ prefix: 'workflow:', type: 'workflow' },
		{ prefix: 'dataTable:', type: 'dataTable' },
		{ prefix: 'agent:', type: 'agent' },
		{ prefix: 'project:', type: 'project' },
	];

	const hasAnyResourceId = Object.values(resourceIds).some(Boolean);

	// A known namespace keeps its resource identity even when the ID is
	// missing. It must not fall back to an unrelated legacy ID.
	const resolveScopeResource = (scope: Scope): { type: ResourceType; id?: string } | undefined => {
		for (const { prefix, type } of scopeResourcePrefixes) {
			if (!scope.startsWith(prefix)) continue;
			return { type, id: resourceIds[type] };
		}
		return undefined;
	};

	const checkResource = async (resource: ResourceCheck, resourceScopes: Scope[]) => {
		switch (resource.type) {
			case 'credential':
				return await checkCredential(resource.id, resourceScopes);
			case 'workflow':
				return await checkWorkflow(resource.id, resourceScopes);
			case 'dataTable':
				return await checkDataTable(resource.id, resourceScopes);
			case 'agent':
				return await checkAgent(resource.id, resourceScopes);
			case 'project':
				return await checkProject(resource.id, resourceScopes);
		}
	};

	const throwMissingResourceId = (): never => {
		throw new UnexpectedError(
			"`@ProjectScope` decorator was used but does not have a `credentialId`, `workflowId`, `dataTableId`, `agentId`, or `projectId` in its URL parameters. This is likely an implementation error. If you're a developer, please check your URL is correct or that this should be using `@GlobalScope`.",
		);
	};

	// Keeps the established behaviour for scopes without a concrete resource
	// namespace, including empty scope lists.
	const checkLegacyResource = async (legacyScopes: Scope[]): Promise<boolean> => {
		if (credentialId) return await checkCredential(credentialId, legacyScopes);
		if (workflowId) return await checkWorkflow(workflowId, legacyScopes);
		if (dataTableId) return await checkDataTable(dataTableId, legacyScopes);
		if (agentId) return await checkAgent(agentId, legacyScopes);
		if (projectId) return await checkProject(projectId, legacyScopes);

		return throwMissingResourceId();
	};

	if (scopes.length === 0) {
		return await checkLegacyResource(scopes);
	}

	const resourceScopes = new Map<string, { resource: ResourceCheck; scopes: Scope[] }>();
	const legacyScopes: Scope[] = [];

	for (const scope of scopes) {
		const resolved = resolveScopeResource(scope);
		if (!resolved) {
			legacyScopes.push(scope);
			continue;
		}

		// A known namespace without its own ID is a project-level operation
		// when the route carries a project ID. With an unrelated ID present,
		// reject it rather than use that resource. With no ID at all, keep the
		// misconfiguration guard.
		let resource: ResourceCheck;
		if (resolved.id) {
			resource = { type: resolved.type, id: resolved.id };
		} else if (projectId) {
			resource = { type: 'project', id: projectId };
		} else if (hasAnyResourceId) {
			return false;
		} else {
			return throwMissingResourceId();
		}
		const key = `${resource.type}:${resource.id}`;
		const group = resourceScopes.get(key);
		if (group) {
			group.scopes.push(scope);
		} else {
			resourceScopes.set(key, { resource, scopes: [scope] });
		}
	}

	// Every required permission must be satisfied independently.
	if (legacyScopes.length > 0 && !(await checkLegacyResource(legacyScopes))) {
		return false;
	}

	for (const { resource, scopes: resourceScopeList } of resourceScopes.values()) {
		if (!(await checkResource(resource, resourceScopeList))) {
			return false;
		}
	}

	return true;
}
