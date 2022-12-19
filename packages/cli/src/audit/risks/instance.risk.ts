import axios from 'axios';
import { UserSettings } from 'n8n-core';
import * as GenericHelpers from '@/GenericHelpers';
import config from '@/config';
import { toFlaggedNode } from '@/audit/utils';
import { separate } from '@/utils';
import {
	ENV_VARS_DOCS_URL,
	INSTANCE_REPORT,
	WEBHOOK_NODE_TYPE,
	WEBHOOK_VALIDATOR_NODE_TYPES,
} from '@/audit/constants';
import { inDevelopment } from '@/constants';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import type { Risk, n8n } from '@/audit/types';

function getSecuritySettings() {
	if (config.getEnv('deployment.type') === 'cloud') return null;

	return {
		features: {
			communityPackagesEnabled: process.env.N8N_COMMUNITY_PACKAGES_ENABLED,
			versionNotificationsEnabled: process.env.N8N_VERSION_NOTIFICATIONS_ENABLED,
			templatesEnabled: process.env.N8N_TEMPLATES_ENABLED,
			publicApiDisabled: process.env.N8N_PUBLIC_API_DISABLED,
			userManagementDisabled: process.env.N8N_USER_MANAGEMENT_DISABLED,
		},
		auth: {
			authExcludeEndpoints: process.env.N8N_AUTH_EXCLUDE_ENDPOINTS,
			basicAuthActive: process.env.N8N_BASIC_AUTH_ACTIVE,
			jwtAuthActive: process.env.N8N_JWT_AUTH_ACTIVE,
		},
		nodes: {
			nodesInclude: process.env.NODES_INCLUDE,
			nodesExclude: process.env.NODES_EXCLUDE,
		},
		telemetry: {
			diagnosticsEnabled: process.env.N8N_DIAGNOSTICS_ENABLED,
		},
	};
}

function hasValidatorChild({
	node,
	workflow,
}: {
	node: WorkflowEntity['nodes'][number];
	workflow: WorkflowEntity;
}) {
	const childNodeNames = workflow.connections[node.name]?.main[0].map((i) => i.node);

	if (!childNodeNames) return false;

	return childNodeNames.some((name) =>
		workflow.nodes.find((n) => n.name === name && WEBHOOK_VALIDATOR_NODE_TYPES.includes(n.type)),
	);
}

function getUnprotectedWebhookNodes(workflows: WorkflowEntity[]) {
	return workflows.reduce<Risk.NodeLocation[]>((acc, workflow) => {
		if (!workflow.active) return acc;

		workflow.nodes.forEach((node) => {
			if (
				node.type === WEBHOOK_NODE_TYPE &&
				node.parameters.authentication === undefined &&
				!hasValidatorChild({ node, workflow })
			) {
				acc.push(toFlaggedNode({ node, workflow }));
			}
		});

		return acc;
	}, []);
}

async function getNextVersions(currentVersionName: string) {
	const BASE_URL = config.getEnv('versionNotifications.endpoint');
	const instanceId = await UserSettings.getInstanceId();

	const response = await axios.get<n8n.Version[]>(BASE_URL + currentVersionName, {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		headers: { 'n8n-instance-id': instanceId },
	});

	return response.data;
}

function removeIconData(versions: n8n.Version[]) {
	return versions.map((version) => {
		if (version.nodes.length === 0) return version;

		version.nodes.forEach((node) => delete node.iconData);

		return version;
	});
}

function classify(versions: n8n.Version[], currentVersionName: string) {
	const [pass, fail] = separate(versions, (v) => v.name === currentVersionName);

	return { currentVersion: pass[0], nextVersions: fail };
}

export async function getOutdatedState() {
	const allPackagesVersions = await GenericHelpers.getVersions();
	const currentVersionName = allPackagesVersions.cli;

	let versions = []; // API returns current version and its next versions

	try {
		versions = await getNextVersions(currentVersionName).then(removeIconData);
	} catch (error) {
		if (inDevelopment) {
			console.error('Failed to fetch n8n versions. Skipping outdated instance report...');
		}
		return null;
	}

	const { currentVersion, nextVersions } = classify(versions, currentVersionName);

	const nextVersionsNumber = nextVersions.length;

	if (nextVersionsNumber === 0) return null;

	const description = [
		`This n8n instance is outdated. Currently at version ${
			currentVersion.name
		}, missing ${nextVersionsNumber} ${nextVersionsNumber > 1 ? 'updates' : 'update'}.`,
	];

	const upcomingSecurityUpdates = nextVersions.some((v) => v.hasSecurityIssue || v.hasSecurityFix);

	if (upcomingSecurityUpdates) description.push('Newer versions contain security updates.');

	return {
		description: description.join(' '),
		nextVersions,
	};
}

export async function reportInstanceRisk(workflows: WorkflowEntity[]) {
	const unprotectedWebhooks = getUnprotectedWebhookNodes(workflows);
	const outdatedState = await getOutdatedState();
	const securitySettings = getSecuritySettings();

	const report: Risk.InstanceReport = {
		risk: INSTANCE_REPORT.RISK,
		sections: [],
	};

	if (unprotectedWebhooks.length > 0) {
		const sentenceStart = ({ length }: { length: number }) =>
			length > 1 ? 'These webhook nodes have' : 'This webhook node has';

		const recommendedValidators = WEBHOOK_VALIDATOR_NODE_TYPES.filter(
			(nodeType) => !nodeType.endsWith('function') || !nodeType.endsWith('functionItem'),
		).join(',');

		report.sections.push({
			title: INSTANCE_REPORT.SECTIONS.UNPROTECTED_WEBHOOKS,
			description: [
				sentenceStart(unprotectedWebhooks),
				'the "Authentication" field set to "None" and are not directly connected to a node to validate the payload. Every unprotected webhook allows your workflow to be called by any third party who knows the webhook URL.',
			].join(' '),
			recommendation: `Consider setting the "Authentication" field in Webhook node to an option other than "None", or validating the payload with one of the following nodes: ${recommendedValidators}.`,
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
			recommendation: `Consider adjusting the security settings for your n8n instance. See: ${ENV_VARS_DOCS_URL}`,
			settings: securitySettings,
		});
	}

	return report;
}
