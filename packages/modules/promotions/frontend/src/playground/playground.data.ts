import type {
	PromotionBindingConsumer,
	PromotionDirection,
	PromotionPreview,
	PromotionResource,
	PromotionResourceDetail,
	PromotionResourceDependency,
} from '@n8n/api-types';

import type { PromotionOutsideAccessDependency } from '../promotions.types';
import type { PlaygroundScenarioId, PlaygroundSize } from './playground.scenarios';

/** Development only. Sample data for the Playground. Nothing here reaches a server. */
export const PLAYGROUND_PROJECT_ID = 'playground-project';
/** A second project that the signed-in user administers, which owns some dependencies. */
const OTHER_PROJECT_KEY = 'project:playground-platform';

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

/** Dependencies that the destination lacks, by scenario. Few, some or many at each amount. */
const ISSUE_AMOUNTS: Record<PlaygroundSize, number> = { few: 2, some: 4, many: 12 };
const MISSING_CREDENTIAL_NAMES = [
	'Salesforce OAuth',
	'Zendesk API',
	'Mailchimp',
	'Airtable token',
	'Jira Cloud',
	'Twilio',
];
const MISSING_VARIABLE_NAMES = ['SLACK_CHANNEL', 'API_BASE_URL', 'TIMEZONE', 'SUPPORT_EMAIL'];
const OUTSIDE_NAMES = [
	{ kind: 'credential', name: 'Billing database' },
	{ kind: 'workflow', name: 'Normalize contact data' },
	{ kind: 'credential', name: 'Finance Stripe key' },
	{ kind: 'workflow', name: 'Send audit log' },
	{ kind: 'credential', name: 'Payroll API' },
	{
		kind: 'workflow',
		name: 'Quarterly revenue reconciliation shared by the billing, finance and data teams',
	},
] as const;
const NEEDS_ACTION_SCENARIOS: readonly PlaygroundScenarioId[] = ['a2', 'a4'];
const OUTSIDE_ACCESS_SCENARIOS: readonly PlaygroundScenarioId[] = ['a3', 'a4'];

/** The workflows that use the dependency at `index`, so the row can link to them. */
function consumersOf(index: number, workflows: number): PromotionBindingConsumer[] {
	const used = Array.from({ length: Math.min(3, workflows) }, (_, step) => {
		const workflow = (index + step) % workflows;
		return { id: `playground-workflow-${workflow}`, name: workflowNameOf(workflow) };
	});
	return [{ project: { id: PLAYGROUND_PROJECT_ID, name: 'Sales' }, workflows: used }];
}

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

const workflowNameOf = (index: number) => {
	const name = nameAt(WORKFLOW_NAMES, index, LONG_WORKFLOW_NAME);
	return index >= WORKFLOW_NAMES.length ? `${name} ${index + 1}` : name;
};

export const workflowKey = (index: number) => `workflow:playground-workflow-${index}`;

/** Scenarios whose credentials come from another project that the user administers. */
const OTHER_PROJECT_SCENARIOS: readonly PlaygroundScenarioId[] = ['p2'];

/**
 * A project whose changes have no missing dependencies: every credential, variable and data table
 * that a workflow uses is part of the preview. In some scenarios, half of the credentials belong
 * to another project that the user administers.
 */
export function buildPlaygroundPreview(
	scenario: PlaygroundScenarioId,
	direction: PromotionDirection,
	size: PlaygroundSize,
): PromotionPreview {
	const fromOtherProject = OTHER_PROJECT_SCENARIOS.includes(scenario);
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
				parentKey: fromOtherProject && index % 2 === 1 ? OTHER_PROJECT_KEY : projectKey,
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
		const added = index % 3 === 2;
		resources.push(
			resource(key, workflowNameOf(index), {
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
		// An Apply preview carries the check. The scenario decides what is in it.
		...(direction === 'apply' ? { check: buildCheck(scenario, size, amount.workflows) } : {}),
		revision: PREVIEW_REVISION,
	};
}

/** The Apply check: what the destination lacks, and who can resolve it. */
function buildCheck(scenario: PlaygroundScenarioId, size: PlaygroundSize, workflows: number) {
	const count = ISSUE_AMOUNTS[size];
	const missingBindings = NEEDS_ACTION_SCENARIOS.includes(scenario)
		? Array.from({ length: count }, (_, index) => {
				const consumers = consumersOf(index, workflows);
				// Credentials and variables alternate, as in a real branch.
				if (index % 2 === 0) {
					const credential = Math.floor(index / 2);
					return {
						kind: 'credential' as const,
						sourceId: `playground-missing-credential-${credential}`,
						name: nameAt(MISSING_CREDENTIAL_NAMES, credential),
						credentialType: 'httpHeaderAuth',
						consumers,
						ownerProject: { id: PLAYGROUND_PROJECT_ID, name: 'Sales' },
					};
				}
				return {
					kind: 'variable' as const,
					name: nameAt(MISSING_VARIABLE_NAMES, Math.floor(index / 2)),
					variableType: 'string' as const,
					scope: { kind: 'global' as const },
					consumers,
				};
			})
		: [];
	const outsideAccess: PromotionOutsideAccessDependency[] = OUTSIDE_ACCESS_SCENARIOS.includes(
		scenario,
	)
		? Array.from({ length: count }, (_, index) => ({
				...nameAt2(index),
				consumers: consumersOf(index + 1, workflows),
			}))
		: [];
	return {
		missingProjects: [],
		missingBindings,
		accessRequirements: [],
		conflicts: [],
		warnings: [],
		movedWorkflows: [],
		movedFolders: [],
		outsideAccess,
	};
}

const nameAt2 = (index: number) => {
	const entry = OUTSIDE_NAMES[index % OUTSIDE_NAMES.length] ?? OUTSIDE_NAMES[0];
	return {
		kind: entry.kind,
		name: index >= OUTSIDE_NAMES.length ? `${entry.name} ${index + 1}` : entry.name,
	};
};

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
