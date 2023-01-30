import axios from 'axios';
import { UserSettings } from 'n8n-core';
import config from '@/config';
import { toFlaggedNode } from '@/audit/utils';
import { separate } from '@/utils';
import {
	SELF_HOSTED_AUTH_DOCS_URL,
	ENV_VARS_DOCS_URL,
	INSTANCE_REPORT,
	WEBHOOK_NODE_TYPE,
	WEBHOOK_VALIDATOR_NODE_TYPES,
} from '@/audit/constants';
import { getN8nPackageJson, inDevelopment } from '@/constants';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { Risk, n8n } from '@/audit/types';

function getSecuritySettings() {
	if (config.getEnv('deployment.type') === 'cloud') return null;

	const userManagementEnabled = !config.getEnv('userManagement.disabled');
	const basicAuthActive = config.getEnv('security.basicAuth.active');
	const jwtAuthActive = config.getEnv('security.jwtAuth.active');

	const isInstancePubliclyAccessible = !userManagementEnabled && !basicAuthActive && !jwtAuthActive;

	const settings: Record<string, unknown> = {};

	if (isInstancePubliclyAccessible) {
		settings.publiclyAccessibleInstance =
			'Important! Your n8n instance is publicly accessible. Any third party who knows your instance URL can access your data.'.toUpperCase();
	}

	settings.features = {
		communityPackagesEnabled: config.getEnv('nodes.communityPackages.enabled'),
		versionNotificationsEnabled: config.getEnv('versionNotifications.enabled'),
		templatesEnabled: config.getEnv('templates.enabled'),
		publicApiEnabled: !config.getEnv('publicApi.disabled'),
		userManagementEnabled,
	};

	settings.auth = {
		authExcludeEndpoints: config.getEnv('security.excludeEndpoints') || 'none',
		basicAuthActive,
		jwtAuthActive,
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
		workflow.nodes.find((n) => n.name === name && WEBHOOK_VALIDATOR_NODE_TYPES.has(n.type)),
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
	let versions = [];

	const localVersion = getN8nPackageJson().version;

	try {
		versions = await getNextVersions(localVersion).then(removeIconData);
	} catch (error) {
		if (inDevelopment) {
			console.error('Failed to fetch n8n versions. Skipping outdated instance report...');
		}
		return null;
	}

	const { currentVersion, nextVersions } = classify(versions, localVersion);

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

	if (unprotectedWebhooks.length === 0 && outdatedState === null && securitySettings === null) {
		return null;
	}

	const report: Risk.InstanceReport = {
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
			recommendation: securitySettings.publiclyAccessibleInstance
				? [
						'Important! Your n8n instance is publicly accessible. Set up user management or basic/JWT auth to protect access to your n8n instance.'.toUpperCase(),
						`See: ${SELF_HOSTED_AUTH_DOCS_URL}`,
				  ].join(' ')
				: `Consider adjusting the security settings for your n8n instance based on your needs. See: ${ENV_VARS_DOCS_URL}`,
			settings: securitySettings,
		});
	}

	return report;
}
