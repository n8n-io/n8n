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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.InstanceRiskReporter = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const axios_1 = __importDefault(require('axios'));
const n8n_core_1 = require('n8n-core');
const constants_1 = require('@/constants');
const public_api_1 = require('@/public-api');
const constants_2 = require('@/security-audit/constants');
const utils_1 = require('@/security-audit/utils');
const community_packages_config_1 = require('@/community-packages/community-packages.config');
let InstanceRiskReporter = class InstanceRiskReporter {
	constructor(instanceSettings, logger, globalConfig) {
		this.instanceSettings = instanceSettings;
		this.logger = logger;
		this.globalConfig = globalConfig;
	}
	async report(workflows) {
		const unprotectedWebhooks = this.getUnprotectedWebhookNodes(workflows);
		const outdatedState = await this.getOutdatedState();
		const securitySettings = this.getSecuritySettings();
		if (unprotectedWebhooks.length === 0 && outdatedState === null && securitySettings === null) {
			return null;
		}
		const report = {
			risk: constants_2.INSTANCE_REPORT.RISK,
			sections: [],
		};
		if (unprotectedWebhooks.length > 0) {
			const sentenceStart = ({ length }) =>
				length > 1 ? 'These webhook nodes have' : 'This webhook node has';
			const recommendedValidators = [...constants_2.WEBHOOK_VALIDATOR_NODE_TYPES]
				.filter((nodeType) => !nodeType.endsWith('function') || !nodeType.endsWith('functionItem'))
				.join(',');
			report.sections.push({
				title: constants_2.INSTANCE_REPORT.SECTIONS.UNPROTECTED_WEBHOOKS,
				description: [
					sentenceStart(unprotectedWebhooks),
					`the "Authentication" field set to "None" and ${unprotectedWebhooks.length > 1 ? 'are' : 'is'} not directly connected to a node to validate the payload. Every unprotected webhook allows your workflow to be called by any third party who knows the webhook URL.`,
				].join(' '),
				recommendation: `Consider setting the "Authentication" field to an option other than "None", or validating the payload with one of the following nodes: ${recommendedValidators}.`,
				location: unprotectedWebhooks,
			});
		}
		if (outdatedState !== null) {
			report.sections.push({
				title: constants_2.INSTANCE_REPORT.SECTIONS.OUTDATED_INSTANCE,
				description: outdatedState.description,
				recommendation:
					'Consider updating this n8n instance to the latest version to prevent security vulnerabilities.',
				nextVersions: outdatedState.nextVersions,
			});
		}
		if (securitySettings !== null) {
			report.sections.push({
				title: constants_2.INSTANCE_REPORT.SECTIONS.SECURITY_SETTINGS,
				description: 'This n8n instance has the following security settings.',
				recommendation: `Consider adjusting the security settings for your n8n instance based on your needs. See: ${constants_2.ENV_VARS_DOCS_URL}`,
				settings: securitySettings,
			});
		}
		return report;
	}
	getSecuritySettings() {
		if (this.globalConfig.deployment.type === 'cloud') return null;
		const settings = {};
		settings.features = {
			communityPackagesEnabled: di_1.Container.get(
				community_packages_config_1.CommunityPackagesConfig,
			).enabled,
			versionNotificationsEnabled: this.globalConfig.versionNotifications.enabled,
			templatesEnabled: this.globalConfig.templates.enabled,
			publicApiEnabled: (0, public_api_1.isApiEnabled)(),
		};
		const { exclude, include } = this.globalConfig.nodes;
		settings.nodes = {
			nodesExclude: exclude.length === 0 ? 'none' : exclude.join(', '),
			nodesInclude: include.length === 0 ? 'none' : include.join(', '),
		};
		settings.telemetry = {
			diagnosticsEnabled: this.globalConfig.diagnostics.enabled,
		};
		return settings;
	}
	hasValidatorChild({ node, workflow }) {
		const childNodeNames = workflow.connections[node.name]?.main[0]?.map((i) => i.node);
		if (!childNodeNames) return false;
		return childNodeNames.some((name) =>
			workflow.nodes.find(
				(n) => n.name === name && constants_2.WEBHOOK_VALIDATOR_NODE_TYPES.has(n.type),
			),
		);
	}
	getUnprotectedWebhookNodes(workflows) {
		return workflows.reduce((acc, workflow) => {
			if (!workflow.active) return acc;
			workflow.nodes.forEach((node) => {
				if (
					node.type === constants_2.WEBHOOK_NODE_TYPE &&
					node.parameters.authentication === undefined &&
					!this.hasValidatorChild({ node, workflow })
				) {
					acc.push((0, utils_1.toFlaggedNode)({ node, workflow }));
				}
			});
			return acc;
		}, []);
	}
	async getNextVersions(currentVersionName) {
		const BASE_URL = this.globalConfig.versionNotifications.endpoint;
		const { instanceId } = this.instanceSettings;
		const response = await axios_1.default.get(BASE_URL + currentVersionName, {
			headers: { 'n8n-instance-id': instanceId },
		});
		return response.data;
	}
	removeIconData(versions) {
		return versions.map((version) => {
			if (version.nodes.length === 0) return version;
			version.nodes.forEach((node) => delete node.iconData);
			return version;
		});
	}
	classify(versions, currentVersionName) {
		const [pass, fail] = (0, db_1.separate)(versions, (v) => v.name === currentVersionName);
		return { currentVersion: pass[0], nextVersions: fail };
	}
	async getOutdatedState() {
		let versions = [];
		const localVersion = constants_1.N8N_VERSION;
		try {
			versions = await this.getNextVersions(localVersion).then((v) => this.removeIconData(v));
		} catch (error) {
			if (backend_common_1.inDevelopment) {
				this.logger.error('Failed to fetch n8n versions. Skipping outdated instance report...');
			}
			return null;
		}
		const { currentVersion, nextVersions } = this.classify(versions, localVersion);
		const nextVersionsNumber = nextVersions.length;
		if (nextVersionsNumber === 0) return null;
		const description = [
			`This n8n instance is outdated. Currently at version ${currentVersion.name}, missing ${nextVersionsNumber} ${nextVersionsNumber > 1 ? 'updates' : 'update'}.`,
		];
		const upcomingSecurityUpdates = nextVersions.some(
			(v) => v.hasSecurityIssue || v.hasSecurityFix,
		);
		if (upcomingSecurityUpdates) description.push('Newer versions contain security updates.');
		return {
			description: description.join(' '),
			nextVersions,
		};
	}
};
exports.InstanceRiskReporter = InstanceRiskReporter;
exports.InstanceRiskReporter = InstanceRiskReporter = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			n8n_core_1.InstanceSettings,
			backend_common_1.Logger,
			config_1.GlobalConfig,
		]),
	],
	InstanceRiskReporter,
);
//# sourceMappingURL=instance-risk-reporter.js.map
