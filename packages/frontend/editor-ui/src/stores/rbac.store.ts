import { defineStore } from 'pinia';
import { hasScope as genericHasScope } from '@n8n/permissions';
import type { ScopeOptions, Scope, Resource } from '@n8n/permissions';
import { ref } from 'vue';
import { STORES } from '@n8n/stores';
import type { Role } from '@n8n/api-types';

export const useRBACStore = defineStore(STORES.RBAC, () => {
	const globalRoles = ref<Role[]>([]);
	const rolesByProjectId = ref<Record<string, string[]>>({});

	const globalScopes = ref<Scope[]>([]);
	const scopesByProjectId = ref<Record<string, Scope[]>>({});
	const scopesByResourceId = ref<Record<Resource, Record<string, Scope[]>>>({
		workflow: {},
		tag: {},
		annotationTag: {},
		user: {},
		credential: {},
		variable: {},
		sourceControl: {},
		externalSecretsProvider: {},
		externalSecret: {},
		project: {},
		orchestration: {},
		workersView: {},
		eventBusDestination: {},
		auditLogs: {},
		banner: {},
		community: {},
		communityPackage: {},
		ldap: {},
		license: {},
		logStreaming: {},
		saml: {},
		oidc: {},
		securityAudit: {},
		folder: {},
		insights: {},
		dataStore: {},
	});

	function addGlobalRole(role: Role) {
		if (!globalRoles.value.includes(role)) {
			globalRoles.value.push(role);
		}
	}

	function hasRole(role: Role) {
		return globalRoles.value.includes(role);
	}

	function addGlobalScope(scope: Scope) {
		if (!globalScopes.value.includes(scope)) {
			globalScopes.value.push(scope);
		}
	}

	function setGlobalScopes(scopes: Scope[]) {
		globalScopes.value = scopes;
	}

	function addProjectScope(
		scope: Scope,
		context: {
			projectId: string;
		},
	) {
		if (!scopesByProjectId.value[context.projectId]) {
			scopesByProjectId.value[context.projectId] = [];
		}

		if (!scopesByProjectId.value[context.projectId].includes(scope)) {
			scopesByProjectId.value[context.projectId].push(scope);
		}
	}

	function addResourceScope(
		scope: Scope,
		context: {
			resourceType: Resource;
			resourceId: string;
		},
	) {
		const scopesByResourceType = scopesByResourceId.value[context.resourceType];
		if (!scopesByResourceType[context.resourceId]) {
			scopesByResourceType[context.resourceId] = [];
		}

		if (!scopesByResourceType[context.resourceId].includes(scope)) {
			scopesByResourceType[context.resourceId].push(scope);
		}
	}

	function hasScope(
		scope: Scope | Scope[],
		context?: {
			resourceType?: Resource;
			resourceId?: string;
			projectId?: string;
		},
		options?: ScopeOptions,
	): boolean {
		return genericHasScope(
			scope,
			{
				global: globalScopes.value,
				project: context?.projectId ? scopesByProjectId.value[context.projectId] : [],
				resource:
					context?.resourceType && context?.resourceId
						? scopesByResourceId.value[context.resourceType][context.resourceId]
						: [],
			},
			undefined,
			options,
		);
	}

	return {
		globalRoles,
		rolesByProjectId,
		globalScopes,
		scopesByProjectId,
		scopesByResourceId,
		addGlobalRole,
		hasRole,
		addGlobalScope,
		setGlobalScopes,
		addProjectScope,
		addResourceScope,
		hasScope,
	};
});
