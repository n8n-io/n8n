import { inDevelopment, Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { separate } from '@n8n/db';
import { Service } from '@n8n/di';
import axios from 'axios';
import { InstanceSettings } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';

import { N8N_VERSION } from '@/constants';
import { isApiEnabled } from '@/public-api';
import {
	ENV_VARS_DOCS_URL,
	INSTANCE_REPORT,
	WEBHOOK_NODE_TYPE,
	WEBHOOK_VALIDATOR_NODE_TYPES,
} from '@/security-audit/constants';
import type { RiskReporter, Risk, n8n } from '@/security-audit/types';
import { toFlaggedNode } from '@/security-audit/utils';

@Service()
export class InstanceRiskReporter implements RiskReporter {
	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
	) {}

	async report(workflows: IWorkflowBase[]) {
		const unprotectedWebhooks = this.getUnprotectedWebhookNodes(workflows);
		const outdatedState = await this.getOutdatedState();
		const securitySettings = this.getSecuritySettings();

		if (unprotectedWebhooks.length === 0 && outdatedState === null && securitySettings === null) {
			return null;
		}

		const report: Risk.Report = {
			risk: INSTANCE_REPORT.RISK,
			sections: [],
		};

		if (unprotectedWebhooks.length > 0) {
			const sentenceStart = ({ length }: { length: number }) =>
				length > 1 ? 'These webhook nodes have' : 'This webhook node has';

			const recommendedValidators = [...WEBHOOK_VALIDATOR_NODE_TYPES]
				.filter((nodeType) => !nodeType.endsWith('function') || !nodeType.endsWith('functionItem'))
				.join(',');

			report.sections.push({
				title: INSTANCE_REPORT.SECTIONS.UNPROTECTED_WEBHOOKS,
				description: [
					sentenceStart(unprotectedWebhooks),
					`the "Authentication" field set to "None" and ${
						unprotectedWebhooks.length > 1 ? 'are' : 'is'
					} not directly connected to a node to validate the payload. Every unprotected webhook allows your workflow to be called by any third party who knows the webhook URL.`,
				].join(' '),
				recommendation: `Consider setting the "Authentication" field to an option other than "None", or validating the payload with one of the following nodes: ${recommendedValidators}.`,
				location: unprotectedWebhooks,
			});
		}

		if (outdatedState !== null) {
			report.sections.push({
				title: INSTANCE_REPORT.SECTIONS.OUTDATED_INSTANCE,
				description: outdatedState.description,
				recommendation:
					'Consider updating this n8n instance to the latest version to prevent security vulnerabilities.',
				nextVersions: outdatedState.nextVersions,
			});
		}

		if (securitySettings !== null) {
			report.sections.push({
				title: INSTANCE_REPORT.SECTIONS.SECURITY_SETTINGS,
				description: 'This n8n instance has the following security settings.',
				recommendation: `Consider adjusting the security settings for your n8n instance based on your needs. See: ${ENV_VARS_DOCS_URL}`,
				settings: securitySettings,
			});
		}

		return report;
	}

	private getSecuritySettings() {
		if (this.globalConfig.deployment.type === 'cloud') return null;

		const settings: Record<string, unknown> = {};

		settings.features = {
			communityPackagesEnabled: this.globalConfig.nodes.communityPackages.enabled,
			versionNotificationsEnabled: this.globalConfig.versionNotifications.enabled,
			templatesEnabled: this.globalConfig.templates.enabled,
			publicApiEnabled: isApiEnabled(),
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

	/**
	 * Whether a webhook node has a direct child assumed to validate its payload.
	 */
	private hasValidatorChild({
		node,
		workflow,
	}: {
		node: IWorkflowBase['nodes'][number];
		workflow: IWorkflowBase;
	}) {
		const childNodeNames = workflow.connections[node.name]?.main[0]?.map((i) => i.node);

		if (!childNodeNames) return false;

		return childNodeNames.some((name) =>
			workflow.nodes.find((n) => n.name === name && WEBHOOK_VALIDATOR_NODE_TYPES.has(n.type)),
		);
	}

	private getUnprotectedWebhookNodes(workflows: IWorkflowBase[]) {
		return workflows.reduce<Risk.NodeLocation[]>((acc, workflow) => {
			if (!workflow.active) return acc;

			workflow.nodes.forEach((node) => {
				if (
					node.type === WEBHOOK_NODE_TYPE &&
					node.parameters.authentication === undefined &&
					!this.hasValidatorChild({ node, workflow })
				) {
					acc.push(toFlaggedNode({ node, workflow }));
				}
			});

			return acc;
		}, []);
	}

	private async getNextVersions(currentVersionName: string) {
		const BASE_URL = this.globalConfig.versionNotifications.endpoint;
		const { instanceId } = this.instanceSettings;

		const response = await axios.get<n8n.Version[]>(BASE_URL + currentVersionName, {
			headers: { 'n8n-instance-id': instanceId },
		});

		return response.data;
	}

	private removeIconData(versions: n8n.Version[]) {
		return versions.map((version) => {
			if (version.nodes.length === 0) return version;

			version.nodes.forEach((node) => delete node.iconData);

			return version;
		});
	}

	private classify(versions: n8n.Version[], currentVersionName: string) {
		const [pass, fail] = separate(versions, (v) => v.name === currentVersionName);

		return { currentVersion: pass[0], nextVersions: fail };
	}

	private async getOutdatedState() {
		let versions = [];

		const localVersion = N8N_VERSION;

		try {
			versions = await this.getNextVersions(localVersion).then((v) => this.removeIconData(v));
		} catch (error) {
			if (inDevelopment) {
				this.logger.error('Failed to fetch n8n versions. Skipping outdated instance report...');
			}
			return null;
		}

		const { currentVersion, nextVersions } = this.classify(versions, localVersion);

		const nextVersionsNumber = nextVersions.length;

		if (nextVersionsNumber === 0) return null;

		const description = [
			`This n8n instance is outdated. Currently at version ${
				currentVersion.name
			}, missing ${nextVersionsNumber} ${nextVersionsNumber > 1 ? 'updates' : 'update'}.`,
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
}
