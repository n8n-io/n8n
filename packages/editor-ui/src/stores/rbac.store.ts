import { defineStore } from 'pinia';
import { hasScope as genericHasScope } from '@n8n/permissions';
import type { HasScopeOptions, Scope, Resource } from '@n8n/permissions';
import { ref } from 'vue';

export const useRBACStore = defineStore('RBAC', () => {
	const globalRoles = ref<string[]>([]);
	const rolesByProjectId = ref<Record<string, string[]>>({});

	const globalScopes = ref<Scope[]>(['workflow:list', 'workflow:create', 'credential:list']);
	const scopesByProjectId = ref<Record<string, Scope[]>>({});
	const scopesByResourceId = ref<Record<Resource, Record<string, Scope[]>>>({
		workflow: {},
		user: {},
		credential: {},
		variable: {},
		sourceControl: {},
		externalSecretsStore: {},
	});

	function addGlobalScope(scope: Scope) {
		if (!globalScopes.value.includes(scope)) {
			globalScopes.value.push(scope);
		}
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
		if (!scopesByResourceId.value[context.resourceType][context.resourceId]) {
			scopesByResourceId.value[context.resourceType][context.resourceId] = [];
		}

		if (!scopesByResourceId.value[context.resourceType][context.resourceId].includes(scope)) {
			scopesByResourceId.value[context.resourceType][context.resourceId].push(scope);
		}
	}

	function hasScope(
		scope: Scope | Scope[],
		context: {
			resourceType?: Resource;
			resourceId?: string;
			projectId?: string;
		},
		options?: HasScopeOptions,
	) {
		return genericHasScope(
			scope,
			{
				global: globalScopes.value,
				project: context.projectId ? scopesByProjectId.value[context.projectId] : [],
				resource:
					context.resourceType && context.resourceId
						? scopesByResourceId.value[context.resourceType][context.resourceId]
						: [],
			},
			options,
		);
	}

	return {
		globalRoles,
		rolesByProjectId,
		globalScopes,
		scopesByProjectId,
		scopesByResourceId,
		addGlobalScope,
		addProjectScope,
		addResourceScope,
		hasScope,
	};
});
