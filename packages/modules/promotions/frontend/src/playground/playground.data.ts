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
export interface PlaygroundProject {
	id: string;
	name: string;
}

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
const OUTSIDE_ACCESS_SCENARIOS: readonly PlaygroundScenarioId[] = ['a3', 'a4', 'p2'];
const PERSONAL_SCENARIOS: readonly PlaygroundScenarioId[] = ['p3'];
const PERSONAL_NAMES = ['Personal Gmail', 'My Notion token', 'Test Slack bot', 'Sandbox API key'];

/** The workflows that use the dependency at `index`, so the row can link to them. */
function consumersOf(
	index: number,
	workflows: number,
	project: PlaygroundProject,
): PromotionBindingConsumer[] {
	const used = Array.from({ length: Math.min(3, workflows) }, (_, step) => {
		const workflow = (index + step) % workflows;
		return { id: `playground-workflow-${workflow}`, name: workflowNameOf(workflow) };
	});
	return [{ project: { id: project.id, name: project.name }, workflows: used }];
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

/** What the user did in this scenario, so that the next preview shows it. */
export interface PlaygroundState {
	/** True after a Promote found that the list had changed. */
	changed?: boolean;
	/** The names of the credentials and variables that the user created. */
	resolved?: ReadonlySet<string>;
}

/**
 * A project whose changes have no missing dependencies: every credential, variable and data table
 * that a workflow uses is part of the preview. `changed` is true after the list changed under
 * the user, which only the scenario "The list changes before you promote" uses.
 */
export function buildPlaygroundPreview(
	scenario: PlaygroundScenarioId,
	direction: PromotionDirection,
	size: PlaygroundSize,
	project: PlaygroundProject,
	{ changed = false, resolved = new Set<string>() }: PlaygroundState = {},
): PromotionPreview {
	const amount = AMOUNTS[size];
	const projectKey = `project:${project.id}`;
	const resources: PromotionResource[] = [resource(projectKey, project.name)];
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
		// Apply always carries a check. Promote carries one only when something is outside the access
		// of the user, which is the only issue that a Promote can have.
		...(direction === 'apply' || hasPromoteIssues(scenario, changed)
			? { check: buildCheck(scenario, size, amount.workflows, project, { changed, resolved }) }
			: {}),
		revision: PREVIEW_REVISION,
	};
}

function hasPromoteIssues(scenario: PlaygroundScenarioId, changed: boolean) {
	return (
		OUTSIDE_ACCESS_SCENARIOS.includes(scenario) ||
		PERSONAL_SCENARIOS.includes(scenario) ||
		(scenario === 'p4' && changed)
	);
}

/** The check: what the destination lacks, and who can resolve it. */
function buildCheck(
	scenario: PlaygroundScenarioId,
	size: PlaygroundSize,
	workflows: number,
	project: PlaygroundProject,
	{ changed = false, resolved = new Set<string>() }: PlaygroundState,
) {
	const count = ISSUE_AMOUNTS[size];
	const allMissing = NEEDS_ACTION_SCENARIOS.includes(scenario)
		? Array.from({ length: count }, (_, index) => {
				const consumers = consumersOf(index, workflows, project);
				// Credentials and variables alternate, as in a real branch.
				if (index % 2 === 0) {
					const credential = Math.floor(index / 2);
					return {
						kind: 'credential' as const,
						// The create action saves the credential under this id, and ids hold at most 16 characters.
						sourceId: `pg-credential-${credential}`,
						name: nameAt(MISSING_CREDENTIAL_NAMES, credential),
						credentialType: 'httpHeaderAuth',
						consumers,
						ownerProject: { id: project.id, name: project.name },
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
	// A credential or variable that the user created is no longer missing.
	const missingBindings = allMissing.filter(({ name }) => !resolved.has(name));
	const outside: PromotionOutsideAccessDependency[] =
		OUTSIDE_ACCESS_SCENARIOS.includes(scenario) || (scenario === 'p4' && changed)
			? Array.from({ length: count }, (_, index) => ({
					...outsideNameAt(index),
					consumers: consumersOf(index + 1, workflows, project),
				}))
			: [];
	const personal: PromotionOutsideAccessDependency[] = PERSONAL_SCENARIOS.includes(scenario)
		? Array.from({ length: count }, (_, index) => ({
				kind: 'credential' as const,
				name:
					index >= PERSONAL_NAMES.length
						? `${nameAt(PERSONAL_NAMES, index)} ${index + 1}`
						: nameAt(PERSONAL_NAMES, index),
				reason: 'personal' as const,
				consumers: consumersOf(index, workflows, project),
			}))
		: [];
	const outsideAccess = [...outside, ...personal];
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

const outsideNameAt = (index: number) => {
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
