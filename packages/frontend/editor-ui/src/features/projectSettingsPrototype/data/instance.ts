import { asset } from './assets';
import { seedMembers } from './projects';
import { intBetween, pick, sample, seeded } from './random';
import { workflowsFor } from './resources';
import { DAY, HOUR, MINUTE, NOW } from './time';
import type {
	CredentialResolverDef,
	InstanceLimits,
	ProjectLimits,
	ProjectUsage,
	SelfHealingConfig,
	SpanAttribute,
	TracingConfig,
	Vault,
	VaultProvider,
	VaultSecret,
	WorkerPool,
} from './types';

/* ── External secrets ─────────────────────────────────────────────────── */

/** n8n's providers, with its own images, bundled from `assets/provider-icons`. */
export const VAULT_PROVIDERS: VaultProvider[] = [
	{
		id: 'aws-secrets-manager',
		name: 'AWS Secrets Manager',
		image: asset('provider-icons/aws-secrets-manager.svg'),
	},
	{
		id: 'azure-key-vault',
		name: 'Azure Key Vault',
		image: asset('provider-icons/azure-key-vault.svg'),
	},
	{
		id: 'gcp-secrets-manager',
		name: 'GCP Secrets Manager',
		image: asset('provider-icons/gcp-secrets-manager.svg'),
	},
	{ id: 'hashicorp-vault', name: 'HashiCorp Vault', image: asset('provider-icons/hashicorp.webp') },
	{ id: 'infisical', name: 'Infisical', image: asset('provider-icons/infisical.webp') },
	{ id: 'one-password', name: '1Password', image: asset('provider-icons/one-password.svg') },
];

const providersById = new Map(VAULT_PROVIDERS.map((provider) => [provider.id, provider]));

export function vaultProviderById(id: string): VaultProvider {
	const found = providersById.get(id);
	if (!found) throw new Error(`Unknown vault provider: ${id}`);
	return found;
}

const secret = (name: string, usedInCredentials: number): VaultSecret => ({
	name,
	usedInCredentials,
});

/**
 * Vaults the instance owns. A vault's name is what an expression refers to
 * (`$secrets.awsProduction.…`), so names are identifiers, as on master.
 */
export const INSTANCE_VAULTS: Vault[] = [
	{
		id: 'vault-aws-production',
		name: 'awsProduction',
		provider: 'aws-secrets-manager',
		scope: 'everyone',
		projectIds: [],
		secrets: [
			secret('slack_bot_token', 3),
			secret('postgres_reporting_password', 2),
			secret('sendgrid_api_key', 1),
			secret('snowflake_service_key', 1),
			secret('pagerduty_routing_key', 0),
			secret('webhook_signing_secret', 4),
		],
	},
	{
		id: 'vault-gtm',
		name: 'gtmVault',
		provider: 'hashicorp-vault',
		scope: 'shared',
		projectIds: ['marketing', 'growth-emea', 'sales-dach', 'revenue-operations-apac'],
		secrets: [
			secret('hubspot_app_token', 2),
			secret('mailchimp_api_key', 1),
			secret('salesforce_refresh_token', 1),
			secret('google_ads_developer_token', 0),
		],
	},
	{
		id: 'vault-finance',
		name: 'financeKeyVault',
		provider: 'azure-key-vault',
		scope: 'shared',
		projectIds: ['finance', 'procurement-automation', 'compliance-internal'],
		secrets: [
			secret('quickbooks_client_secret', 1),
			secret('stripe_restricted_key', 2),
			secret('bank_sftp_password', 1),
		],
	},
	{
		id: 'vault-platform',
		name: 'platformInfisical',
		provider: 'infisical',
		scope: 'shared',
		projectIds: ['engineering', 'platform-integrations', 'security-onboarding', 'it-migration'],
		secrets: [
			secret('github_app_private_key', 2),
			secret('aws_deploy_role_key', 1),
			secret('sentry_auth_token', 1),
			secret('datadog_api_key', 3),
			secret('linear_api_key', 1),
		],
	},
];

const PROJECT_VAULT_PROVIDERS = [
	'gcp-secrets-manager',
	'aws-secrets-manager',
	'hashicorp-vault',
	'one-password',
	'infisical',
];

const PROJECT_SECRET_NAMES = [
	'api_key',
	'client_secret',
	'webhook_token',
	'service_account_key',
	'refresh_token',
	'signing_secret',
	'sftp_password',
	'partner_api_key',
	'smtp_password',
	'export_bucket_key',
];

const camel = (id: string) =>
	id.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());

const HAND_WRITTEN_PROJECT_VAULTS: Record<string, Vault[]> = {
	marketing: [
		{
			id: 'vault-marketing-campaigns',
			name: 'marketingCampaigns',
			provider: 'gcp-secrets-manager',
			scope: 'project',
			projectIds: ['marketing'],
			secrets: [
				secret('meta_ads_access_token', 2),
				secret('linkedin_ads_client_secret', 1),
				secret('ga4_service_account_key', 1),
				secret('webinar_platform_api_key', 0),
			],
		},
	],
	engineering: [
		{
			id: 'vault-engineering-ci',
			name: 'engineeringCi',
			provider: 'one-password',
			scope: 'project',
			projectIds: ['engineering'],
			secrets: [secret('npm_publish_token', 1), secret('preview_env_deploy_key', 2)],
		},
	],
	finance: [],
	'customer-success': [],
};

/** Vaults added inside a project. About one generated project in three has one. */
export function seedProjectVaults(projectId: string): Vault[] {
	const written = HAND_WRITTEN_PROJECT_VAULTS[projectId];
	if (written) {
		return written.map((vault) => ({
			...vault,
			projectIds: [...vault.projectIds],
			secrets: vault.secrets.map((entry) => ({ ...entry })),
		}));
	}

	const next = seeded(`vaults:${projectId}`);
	if (next() >= 0.34) return [];
	return [
		{
			id: `vault-${projectId}`,
			name: `${camel(projectId)}Secrets`,
			provider: pick(next, PROJECT_VAULT_PROVIDERS),
			scope: 'project',
			projectIds: [projectId],
			secrets: sample(next, PROJECT_SECRET_NAMES, intBetween(next, 2, 5)).map((name) =>
				secret(name, intBetween(next, 0, 3)),
			),
		},
	];
}

/* ── Credential resolvers ─────────────────────────────────────────────── */

/** Types are master's: N8N Resolver, OAuth2 Resolver, Slack Resolver. */
export const CREDENTIAL_RESOLVERS: CredentialResolverDef[] = [
	{
		id: 'resolver-okta',
		name: 'Okta identity',
		type: 'OAuth2 Resolver',
		updatedAt: NOW - 19 * DAY,
	},
	{
		id: 'resolver-slack',
		name: 'Slack workspace users',
		type: 'Slack Resolver',
		updatedAt: NOW - 6 * DAY,
	},
	{
		id: 'resolver-n8n',
		name: 'n8n users',
		type: 'N8N Resolver',
		updatedAt: NOW - 44 * DAY,
	},
];

/** The resolver a project uses unless it picks its own. */
export const INSTANCE_RESOLVER_ID = 'resolver-okta';

const HAND_WRITTEN_RESOLVERS: Record<string, string | undefined> = {
	// Marketing's workflows are triggered from Slack, so it resolves by Slack user.
	marketing: 'resolver-slack',
	engineering: undefined,
	finance: undefined,
	'customer-success': 'resolver-slack',
};

/** The resolver the project picked, or `undefined` when it follows the instance. */
export function seedResolver(projectId: string): string | undefined {
	if (projectId in HAND_WRITTEN_RESOLVERS) return HAND_WRITTEN_RESOLVERS[projectId];
	const next = seeded(`resolver:${projectId}`);
	if (next() >= 0.14) return undefined;
	return pick(next, ['resolver-slack', 'resolver-n8n']);
}

/* ── Worker pools ─────────────────────────────────────────────────────── */

/** Pool names are the ones workers register with, so they're identifiers. */
export const WORKER_POOLS: WorkerPool[] = [
	{
		id: 'high-memory',
		name: 'high-memory',
		description: 'Large payloads and binary data',
		workersOnline: 4,
		workersTotal: 4,
		runningExecutions: 11,
	},
	{
		id: 'eu-central',
		name: 'eu-central',
		description: 'Runs in Frankfurt, for data that stays in the EU',
		workersOnline: 6,
		workersTotal: 6,
		runningExecutions: 23,
	},
	{
		id: 'gpu',
		name: 'gpu',
		description: 'Model inference and media processing',
		workersOnline: 1,
		workersTotal: 2,
		runningExecutions: 3,
	},
	{
		id: 'batch',
		name: 'batch',
		description: 'Long scheduled jobs, kept away from webhooks',
		workersOnline: 3,
		workersTotal: 3,
		runningExecutions: 7,
	},
];

/** The default queue's own workers, for the same health line a pool gets. */
export const DEFAULT_QUEUE: WorkerPool = {
	id: 'default',
	name: 'Default queue',
	description: 'Every execution that no pool is chosen for',
	workersOnline: 12,
	workersTotal: 12,
	runningExecutions: 38,
};

const poolsById = new Map(WORKER_POOLS.map((pool) => [pool.id, pool]));

export function workerPoolById(id: string): WorkerPool | undefined {
	return poolsById.get(id);
}

const HAND_WRITTEN_POOLS: Record<string, string | undefined> = {
	marketing: undefined,
	engineering: 'high-memory',
	finance: 'eu-central',
	'customer-success': undefined,
};

/** The pool the project picked, or `undefined` for the default queue. */
export function seedWorkerPool(projectId: string): string | undefined {
	if (projectId in HAND_WRITTEN_POOLS) return HAND_WRITTEN_POOLS[projectId];
	const next = seeded(`pool:${projectId}`);
	if (next() >= 0.18) return undefined;
	return pick(next, WORKER_POOLS).id;
}

/* ── OpenTelemetry ────────────────────────────────────────────────────── */

export const TRACING: TracingConfig = {
	enabled: true,
	protocol: 'http/protobuf',
	endpoint: 'https://otel.northwind.example',
	serviceName: 'n8n-production',
	sampleRate: 0.25,
	includeNodeSpans: true,
	productionOnly: true,
};

/** Attributes the instance adds to every span. A project can't reuse these keys. */
export const INSTANCE_SPAN_ATTRIBUTES: SpanAttribute[] = [
	{ id: 'attr-instance-env', key: 'deployment.environment', value: 'production' },
	{ id: 'attr-instance-namespace', key: 'service.namespace', value: 'northwind-automation' },
];

const HAND_WRITTEN_ATTRIBUTES: Record<string, Array<[string, string]>> = {
	marketing: [
		['team', 'marketing'],
		['cost.center', '4410'],
	],
	engineering: [
		['team', 'engineering'],
		['oncall.rotation', 'platform'],
	],
	finance: [],
	'customer-success': [['team', 'customer-success']],
};

/** The project's own span attributes. About one generated project in four has any. */
export function seedSpanAttributes(projectId: string): SpanAttribute[] {
	const toAttribute = ([key, value]: [string, string], index: number): SpanAttribute => ({
		id: `attr-${projectId}-${index + 1}`,
		key,
		value,
	});

	const written = HAND_WRITTEN_ATTRIBUTES[projectId];
	if (written) return written.map(toAttribute);

	const next = seeded(`attributes:${projectId}`);
	if (next() >= 0.26) return [];
	const [team] = projectId.split('-');
	const pairs: Array<[string, string]> = [['team', team]];
	if (next() < 0.5) pairs.push(['cost.center', String(intBetween(next, 1100, 9800))]);
	return pairs.map(toAttribute);
}

/* ── Execution limits ─────────────────────────────────────────────────── */

export const INSTANCE_LIMITS: InstanceLimits = {
	monthlyExecutions: 500_000,
	concurrency: 100,
	alertAtPercent: 80,
};

const HAND_WRITTEN_LIMITS: Record<string, ProjectLimits> = {
	marketing: { monthlyExecutions: 40_000, concurrency: 20 },
	engineering: { monthlyExecutions: null, concurrency: null },
	finance: { monthlyExecutions: 15_000, concurrency: null },
	'customer-success': { monthlyExecutions: 25_000, concurrency: 10 },
};

const HAND_WRITTEN_USAGE: Record<string, ProjectUsage> = {
	marketing: { executionsThisMonth: 27_340, runningNow: 6 },
	engineering: { executionsThisMonth: 48_120, runningNow: 14 },
	finance: { executionsThisMonth: 9_870, runningNow: 2 },
	// Past the alert threshold, so one seeded project shows the warning state.
	'customer-success': { executionsThisMonth: 21_460, runningNow: 5 },
};

/** Production executions the project has run this month, and how many run now. */
export function seedUsage(projectId: string): ProjectUsage {
	const written = HAND_WRITTEN_USAGE[projectId];
	if (written) return { ...written };
	const next = seeded(`usage:${projectId}`);
	return {
		executionsThisMonth: intBetween(next, 80, 1_400),
		runningNow: next() < 0.6 ? 0 : intBetween(next, 1, 4),
	};
}

const GENERATED_MONTHLY_LIMITS = [1_000, 2_500, 5_000, 10_000];

/** The limit instance admins gave the project. About one generated project in four has one. */
export function seedProjectLimits(projectId: string): ProjectLimits {
	const written = HAND_WRITTEN_LIMITS[projectId];
	if (written) return { ...written };

	const next = seeded(`limits:${projectId}`);
	if (next() >= 0.26) return { monthlyExecutions: null, concurrency: null };
	const used = seedUsage(projectId).executionsThisMonth;
	// The smallest round limit the project is still under.
	const monthly =
		GENERATED_MONTHLY_LIMITS.find((limit) => limit > used * 1.15) ??
		GENERATED_MONTHLY_LIMITS[GENERATED_MONTHLY_LIMITS.length - 1];
	return { monthlyExecutions: monthly, concurrency: next() < 0.4 ? 5 : null };
}

/* ── Self-healing ─────────────────────────────────────────────────────── */

/** The Assistant's workflow suggestions, which self-healing depends on. */
export const SELF_HEALING_ENABLED = true;

function marketingSelfHealing(): SelfHealingConfig[] {
	const workflows = workflowsFor('marketing');
	return [
		{
			id: 'sh-marketing-1',
			scope: 'selected',
			workflowIds: workflows.slice(0, 3).map((workflow) => workflow.id),
			reviewerIds: ['u-tomas'],
			lastActivityAt: NOW - 3 * DAY - 4 * HOUR,
			enabled: true,
		},
		{
			id: 'sh-marketing-2',
			scope: 'all',
			workflowIds: [],
			reviewerIds: ['u-sofia', 'u-priya'],
			lastActivityAt: NOW - 2 * HOUR - 12 * MINUTE,
			enabled: true,
		},
	];
}

/**
 * Self-healing configurations, as in master's table. Finance has none, so
 * one hand-written project shows the "Set up self-healing" empty state.
 */
export function seedSelfHealing(projectId: string): SelfHealingConfig[] {
	if (projectId === 'marketing') return marketingSelfHealing();
	if (projectId === 'finance') return [];

	const next = seeded(`self-healing:${projectId}`);
	const handWritten = projectId === 'engineering' || projectId === 'customer-success';
	if (!handWritten && next() >= 0.3) return [];

	// Reviewers come from the project, admin first.
	const members = seedMembers(projectId);
	return [
		{
			id: `sh-${projectId}-1`,
			scope: 'all',
			workflowIds: [],
			reviewerIds: members.slice(0, intBetween(next, 1, 2)).map((member) => member.userId),
			lastActivityAt: next() < 0.75 ? NOW - intBetween(next, 1, 20) * DAY : undefined,
			enabled: next() < 0.85,
		},
	];
}
