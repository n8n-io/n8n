/**
 * Every page a project has. The navigation of all six variants is built from
 * this list, so a page added here appears in each of them.
 */

export type ResourcePageId =
	| 'workflows'
	| 'credentials'
	| 'executions'
	| 'variables'
	| 'data-tables';

export type SettingsPageId =
	| 'general'
	| 'members'
	| 'node-and-credential-access'
	| 'execution-limits'
	| 'external-secrets'
	| 'audit-log'
	| 'self-healing'
	| 'workers'
	| 'opentelemetry';

export type ProjectPageId = ResourcePageId | SettingsPageId;

/** The instance settings group names a project's pages sit under. */
export type SettingsGroupId = 'people' | 'ai' | 'security' | 'operations';

export interface Counterpart {
	/** The instance page's name, as its sidebar entry reads. */
	label: string;
	/** Slug of the instance page: `/settings/:page`. */
	instancePage: string;
	/** Section of that page to scroll to. */
	section?: string;
}

export interface ProjectPageDef {
	id: ProjectPageId;
	label: string;
	icon: string;
	description: string;
	group?: SettingsGroupId;
	counterpart?: Counterpart;
}

/** Labels are master's tab labels. */
export const RESOURCE_PAGES: ProjectPageDef[] = [
	{
		id: 'workflows',
		label: 'Workflows',
		icon: 'workflow',
		description: 'The workflows this project owns.',
	},
	{
		id: 'credentials',
		label: 'Credentials',
		icon: 'key-round',
		description: "Credentials this project's workflows can use.",
	},
	{
		id: 'executions',
		label: 'Executions',
		icon: 'list-checks',
		description: "Every execution of this project's workflows.",
	},
	{
		id: 'variables',
		label: 'Variables',
		icon: 'variable',
		description: "Values this project's workflows can read.",
	},
	{
		id: 'data-tables',
		label: 'Data tables',
		icon: 'table',
		description: "Tables this project's workflows can read and write.",
	},
];

/**
 * The settings pages, in the order of spec table 5.1. Icons match the
 * counterpart's entry in instance settings wherever there is one.
 */
export const SETTINGS_PAGES: ProjectPageDef[] = [
	{
		id: 'general',
		label: 'General',
		icon: 'settings',
		description: "The project's name, icon, and description.",
	},
	{
		id: 'members',
		label: 'Members',
		icon: 'users',
		description: 'Who can work in this project, and what they can do.',
		group: 'people',
		counterpart: { label: 'Users', instancePage: 'users' },
	},
	{
		id: 'node-and-credential-access',
		label: 'Node and credential access',
		icon: 'shield',
		description: "The nodes and credential types this project's workflows can use.",
		group: 'security',
		counterpart: {
			label: 'Project policies',
			instancePage: 'policies',
			section: 'node-and-credential-policies',
		},
	},
	{
		id: 'execution-limits',
		label: 'Execution limits',
		icon: 'gauge',
		description: 'How many executions this project can run.',
		group: 'security',
		counterpart: {
			label: 'Project policies',
			instancePage: 'policies',
			section: 'execution-limits',
		},
	},
	{
		id: 'external-secrets',
		label: 'External secrets',
		icon: 'vault',
		description: "The secrets vaults this project's credentials can read from.",
		group: 'security',
		counterpart: { label: 'External secrets', instancePage: 'external-secrets' },
	},
	{
		id: 'audit-log',
		label: 'Audit log',
		icon: 'scroll-text',
		description: 'Changes to this project and its settings.',
		group: 'security',
		counterpart: { label: 'Audit log', instancePage: 'audit-log' },
	},
	{
		id: 'self-healing',
		label: 'Self-healing',
		icon: 'wand-sparkles',
		description: 'Let the Assistant investigate failed executions and suggest a fix.',
		group: 'ai',
		counterpart: { label: 'Assistant', instancePage: 'assistant' },
	},
	{
		id: 'workers',
		label: 'Workers',
		icon: 'wrench',
		description: "The worker pool that runs this project's executions.",
		group: 'operations',
		counterpart: { label: 'Workers', instancePage: 'workers' },
	},
	{
		id: 'opentelemetry',
		label: 'OpenTelemetry',
		icon: 'telescope',
		description: "Tracing for this project's executions.",
		group: 'operations',
		counterpart: { label: 'OpenTelemetry', instancePage: 'opentelemetry' },
	},
];

/** Master's instance settings group titles, in the instance's order. */
export const SETTINGS_GROUPS: Array<{ id: SettingsGroupId; title: string }> = [
	{ id: 'people', title: 'People & access' },
	{ id: 'ai', title: 'AI' },
	{ id: 'security', title: 'Security' },
	{ id: 'operations', title: 'Operations' },
];

export const PROJECT_PAGES: ProjectPageDef[] = [...RESOURCE_PAGES, ...SETTINGS_PAGES];

const PAGES_BY_ID = new Map(PROJECT_PAGES.map((page) => [page.id, page]));

export function projectPage(id: ProjectPageId): ProjectPageDef {
	const page = PAGES_BY_ID.get(id);
	if (!page) throw new Error(`Unknown project page: ${id}`);
	return page;
}

export function isProjectPageId(value: string): value is ProjectPageId {
	return PAGES_BY_ID.has(value as ProjectPageId);
}

/** Pages under `/projects/:projectId/:resource`. Members has a top-level URL in every variant. */
export const TOP_LEVEL_PAGE_IDS: ProjectPageId[] = [
	...RESOURCE_PAGES.map((page) => page.id),
	'members',
];

/** Pages under `/projects/:projectId/settings/:page`. */
export const NESTED_SETTINGS_PAGE_IDS: ProjectPageId[] = SETTINGS_PAGES.filter(
	(page) => page.id !== 'members',
).map((page) => page.id);
