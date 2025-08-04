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
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.NodesRiskReporter = void 0;
const di_1 = require('@n8n/di');
const fast_glob_1 = __importDefault(require('fast-glob'));
const path = __importStar(require('path'));
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const constants_1 = require('@/security-audit/constants');
const utils_1 = require('@/security-audit/utils');
const community_packages_service_1 = require('@/community-packages/community-packages.service');
const community_packages_config_1 = require('@/community-packages/community-packages.config');
let NodesRiskReporter = class NodesRiskReporter {
	constructor(loadNodesAndCredentials, communityPackagesService) {
		this.loadNodesAndCredentials = loadNodesAndCredentials;
		this.communityPackagesService = communityPackagesService;
	}
	async report(workflows) {
		const officialRiskyNodes = (0, utils_1.getNodeTypes)(workflows, (node) =>
			constants_1.OFFICIAL_RISKY_NODE_TYPES.has(node.type),
		);
		const [communityNodes, customNodes] = await Promise.all([
			this.getCommunityNodeDetails(),
			this.getCustomNodeDetails(),
		]);
		const issues = [officialRiskyNodes, communityNodes, customNodes];
		if (issues.every((i) => i.length === 0)) return null;
		const report = {
			risk: constants_1.NODES_REPORT.RISK,
			sections: [],
		};
		const sentenceStart = (length) => (length > 1 ? 'These nodes are' : 'This node is');
		if (officialRiskyNodes.length > 0) {
			report.sections.push({
				title: constants_1.NODES_REPORT.SECTIONS.OFFICIAL_RISKY_NODES,
				description: [
					sentenceStart(officialRiskyNodes.length),
					"part of n8n's official nodes and may be used to fetch and run any arbitrary code in the host system. This may lead to exploits such as remote code execution.",
				].join(' '),
				recommendation: `Consider reviewing the parameters in these nodes, replacing them with app nodes where possible, and not loading unneeded node types with the NODES_EXCLUDE environment variable. See: ${constants_1.ENV_VARS_DOCS_URL}`,
				location: officialRiskyNodes,
			});
		}
		if (communityNodes.length > 0) {
			report.sections.push({
				title: constants_1.NODES_REPORT.SECTIONS.COMMUNITY_NODES,
				description: [
					sentenceStart(communityNodes.length),
					`sourced from the n8n community. Community nodes are not vetted by the n8n team and have full access to the host system. See: ${constants_1.COMMUNITY_NODES_RISKS_URL}`,
				].join(' '),
				recommendation:
					'Consider reviewing the source code in any community nodes installed in this n8n instance, and uninstalling any community nodes no longer in use.',
				location: communityNodes,
			});
		}
		if (customNodes.length > 0) {
			report.sections.push({
				title: constants_1.NODES_REPORT.SECTIONS.CUSTOM_NODES,
				description: [
					sentenceStart(communityNodes.length),
					'unpublished and located in the host system. Custom nodes are not vetted by the n8n team and have full access to the host system.',
				].join(' '),
				recommendation:
					'Consider reviewing the source code in any custom node installed in this n8n instance, and removing any custom nodes no longer in use.',
				location: customNodes,
			});
		}
		return report;
	}
	async getCommunityNodeDetails() {
		if (!di_1.Container.get(community_packages_config_1.CommunityPackagesConfig).enabled) return [];
		const installedPackages = await this.communityPackagesService.getAllInstalledPackages();
		return installedPackages.reduce((acc, pkg) => {
			pkg.installedNodes.forEach((node) =>
				acc.push({
					kind: 'community',
					nodeType: node.type,
					packageUrl: [constants_1.NPM_PACKAGE_URL, pkg.packageName].join('/'),
				}),
			);
			return acc;
		}, []);
	}
	async getCustomNodeDetails() {
		const customNodeTypes = [];
		for (const customDir of this.loadNodesAndCredentials.getCustomDirectories()) {
			const customNodeFiles = await (0, fast_glob_1.default)('**/*.node.js', {
				cwd: customDir,
				absolute: true,
			});
			for (const nodeFile of customNodeFiles) {
				const [fileName] = path.parse(nodeFile).name.split('.');
				customNodeTypes.push({
					kind: 'custom',
					nodeType: ['CUSTOM', fileName].join('.'),
					filePath: nodeFile,
				});
			}
		}
		return customNodeTypes;
	}
};
exports.NodesRiskReporter = NodesRiskReporter;
exports.NodesRiskReporter = NodesRiskReporter = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			load_nodes_and_credentials_1.LoadNodesAndCredentials,
			community_packages_service_1.CommunityPackagesService,
		]),
	],
	NodesRiskReporter,
);
//# sourceMappingURL=nodes-risk-reporter.js.map
