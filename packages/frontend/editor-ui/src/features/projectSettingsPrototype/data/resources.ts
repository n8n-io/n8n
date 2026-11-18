import { usableCredentialIds, usableNodeIds } from './access';
import { CREDENTIAL_TYPES } from './catalog';
import { intBetween, pick, sample, seeded } from './random';
import { DAY, HOUR, MINUTE, NOW } from './time';
import type {
	Credential,
	DataTable,
	Execution,
	ExecutionStatus,
	Variable,
	Workflow,
} from './types';

const WORKFLOW_NAMES: Record<string, string[]> = {
	marketing: [
		'Route new leads to HubSpot',
		'Weekly campaign performance digest',
		'Sync webinar signups to Mailchimp',
		'Enrich inbound leads',
		'Post launch updates to Slack',
		'Clean up UTM parameters',
		'Sync newsletter audience',
		'Score leads from form submissions',
		'Notify sales on demo requests',
		'Backfill campaign costs to BigQuery',
		'Send event follow-up emails',
		'Collect social mentions in Notion',
		'Monthly attribution report',
		'Content calendar reminders',
		'Sync unsubscribes across tools',
		'Watch competitor pricing pages',
		'Draft ad copy variants',
		'Tag leads by region',
		'Archive finished campaigns',
		'Summarize survey responses',
		'Refresh audience segments',
		'Alert on budget overspend',
		'Publish blog posts to social',
		'Review landing page forms',
	],
	engineering: [
		'Page on-call on failed deploys',
		'Triage Sentry issues to Linear',
		'Nightly database backup check',
		'Stale pull request reminder',
		'Post GitHub releases to Slack',
		'Rotate staging API keys',
		'Write incident timeline to Notion',
		'Flaky test report',
		'Dependency update digest',
		'Provision preview environments',
		'Close stale Linear issues',
		'Update the status page',
		'AWS cost anomaly alert',
		'Weekly delivery metrics',
		'Sync feature flags to docs',
		'Label new GitHub issues',
		'Check certificate expiry',
		'Queue depth alert',
		'Summarize on-call handoff',
		'Mirror releases to GitLab',
		'Collect build times',
		'Clean up preview environments',
		'Review access requests',
		'Notify on schema changes',
	],
	finance: [
		'Match Stripe payouts to invoices',
		'Month-end close checklist',
		'Chase overdue invoices',
		'Sync expenses to QuickBooks',
		'Daily cash position report',
		'Flag duplicate vendor payments',
		'Refresh currency rates',
		'Approve purchase orders in Slack',
		'Export revenue recognition data',
		'Vendor onboarding intake',
		'Payroll variance check',
		'Tax document reminders',
		'Reconcile card transactions',
		'Budget against actuals digest',
		'Collect receipts from email',
		'Post refunds to the ledger',
		'Renewal invoice batch',
		'Alert on failed payments',
		'Archive closed periods',
		'Audit expense categories',
		'Forecast monthly burn',
		'Sync subscriptions to Sheets',
		'Check vendor bank details',
		'Summarize aging receivables',
	],
	'customer-success': [
		'Onboarding kickoff sequence',
		'Renewal reminder 90 days out',
		'Refresh account health scores',
		'Escalate at-risk accounts',
		'Post NPS responses to Slack',
		'Sync Zendesk tickets to Salesforce',
		'Pull data for business reviews',
		'Welcome email for new admins',
		'Weekly churn risk digest',
		'Triage feature requests',
		'Follow up on low CSAT',
		'Alert on usage drops',
		'Schedule check-in calls',
		'Log calls to the CRM',
		'Tag accounts by plan',
		'Share release notes with customers',
		'Collect testimonials',
		'Route escalations to on-call',
		'Summarize support conversations',
		'Track onboarding milestones',
		'Notify on contract changes',
		'Clean up inactive contacts',
		'Draft renewal quotes',
		'Send training invitations',
	],
};

const GENERIC_WORKFLOW_NAMES = [
	'Sync records to Google Sheets',
	'Daily summary to Slack',
	'Process inbound webhooks',
	'Weekly report email',
	'Escalate overdue tasks',
	'Archive old records',
	'Validate form submissions',
	'Notify on status change',
	'Import CSV uploads',
	'Clean up duplicates',
	'Send reminder emails',
	'Update the CRM from a spreadsheet',
	'Back up data to S3',
	'Monitor API uptime',
	'Route requests by region',
	'Classify inbound email',
	'Generate the monthly batch',
	'Approval request flow',
	'Enrich contacts',
	'Post digest to Teams',
	'Translate replies',
	'Tag records with AI',
	'Sync calendar events',
	'Export the audit trail',
	'Collect feedback responses',
	'Refresh dashboard data',
	'Alert on failed jobs',
	'Hand off to the next team',
	'Summarize long threads',
	'Check data quality',
	'Rotate access keys',
	'Mirror tickets between tools',
];

/** Most workflows start from one of these, so they dominate usage counts. */
const COMMON_NODE_IDS = ['slack', 'http-request', 'code', 'google-sheets', 'webhook', 'gmail'];

function memoize<T>(create: (projectId: string) => T): (projectId: string) => T {
	const cache = new Map<string, T>();
	return (projectId) => {
		let value = cache.get(projectId);
		if (value === undefined) {
			value = create(projectId);
			cache.set(projectId, value);
		}
		return value;
	};
}

export const workflowsFor = memoize((projectId: string): Workflow[] => {
	const next = seeded(`workflows:${projectId}`);
	const names = WORKFLOW_NAMES[projectId] ?? GENERIC_WORKFLOW_NAMES;
	const chosen = sample(next, names, intBetween(next, 6, 24));
	// Seeded workflows only use nodes the project may use, so nothing starts out broken.
	const usableIds = usableNodeIds(projectId);
	const commonIds = COMMON_NODE_IDS.filter((id) => usableIds.includes(id));
	let updatedAt = NOW - intBetween(next, 4, 50) * MINUTE;

	return chosen.map((name, index) => {
		const workflow: Workflow = {
			id: `${projectId}-wf-${index + 1}`,
			projectId,
			name,
			active: next() < 0.7,
			updatedAt,
			createdAt: updatedAt - intBetween(next, 3, 240) * DAY,
			nodeTypeIds: [
				...new Set([pick(next, commonIds), ...sample(next, usableIds, intBetween(next, 1, 4))]),
			],
		};
		// Each next workflow was touched a little longer ago: the list reads newest first.
		updatedAt -= intBetween(next, 1, 60) * HOUR;
		return workflow;
	});
});

/** "Slack OAuth2 API" → "Slack account", as n8n names a new credential. */
function credentialName(typeName: string): string {
	return `${typeName.replace(/ (OAuth2 API|API|Personal Access Token|App Token)$/, '')} account`;
}

export const credentialsFor = memoize((projectId: string): Credential[] => {
	const next = seeded(`credentials:${projectId}`);
	const usableIds = new Set(usableCredentialIds(projectId));
	const types = sample(
		next,
		CREDENTIAL_TYPES.filter((type) => usableIds.has(type.id)),
		intBetween(next, 3, 12),
	);
	return types.map((type, index) => {
		const updatedAt = NOW - intBetween(next, 1, 90) * DAY - intBetween(next, 0, 23) * HOUR;
		return {
			id: `${projectId}-cred-${index + 1}`,
			projectId,
			name: credentialName(type.name),
			typeId: type.id,
			updatedAt,
			createdAt: updatedAt - intBetween(next, 0, 300) * DAY,
		};
	});
});

function executionStatus(roll: number): ExecutionStatus {
	if (roll < 0.76) return 'success';
	if (roll < 0.9) return 'error';
	if (roll < 0.94) return 'running';
	if (roll < 0.97) return 'waiting';
	return 'canceled';
}

export const executionsFor = memoize((projectId: string): Execution[] => {
	const next = seeded(`executions:${projectId}`);
	const workflows = workflowsFor(projectId).filter((workflow) => workflow.active);
	const pool = workflows.length > 0 ? workflows : workflowsFor(projectId);
	let startedAt = NOW - intBetween(next, 1, 6) * MINUTE;

	return Array.from({ length: 30 }, (_, index) => {
		const workflow = pick(next, pool);
		// Only the newest few can still be in flight.
		const rolled = executionStatus(next());
		const status: ExecutionStatus =
			index > 3 && (rolled === 'running' || rolled === 'waiting') ? 'success' : rolled;
		const execution: Execution = {
			id: `${10_000 + Math.floor(seeded(projectId)() * 80_000) - index}`,
			projectId,
			workflowId: workflow.id,
			workflowName: workflow.name,
			status,
			startedAt,
			runTimeMs:
				status === 'running' || status === 'waiting'
					? NOW - startedAt
					: status === 'error'
						? intBetween(next, 200, 12_000)
						: intBetween(next, 300, 48_000),
		};
		startedAt -= intBetween(next, 2, 55) * MINUTE;
		return execution;
	});
});

const VARIABLE_POOL: Array<[string, string]> = [
	['SLACK_CHANNEL_ALERTS', '#automation-alerts'],
	['REPORT_RECIPIENTS', 'team-leads@northwind.example'],
	['API_BASE_URL', 'https://api.northwind.example/v2'],
	['DEFAULT_REGION', 'eu-west-1'],
	['RETRY_LIMIT', '3'],
	['CRM_PIPELINE_ID', '7421903'],
	['REPORT_TIMEZONE', 'Europe/Berlin'],
	['SHEET_ID_SUMMARY', '1mK9pQ2vXc8LrT4nB7yZ'],
	['WEBHOOK_SIGNING_VERSION', 'v1'],
	['ESCALATION_AFTER_HOURS', '24'],
];

export const variablesFor = memoize((projectId: string): Variable[] => {
	const next = seeded(`variables:${projectId}`);
	return sample(next, VARIABLE_POOL, intBetween(next, 2, 6)).map(([key, value], index) => ({
		id: `${projectId}-var-${index + 1}`,
		key,
		value,
	}));
});

const DATA_TABLE_NAMES = [
	'Routing rules',
	'Suppression list',
	'Region mapping',
	'Processed record IDs',
	'Escalation contacts',
	'Scoring weights',
	'Holiday calendar',
	'Run history',
];

export const dataTablesFor = memoize((projectId: string): DataTable[] => {
	const next = seeded(`data-tables:${projectId}`);
	return sample(next, DATA_TABLE_NAMES, intBetween(next, 1, 4)).map((name, index) => ({
		id: `${projectId}-dt-${index + 1}`,
		name,
		rows: intBetween(next, 12, 48_000),
		columns: intBetween(next, 3, 14),
		updatedAt: NOW - intBetween(next, 1, 40) * DAY,
	}));
});

/** How many of the project's workflows use each node type. */
export function nodeUsageFor(projectId: string): Map<string, number> {
	const usage = new Map<string, number>();
	for (const workflow of workflowsFor(projectId)) {
		for (const id of workflow.nodeTypeIds) usage.set(id, (usage.get(id) ?? 0) + 1);
	}
	return usage;
}

/** How many of the project's credentials are of each credential type. */
export function credentialUsageFor(projectId: string): Map<string, number> {
	const usage = new Map<string, number>();
	for (const credential of credentialsFor(projectId)) {
		usage.set(credential.typeId, (usage.get(credential.typeId) ?? 0) + 1);
	}
	return usage;
}
