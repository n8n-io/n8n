'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.CommunityNodeTypesService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const community_packages_config_1 = require('@/community-packages/community-packages.config');
const community_node_types_utils_1 = require('./community-node-types-utils');
const community_packages_service_1 = require('./community-packages.service');
const UPDATE_INTERVAL = 8 * 60 * 60 * 1000;
let CommunityNodeTypesService = class CommunityNodeTypesService {
	constructor(logger, config, communityPackagesService) {
		this.logger = logger;
		this.config = config;
		this.communityPackagesService = communityPackagesService;
		this.communityNodeTypes = new Map();
		this.lastUpdateTimestamp = 0;
	}
	async fetchNodeTypes() {
		try {
			let data = [];
			if (this.config.enabled && this.config.verifiedEnabled) {
				const environment = this.detectEnvironment();
				data = await (0, community_node_types_utils_1.getCommunityNodeTypes)(environment);
			}
			this.updateCommunityNodeTypes(data);
		} catch (error) {
			this.logger.error('Failed to fetch community node types', {
				error: (0, n8n_workflow_1.ensureError)(error),
			});
		}
	}
	detectEnvironment() {
		const environment = process.env.ENVIRONMENT;
		if (environment === 'staging') return 'staging';
		if (backend_common_1.inProduction) return 'production';
		if (environment === 'production') return 'production';
		return 'staging';
	}
	updateCommunityNodeTypes(nodeTypes) {
		if (!nodeTypes?.length) return;
		this.resetCommunityNodeTypes();
		this.communityNodeTypes = new Map(nodeTypes.map((nodeType) => [nodeType.name, nodeType]));
		this.lastUpdateTimestamp = Date.now();
	}
	resetCommunityNodeTypes() {
		this.communityNodeTypes = new Map();
	}
	updateRequired() {
		if (!this.lastUpdateTimestamp) return true;
		return Date.now() - this.lastUpdateTimestamp > UPDATE_INTERVAL;
	}
	async createIsInstalled() {
		const installedPackages = (await this.communityPackagesService.getAllInstalledPackages()) ?? [];
		const installedPackageNames = new Set(installedPackages.map((p) => p.packageName));
		return (nodeTypeName) => installedPackageNames.has(nodeTypeName.split('.')[0]);
	}
	async getCommunityNodeTypes() {
		if (this.updateRequired() || !this.communityNodeTypes.size) {
			await this.fetchNodeTypes();
		}
		const isInstalled = await this.createIsInstalled();
		return Array.from(this.communityNodeTypes.values()).map((nodeType) => ({
			...nodeType,
			isInstalled: isInstalled(nodeType.name),
		}));
	}
	async getCommunityNodeType(type) {
		const nodeType = this.communityNodeTypes.get(type);
		const isInstalled = await this.createIsInstalled();
		if (!nodeType) return null;
		return { ...nodeType, isInstalled: isInstalled(nodeType.name) };
	}
	findVetted(packageName) {
		const vettedTypes = Array.from(this.communityNodeTypes.keys());
		const nodeName = vettedTypes.find((t) => t.includes(packageName));
		if (!nodeName) return;
		return this.communityNodeTypes.get(nodeName);
	}
};
exports.CommunityNodeTypesService = CommunityNodeTypesService;
exports.CommunityNodeTypesService = CommunityNodeTypesService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			community_packages_config_1.CommunityPackagesConfig,
			community_packages_service_1.CommunityPackagesService,
		]),
	],
	CommunityNodeTypesService,
);
//# sourceMappingURL=community-node-types.service.js.map
