import type {
	PromotionDirection,
	PromotionPreview,
	PromotionResource,
	PromotionResourceDetail,
	PromotionResourceDependency,
} from '@n8n/api-types';

import type { PlaygroundSize } from './playground.scenarios';

/** Development only. Sample data for the Playground. Nothing here reaches a server. */
export const PLAYGROUND_PROJECT_ID = 'playground-project';

const COMMIT_SHA = 'c'.repeat(40);
const PREVIEW_REVISION = 'a'.repeat(64);

/** How many of each kind a scenario holds at each amount. */
const AMOUNTS: Record<PlaygroundSize, { workflows: number; credentials: number; folders: number }> =
	{
		few: { workflows: 3, credentials: 2, folders: 0 },
		some: { workflows: 8, credentials: 4, folders: 2 },
		many: { workflows: 40, credentials: 12, folders: 4 },
	};

const WORKFLOW_NAMES = [
	'Lead enrichment',
	'Slack standup digest',
	'Invoice sync',
	'Churn alert',
	'Onboarding emails',
	'Weekly report',
	'Support triage',
	'GitHub release notes',
	'CRM cleanup',
	'Backup export',
];
const LONG_WORKFLOW_NAME =
	'Quarterly revenue reconciliation between billing, the data warehouse and the CRM';
const CREDENTIAL_NAMES = [
	'Gmail account',
	'HubSpot API key',
	'Slack OAuth',
	'Stripe',
	'Notion integration',
	'Postgres warehouse',
];
const FOLDER_NAMES = ['Leads', 'Reports', 'Support', 'Finance'];

const resource = (
	key: string,
	name: string,
	overrides: Partial<PromotionResource> = {},
): PromotionResource => {
	const [type, ...idParts] = key.split(':');
	const id = idParts.join(':');
	return {
		key,
		type: type as PromotionResource['type'],
		id,
		name,
		parentKey: null,
		change: 'unchanged',
		selectable: type === 'workflow',
		revision: { before: `${id}-before`, after: `${id}-after` },
		...overrides,
	};
};

const nameAt = (names: readonly string[], index: number, long?: string) =>
	index === 5 && long ? long : (names[index % names.length] ?? `Item ${index}`);

export const workflowKey = (index: number) => `workflow:playground-workflow-${index}`;

/**
 * A project whose changes have no missing dependencies: every credential, variable and data table
 * that a workflow uses is part of the preview.
 */
export function buildPlaygroundPreview(
	direction: PromotionDirection,
	size: PlaygroundSize,
): PromotionPreview {
	const amount = AMOUNTS[size];
	const projectKey = `project:${PLAYGROUND_PROJECT_ID}`;
	const resources: PromotionResource[] = [resource(projectKey, 'Sales')];
	const dependencies: PromotionResourceDependency[] = [];

	const folderKeys = FOLDER_NAMES.slice(0, amount.folders).map((name, index) => {
		const key = `folder:playground-folder-${index}`;
		// Folders give context only, so they have no card of their own.
		resources.push(resource(key, name, { parentKey: projectKey }));
		return key;
	});

	const credentialKeys = Array.from({ length: amount.credentials }, (_, index) => {
		const key = `credential:playground-credential-${index}`;
		const name = nameAt(CREDENTIAL_NAMES, index);
		resources.push(
			resource(key, index >= CREDENTIAL_NAMES.length ? `${name} ${index + 1}` : name, {
				parentKey: projectKey,
			}),
		);
		return key;
	});

	resources.push(
		resource('dataTable:playground-table', 'Leads', { parentKey: projectKey }),
		resource('variable:global:REGION', 'REGION'),
		resource('tag:playground-tag', 'sales'),
	);

	for (let index = 0; index < amount.workflows; index++) {
		const key = workflowKey(index);
		const name = nameAt(WORKFLOW_NAMES, index, LONG_WORKFLOW_NAME);
		const added = index % 3 === 2;
		resources.push(
			resource(key, index >= WORKFLOW_NAMES.length ? `${name} ${index + 1}` : name, {
				parentKey: folderKeys.length > 0 ? folderKeys[index % folderKeys.length] : projectKey,
				change: added ? 'added' : 'modified',
				revision: { before: added ? null : `${key}-before`, after: `${key}-after` },
			}),
		);
		const credentialKey = credentialKeys[index % credentialKeys.length];
		if (credentialKey) {
			dependencies.push({ workflowKey: key, resourceKey: credentialKey, included: true });
		}
		if (index % 3 === 0) {
			dependencies.push({
				workflowKey: key,
				resourceKey: 'dataTable:playground-table',
				included: true,
			});
		}
		if (index % 4 === 0) {
			dependencies.push({
				workflowKey: key,
				resourceKey: 'variable:global:REGION',
				included: true,
			});
		}
	}

	return {
		commitSha: COMMIT_SHA,
		source: { environmentId: 'playground-environment', branchName: 'main' },
		environment: {
			name: direction === 'promote' ? 'Production' : 'Development',
			providerType: 'git',
		},
		resources,
		dependencies,
		// An Apply preview carries the check. Nothing is missing, so each list is empty.
		...(direction === 'apply'
			? {
					check: {
						missingProjects: [],
						missingBindings: [],
						accessRequirements: [],
						conflicts: [],
						warnings: [],
						movedWorkflows: [],
						movedFolders: [],
					},
				}
			: {}),
		revision: PREVIEW_REVISION,
	};
}

/** The content of a workflow on each side, so that its diff has something to show. */
export function buildPlaygroundDetail(
	preview: PromotionPreview,
	key: string,
): PromotionResourceDetail | undefined {
	const item = preview.resources.find((candidate) => candidate.key === key);
	if (!item || item.type !== 'workflow') return undefined;

	const trigger = {
		id: `${item.id}-trigger`,
		name: 'Schedule Trigger',
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1.2,
		position: [0, 0] as [number, number],
		parameters: {},
	};
	const request = {
		id: `${item.id}-request`,
		name: 'HTTP Request',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4.2,
		position: [220, 0] as [number, number],
		parameters: { url: 'https://example.com/api' },
	};
	const workflow = (nodes: Array<typeof trigger | typeof request>) => ({
		id: item.id,
		name: item.name,
		nodes,
		connections:
			nodes.length > 1
				? { [trigger.name]: { main: [[{ node: request.name, type: 'main', index: 0 }]] } }
				: {},
		parentFolderId: null,
		isArchived: false,
	});

	return {
		key,
		type: 'workflow',
		before: item.change === 'added' ? null : workflow([trigger]),
		after: workflow([trigger, request]),
		revision: item.revision,
	};
}
