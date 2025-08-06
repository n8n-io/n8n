/**
 * Shared module cache for faster test initialization
 * Preloads and caches commonly used controller modules
 */

// Module cache to avoid repeated dynamic imports
const moduleCache = new Map<string, Promise<any>>();

/**
 * Preload commonly used modules to reduce test initialization time
 */
export async function preloadCommonModules() {
	const commonModules = [
		'@/credentials/credentials.controller',
		'@/workflows/workflows.controller',
		'@/executions/executions.controller',
		'@/controllers/auth.controller',
		'@/controllers/me.controller',
		'@/public-api',
	];

	// Load modules in parallel
	await Promise.all(
		commonModules.map(async (modulePath) => {
			if (!moduleCache.has(modulePath)) {
				const modulePromise = import(modulePath);
				moduleCache.set(modulePath, modulePromise);
				return modulePromise;
			}
			return moduleCache.get(modulePath);
		}),
	);
}

/**
 * Get cached module or load if not cached
 */
export async function getCachedModule(modulePath: string) {
	if (!moduleCache.has(modulePath)) {
		const modulePromise = import(modulePath);
		moduleCache.set(modulePath, modulePromise);
		return modulePromise;
	}
	return moduleCache.get(modulePath);
}

/**
 * Load endpoint group modules with caching
 */
export async function loadEndpointGroup(group: string) {
	switch (group) {
		case 'credentials':
			return getCachedModule('@/credentials/credentials.controller');

		case 'workflows':
			return getCachedModule('@/workflows/workflows.controller');

		case 'executions':
			return getCachedModule('@/executions/executions.controller');

		case 'auth':
			return getCachedModule('@/controllers/auth.controller');

		case 'me':
			return getCachedModule('@/controllers/me.controller');

		case 'annotationTags':
			return getCachedModule('@/controllers/annotation-tags.controller.ee');

		case 'variables':
			return getCachedModule('@/environments.ee/variables/variables.controller.ee');

		case 'license':
			return getCachedModule('@/license/license.controller');

		case 'eventBus':
			return getCachedModule('@/eventbus/event-bus.controller');

		case 'oauth2':
			return getCachedModule('@/controllers/oauth/oauth2-credential.controller');

		case 'mfa':
			return getCachedModule('@/controllers/mfa.controller');

		case 'sourceControl':
			return getCachedModule('@/environments.ee/source-control/source-control.controller.ee');

		case 'community-packages':
			return getCachedModule('@/community-packages/community-packages.controller');

		case 'passwordReset':
			return getCachedModule('@/controllers/password-reset.controller');

		case 'owner':
			return getCachedModule('@/controllers/owner.controller');

		case 'users':
			return getCachedModule('@/controllers/users.controller');

		case 'invitations':
			return getCachedModule('@/controllers/invitation.controller');

		case 'tags':
			return getCachedModule('@/controllers/tags.controller');

		case 'externalSecrets':
			return getCachedModule('@/external-secrets.ee/external-secrets.controller.ee');

		case 'workflowHistory':
			return getCachedModule('@/workflows/workflow-history.ee/workflow-history.controller.ee');

		case 'binaryData':
			return getCachedModule('@/controllers/binary-data.controller');

		case 'dynamicNodeParameters':
			return getCachedModule('@/controllers/dynamic-node-parameters.controller');

		case 'nodeTypes':
			return getCachedModule('@/controllers/node-types.controller');

		case 'curlHelper':
			return getCachedModule('@/controllers/curl.controller');

		case 'workflowStatistics':
			return getCachedModule('@/controllers/workflow-statistics.controller');

		case 'orchestration':
			return getCachedModule('@/controllers/orchestration.controller');

		case 'translation':
			return getCachedModule('@/controllers/translation.controller');

		case 'roleMapping':
			return getCachedModule('@/controllers/role.controller');

		default:
			// Return promise that resolves immediately for unknown groups
			return Promise.resolve();
	}
}

/**
 * Clear module cache (useful for testing)
 */
export function clearModuleCache() {
	moduleCache.clear();
}
