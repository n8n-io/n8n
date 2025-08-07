'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
exports.preloadCommonModules = preloadCommonModules;
exports.getCachedModule = getCachedModule;
exports.loadEndpointGroup = loadEndpointGroup;
exports.clearModuleCache = clearModuleCache;
const moduleCache = new Map();
async function preloadCommonModules() {
	const commonModules = [
		'@/credentials/credentials.controller',
		'@/workflows/workflows.controller',
		'@/executions/executions.controller',
		'@/controllers/auth.controller',
		'@/controllers/me.controller',
		'@/public-api',
	];
	await Promise.all(
		commonModules.map(async (modulePath) => {
			if (!moduleCache.has(modulePath)) {
				const modulePromise = Promise.resolve(`${modulePath}`).then((s) =>
					__importStar(require(s)),
				);
				moduleCache.set(modulePath, modulePromise);
				return modulePromise;
			}
			return moduleCache.get(modulePath);
		}),
	);
}
async function getCachedModule(modulePath) {
	if (!moduleCache.has(modulePath)) {
		const modulePromise = Promise.resolve(`${modulePath}`).then((s) => __importStar(require(s)));
		moduleCache.set(modulePath, modulePromise);
		return modulePromise;
	}
	return moduleCache.get(modulePath);
}
async function loadEndpointGroup(group) {
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
			return Promise.resolve();
	}
}
function clearModuleCache() {
	moduleCache.clear();
}
//# sourceMappingURL=module-cache.js.map
