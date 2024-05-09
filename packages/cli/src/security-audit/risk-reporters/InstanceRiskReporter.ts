import axios from 'axios';
import { Service } from 'typedi';
import { InstanceSettings } from 'n8n-core';
import config from '@/config';
import { toFlaggedNode } from '@/security-audit/utils';
import { separate } from '@/utils';
import {
	ENV_VARS_DOCS_URL,
	INSTANCE_REPORT,
	WEBHOOK_NODE_TYPE,
	WEBHOOK_VALIDATOR_NODE_TYPES,
} from '@/security-audit/constants';
import { getN8nPackageJson, inDevelopment } from '@/constants';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { RiskReporter, Risk, n8n } from '@/security-audit/types';
import { isApiEnabled } from '@/PublicApi';
import { Logger } from '@/Logger';

@Service()
export class InstanceRiskReporter implements RiskReporter {
	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {}

	async report(workflows: WorkflowEntity[]) {
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
		if (config.getEnv('deployment.type') === 'cloud') return null;

		const settings: Record<string, unknown> = {};

		settings.features = {
			communityPackagesEnabled: config.getEnv('nodes.communityPackages.enabled'),
			versionNotificationsEnabled: config.getEnv('versionNotifications.enabled'),
			templatesEnabled: config.getEnv('templates.enabled'),
			publicApiEnabled: isApiEnabled(),
		};

		settings.nodes = {
			nodesExclude: config.getEnv('nodes.exclude') ?? 'none',
			nodesInclude: config.getEnv('nodes.include') ?? 'none',
		};

		settings.telemetry = {
			diagnosticsEnabled: config.getEnv('diagnostics.enabled'),
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
		node: WorkflowEntity['nodes'][number];
		workflow: WorkflowEntity;
	}) {
		const childNodeNames = workflow.connections[node.name]?.main[0].map((i) => i.node);

		if (!childNodeNames) return false;

		return childNodeNames.some((name) =>
			workflow.nodes.find((n) => n.name === name && WEBHOOK_VALIDATOR_NODE_TYPES.has(n.type)),
		);
	}

	private getUnprotectedWebhookNodes(workflows: WorkflowEntity[]) {
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
		const BASE_URL = config.getEnv('versionNotifications.endpoint');
		const { instanceId } = this.instanceSettings;

		const response = await axios.get<n8n.Version[]>(BASE_URL + currentVersionName, {
			// eslint-disable-next-line @typescript-eslint/naming-convention
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

		const localVersion = getN8nPackageJson().version;

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
