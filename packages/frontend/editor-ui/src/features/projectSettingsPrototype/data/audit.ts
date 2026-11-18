import { seedMembers } from './projects';
import { intBetween, pick, seeded } from './random';
import { DAY, HOUR, MINUTE, NOW } from './time';
import type { AuditCategory, AuditEvent } from './types';
import { CURRENT_USER_ID } from './users';

/** Master has no audit log yet, so these names are the prototype's. */
export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
	project: 'Project',
	members: 'Members',
	access: 'Node and credential access',
	limits: 'Execution limits',
	secrets: 'External secrets',
	'self-healing': 'Self-healing',
	workers: 'Workers',
	tracing: 'OpenTelemetry',
};

type Seed = [
	ago: number,
	actorId: string,
	category: AuditCategory,
	action: string,
	target: string,
	projectId?: string,
];

const ago = (days: number, hours = 0, minutes = 0) => days * DAY + hours * HOUR + minutes * MINUTE;

/**
 * Marketing's history explains its seeded state: every override on its
 * settings pages has the event that made it.
 */
const MARKETING: Seed[] = [
	[
		ago(0, 2, 12),
		'u-sofia',
		'self-healing',
		'Edited a self-healing configuration',
		'All other workflows',
	],
	[
		ago(0, 5, 40),
		'u-sofia',
		'members',
		"Changed a member's role",
		'Chloé Dubois to Workflow reviewer',
	],
	[ago(1, 1, 5), 'u-sofia', 'access', 'Restricted a node', 'Telegram'],
	[ago(1, 1, 6), 'u-sofia', 'access', 'Restricted a node', 'Discord'],
	[ago(2, 3, 20), 'u-priya', 'limits', 'Changed the execution limit', '40,000 per month'],
	[ago(3, 4, 0), 'u-sofia', 'self-healing', 'Added a self-healing configuration', '3 workflows'],
	[ago(4, 0, 30), 'u-sofia', 'tracing', 'Added a span attribute', 'cost.center'],
	[ago(4, 0, 32), 'u-sofia', 'tracing', 'Added a span attribute', 'team'],
	[ago(6, 2, 15), 'u-sofia', 'secrets', 'Set the credential resolver', 'Slack workspace users'],
	[ago(8, 6, 0), 'u-sofia', 'members', 'Added a member', 'Kofi Mensah as Credential manager'],
	[ago(9, 1, 45), 'u-sofia', 'access', 'Restricted a credential', 'Stripe API'],
	[ago(11, 3, 10), 'u-sofia', 'access', 'Enabled a credential', 'OpenAI'],
	[ago(11, 3, 12), 'u-sofia', 'access', 'Enabled a node', 'AI Agent'],
	[ago(11, 3, 13), 'u-sofia', 'access', 'Enabled a node', 'OpenAI'],
	[ago(14, 5, 0), 'u-sofia', 'secrets', 'Added a secrets vault', 'marketingCampaigns'],
	[ago(15, 2, 0), 'u-priya', 'secrets', 'Shared a secrets vault with the project', 'gtmVault'],
	[ago(18, 0, 50), 'u-sofia', 'members', 'Removed a member', 'Liam Byrne'],
	[ago(21, 4, 30), 'u-priya', 'limits', 'Set the concurrency limit', '20 at once'],
	[ago(21, 4, 31), 'u-priya', 'limits', 'Set the execution limit', '30,000 per month'],
	[ago(26, 1, 15), 'u-sofia', 'members', 'Added a member', 'Arjun Mehta as Viewer'],
	[ago(33, 3, 0), 'u-sofia', 'project', 'Changed the project description', 'Marketing'],
	[ago(41, 2, 20), CURRENT_USER_ID, 'members', 'Added a member', 'Sofia Rossi as Admin'],
	[ago(41, 2, 25), CURRENT_USER_ID, 'project', 'Created the project', 'Marketing'],
];

/** Changes made in instance settings. They have no project. */
const INSTANCE: Seed[] = [
	[ago(1, 6, 0), 'u-priya', 'workers', 'Registered a worker pool', 'gpu'],
	[ago(5, 2, 30), CURRENT_USER_ID, 'access', 'Left a node for projects to enable', 'AWS Lambda'],
	[ago(7, 1, 10), 'u-priya', 'tracing', 'Changed the trace sample rate', '0.25'],
	[
		ago(12, 4, 0),
		CURRENT_USER_ID,
		'limits',
		'Set the instance execution limit',
		'500,000 per month',
	],
	[ago(16, 3, 40), 'u-priya', 'secrets', 'Added a credential resolver', 'Slack workspace users'],
	[ago(19, 5, 15), 'u-priya', 'secrets', 'Added a credential resolver', 'Okta identity'],
	[ago(24, 2, 0), CURRENT_USER_ID, 'access', 'Left a node for projects to enable', 'Anthropic'],
	[ago(24, 2, 2), CURRENT_USER_ID, 'access', 'Left a node for projects to enable', 'OpenAI'],
	[ago(37, 1, 0), 'u-priya', 'secrets', 'Connected a secrets vault', 'awsProduction'],
	[ago(52, 3, 30), CURRENT_USER_ID, 'access', 'Restricted a node', 'Execute Command'],
	[ago(52, 3, 31), CURRENT_USER_ID, 'access', 'Restricted a credential', 'SSH Private Key'],
	[ago(58, 2, 0), CURRENT_USER_ID, 'tracing', 'Turned on OpenTelemetry', 'n8n-production'],
];

const OTHER_PROJECTS: Seed[] = [
	[ago(0, 0, 48), 'u-daniel', 'workers', 'Set the worker pool', 'high-memory', 'engineering'],
	[ago(0, 7, 20), 'u-daniel', 'access', 'Enabled a node', 'AWS Lambda', 'engineering'],
	[ago(2, 0, 15), 'u-daniel', 'secrets', 'Added a secrets vault', 'engineeringCi', 'engineering'],
	[ago(3, 5, 5), 'u-daniel', 'members', 'Added a member', 'Ethan Park as Editor', 'engineering'],
	[
		ago(5, 6, 40),
		'u-daniel',
		'tracing',
		'Added a span attribute',
		'oncall.rotation',
		'engineering',
	],
	[
		ago(10, 2, 0),
		'u-daniel',
		'self-healing',
		'Added a self-healing configuration',
		'All workflows',
		'engineering',
	],
	[ago(13, 1, 30), 'u-daniel', 'access', 'Enabled a credential', 'AWS', 'engineering'],
	[ago(1, 3, 0), 'u-elena', 'workers', 'Set the worker pool', 'eu-central', 'finance'],
	[ago(4, 4, 10), 'u-elena', 'access', 'Restricted a node', 'Shopify', 'finance'],
	[ago(4, 4, 12), 'u-elena', 'access', 'Restricted a node', 'Twilio', 'finance'],
	[ago(9, 0, 20), 'u-priya', 'limits', 'Set the execution limit', '15,000 per month', 'finance'],
	[ago(17, 2, 45), 'u-elena', 'access', 'Restricted a credential', 'Mailchimp API', 'finance'],
	[
		ago(22, 5, 0),
		'u-elena',
		'members',
		"Changed a member's role",
		'Noah Williams to Viewer',
		'finance',
	],
	[ago(0, 9, 30), 'u-nadia', 'access', 'Enabled a node', 'AI Agent', 'customer-success'],
	[
		ago(2, 6, 0),
		'u-nadia',
		'secrets',
		'Set the credential resolver',
		'Slack workspace users',
		'customer-success',
	],
	[
		ago(6, 3, 30),
		'u-priya',
		'limits',
		'Set the execution limit',
		'25,000 per month',
		'customer-success',
	],
	[
		ago(12, 1, 0),
		'u-nadia',
		'members',
		'Added a member',
		'Yuki Nakamura as Editor',
		'customer-success',
	],
	[ago(20, 4, 20), 'u-nadia', 'tracing', 'Added a span attribute', 'team', 'customer-success'],
];

/** What a generated project's admin plausibly did, for the long tail. */
const GENERATED_TEMPLATES: Array<[AuditCategory, string, string[]]> = [
	['access', 'Restricted a node', ['Discord', 'Telegram', 'Twilio', 'Shopify', 'Mailchimp']],
	['access', 'Enabled a node', ['OpenAI', 'Anthropic', 'AI Agent', 'Google Gemini']],
	['workers', 'Set the worker pool', ['high-memory', 'eu-central', 'batch']],
	['tracing', 'Added a span attribute', ['team', 'cost.center']],
	['members', 'Removed a member', ['Liam Byrne', 'Freya Andersson', 'Samuel Adeyemi']],
	['self-healing', 'Added a self-healing configuration', ['All workflows']],
];

const GENERATED_PROJECT_IDS = [
	'growth-emea',
	'sales-dach',
	'support-enterprise',
	'data-staging',
	'platform-integrations',
	'security-onboarding',
	'people-americas',
];

function generated(): Seed[] {
	const next = seeded('audit');
	return GENERATED_PROJECT_IDS.map((projectId): Seed => {
		const [category, action, targets] = pick(next, GENERATED_TEMPLATES);
		// The project's admin made the change.
		const [admin] = seedMembers(projectId);
		return [
			ago(intBetween(next, 0, 28), intBetween(next, 0, 23), intBetween(next, 0, 59)),
			admin.userId,
			category,
			action,
			pick(next, targets),
			projectId,
		];
	});
}

const toEvent = (
	[offset, actorId, category, action, target, projectId]: Seed,
	fallbackProjectId?: string,
): Omit<AuditEvent, 'id'> => ({
	at: NOW - offset,
	actorId,
	category,
	action,
	target,
	projectId: projectId ?? fallbackProjectId,
});

/** Sixty events, newest first: Marketing's history, three other projects, the instance, and a tail. */
export const SEED_AUDIT_EVENTS: AuditEvent[] = [
	...MARKETING.map((seed) => toEvent(seed, 'marketing')),
	...INSTANCE.map((seed) => toEvent(seed)),
	...OTHER_PROJECTS.map((seed) => toEvent(seed)),
	...generated().map((seed) => toEvent(seed)),
]
	.sort((a, b) => b.at - a.at)
	.map((event, index, all) => ({ ...event, id: `evt-${all.length - index}` }));
