import type {
	WorkflowReviewActivityEntry,
	WorkflowReviewEligibleReviewer,
	WorkflowReviewInboxItem,
	WorkflowReviewRequestDecision,
	WorkflowReviewRequestDetail,
	WorkflowReviewRequestState,
	WorkflowReviewVersionSnapshot,
} from '@n8n/api-types';
import type { IConnections, INode } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { SELF_HEALING_ASSISTANT, SELF_HEALING_REVIEW_ID_PREFIX } from './selfHealing.constants';
import type {
	SelfHealingConfig,
	SelfHealingOutcome,
	SelfHealingReview,
	SelfHealingTraceEntry,
	SelfHealingUsage,
} from './selfHealing.types';

/*
 * Everything in this file is demo data. The prototype has no backend, so the
 * store seeds itself from here and builds new records with the helpers below.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function hoursAgo(hours: number, now = Date.now()): string {
	return new Date(now - hours * HOUR_MS).toISOString();
}

export function daysAgo(days: number, now = Date.now()): string {
	return new Date(now - days * DAY_MS).toISOString();
}

/** Small, stable hash so demo states stay put across reloads for the same workflow. */
export function hashString(value: string): number {
	let hash = 5381;
	for (let i = 0; i < value.length; i++) {
		hash = (hash * 33) ^ value.charCodeAt(i);
	}
	return Math.abs(hash >>> 0);
}

/** New configurations notify every project member; `ownerId` is unused but kept for callers. */
export function createDefaultConfig(
	projectId: string,
	_ownerId: string | null,
	now = Date.now(),
): SelfHealingConfig {
	return {
		id: `default-${projectId}`,
		projectId,
		autonomy: 'review',
		scope: 'all',
		selectedWorkflowIds: [],
		customInstructions:
			'Prefer adding retries and guards over changing business logic. Never edit credentials or webhook paths. Keep the fix to the failing branch.',
		notifyProjectMembers: true,
		reviewerIds: [],
		status: 'active',
		createdAt: daysAgo(12, now),
		updatedAt: daysAgo(3, now),
	};
}

export function createEntryIdGenerator(start = 1000): () => string {
	let next = start;
	return () => String(next++);
}

function snapshot(
	versionId: string,
	name: string | null,
	nodes: INode[],
	connections: IConnections,
	createdAt: string,
): WorkflowReviewVersionSnapshot {
	return { versionId, name, nodes, connections, nodeGroups: [], createdAt };
}

function connect(...names: string[]): IConnections {
	const connections: IConnections = {};
	for (let i = 0; i < names.length - 1; i++) {
		connections[names[i]] = {
			main: [[{ node: names[i + 1], type: 'main', index: 0 }]],
		};
	}
	return connections;
}

/**
 * Returns a copy of `nodes` where `nodeName` retries on failure. This is the
 * assistant's default remedy for transient errors such as rate limits.
 */
export function applyRetryFix(nodes: INode[], nodeName: string): INode[] {
	return deepCopy(nodes).map((node) =>
		node.name === nodeName
			? { ...node, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 }
			: node,
	);
}

// ---------------------------------------------------------------------------
// Fixture workflow: lead enrichment (open review, rate limit fix)
// ---------------------------------------------------------------------------

const LEAD_ENRICHMENT_NODES: INode[] = [
	{
		id: 'le-trigger',
		name: 'Every 15 minutes',
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1.2,
		position: [0, 0],
		parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 15 }] } },
	},
	{
		id: 'le-get',
		name: 'Get new leads',
		type: 'n8n-nodes-base.hubspot',
		typeVersion: 2.1,
		position: [220, 0],
		parameters: { resource: 'contact', operation: 'getAll', limit: 100 },
	},
	{
		id: 'le-enrich',
		name: 'Enrich with Clearbit',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4.2,
		position: [440, 0],
		parameters: {
			method: 'GET',
			url: 'https://person.clearbit.com/v2/combined/find',
			sendQuery: true,
			queryParameters: {
				parameters: [{ name: 'email', value: '={{ $json.properties.email }}' }],
			},
		},
	},
	{
		id: 'le-update',
		name: 'Update lead',
		type: 'n8n-nodes-base.hubspot',
		typeVersion: 2.1,
		position: [660, 0],
		parameters: { resource: 'contact', operation: 'update' },
	},
];

const LEAD_ENRICHMENT_CONNECTIONS = connect(
	'Every 15 minutes',
	'Get new leads',
	'Enrich with Clearbit',
	'Update lead',
);

function leadEnrichmentFixedNodes(): INode[] {
	return applyRetryFix(LEAD_ENRICHMENT_NODES, 'Enrich with Clearbit').map((node) =>
		node.name === 'Enrich with Clearbit'
			? {
					...node,
					parameters: {
						...node.parameters,
						options: { batching: { batch: { batchSize: 10, batchInterval: 1000 } } },
					},
				}
			: node,
	);
}

// ---------------------------------------------------------------------------
// Fixture workflow: invoice reminders (approved review, empty-result guard)
// ---------------------------------------------------------------------------

const INVOICE_REMINDER_NODES: INode[] = [
	{
		id: 'ir-trigger',
		name: 'Weekdays at 9:00',
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1.2,
		position: [0, 0],
		parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 9 * * 1-5' }] } },
	},
	{
		id: 'ir-query',
		name: 'Get overdue invoices',
		type: 'n8n-nodes-base.postgres',
		typeVersion: 2.5,
		position: [220, 0],
		parameters: {
			operation: 'executeQuery',
			query: 'SELECT * FROM invoices WHERE due_date < NOW() AND paid = false',
		},
	},
	{
		id: 'ir-send',
		name: 'Send reminder',
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.1,
		position: [440, 0],
		parameters: {
			sendTo: '={{ $json.customer_email }}',
			subject: '=Invoice {{ $json.number }} is overdue',
		},
	},
];

const INVOICE_REMINDER_CONNECTIONS = connect(
	'Weekdays at 9:00',
	'Get overdue invoices',
	'Send reminder',
);

function invoiceReminderFixedNodes(): INode[] {
	const nodes = deepCopy(INVOICE_REMINDER_NODES).map((node) =>
		node.name === 'Get overdue invoices' ? { ...node, alwaysOutputData: true } : node,
	);
	nodes[2] = { ...nodes[2], position: [660, -100] };
	nodes.splice(2, 0, {
		id: 'ir-guard',
		name: 'Has overdue invoices?',
		type: 'n8n-nodes-base.if',
		typeVersion: 2.2,
		position: [440, 0],
		parameters: {
			conditions: {
				conditions: [
					{
						leftValue: '={{ $json.customer_email }}',
						operator: { type: 'string', operation: 'exists' },
					},
				],
			},
		},
	});
	return nodes;
}

const INVOICE_REMINDER_FIXED_CONNECTIONS: IConnections = {
	'Weekdays at 9:00': { main: [[{ node: 'Get overdue invoices', type: 'main', index: 0 }]] },
	'Get overdue invoices': {
		main: [[{ node: 'Has overdue invoices?', type: 'main', index: 0 }]],
	},
	'Has overdue invoices?': { main: [[{ node: 'Send reminder', type: 'main', index: 0 }], []] },
};

// ---------------------------------------------------------------------------
// Review builder
// ---------------------------------------------------------------------------

export interface BuildReviewOptions {
	id: string;
	title: string;
	/** One line for the inbox card. */
	summary: string;
	/** The review's description: the outcome first, then impact, cause and change. */
	description: string;
	/** Body of the assistant's explanatory comment in the activity feed. */
	analysis: string;
	changedNode: string;
	executionId: string | null;
	workflowId: string;
	workflowName: string;
	projectId: string;
	baseline: WorkflowReviewVersionSnapshot;
	pinned: WorkflowReviewVersionSnapshot;
	reviewers: WorkflowReviewEligibleReviewer[];
	createdAt: string;
	usage: SelfHealingUsage | null;
	trace: SelfHealingTraceEntry[];
	/** Who opened the review. Defaults to the assistant; a person makes it a regular review. */
	requester?: WorkflowReviewEligibleReviewer;
	state?: WorkflowReviewRequestState;
	decision?: WorkflowReviewRequestDecision;
	/** When set, appends the approval and the publish to the feed. */
	approval?: { by: WorkflowReviewEligibleReviewer | null; at: string; note: string | null };
}

export function buildSelfHealingReview(
	options: BuildReviewOptions,
	nextEntryId: () => string,
): SelfHealingReview {
	const author = options.requester ?? SELF_HEALING_ASSISTANT;
	const state = options.state ?? 'open';
	const decision = options.decision ?? 'pending';
	const updatedAt = options.approval?.at ?? options.createdAt;
	const workflowVersions = [
		{ workflowId: options.workflowId, workflowVersionId: options.pinned.versionId },
	];

	const item: WorkflowReviewInboxItem = {
		id: options.id,
		state,
		decision,
		workflowVersionId: options.pinned.versionId,
		createdAt: options.createdAt,
		updatedAt,
		projectId: options.projectId,
		title: options.title,
		workflowName: options.workflowName,
		requester: author,
		authors: [author],
		reviewers: [...options.reviewers],
	};

	const detail: WorkflowReviewRequestDetail = {
		id: item.id,
		state,
		decision,
		createdAt: item.createdAt,
		updatedAt,
		projectId: item.projectId,
		title: item.title,
		requester: item.requester,
		authors: item.authors,
		reviewers: item.reviewers,
		description: options.description,
		workflows: [
			{
				workflowId: options.workflowId,
				workflowName: options.workflowName,
				workflowVersionId: options.pinned.versionId,
				pinnedVersion: options.pinned,
				publishedVersionId: options.approval
					? options.pinned.versionId
					: options.baseline.versionId,
				baselineVersion: options.baseline,
			},
		],
		viewerCanDecide: state === 'open',
		viewerDecisionIneligibilityReason: null,
		viewerCanComment: true,
	};

	const activity: WorkflowReviewActivityEntry[] = [
		{
			id: nextEntryId(),
			typeVersion: 1,
			type: 'review.opened',
			createdBy: author,
			createdAt: options.createdAt,
			data: { workflowVersions },
		},
		{
			id: nextEntryId(),
			typeVersion: 1,
			type: 'comment.created',
			createdBy: author,
			createdAt: options.createdAt,
			data: null,
			messages: [
				{
					id: `${options.id}-analysis`,
					body: options.analysis,
					createdBy: author,
					createdAt: options.createdAt,
					updatedAt: null,
					deletedAt: null,
				},
			],
		},
	];

	if (options.approval) {
		activity.push(
			{
				id: nextEntryId(),
				typeVersion: 1,
				type: 'review.approved',
				createdBy: options.approval.by,
				createdAt: options.approval.at,
				data: { workflowVersions, note: options.approval.note },
			},
			{
				id: nextEntryId(),
				typeVersion: 1,
				type: 'workflow.published',
				createdBy: options.approval.by,
				createdAt: options.approval.at,
				data: workflowVersions[0],
			},
		);
	}

	return {
		kind: 'fix',
		usage: options.usage,
		trace: options.trace,
		outcome: null,
		item,
		detail,
		activity,
		summary: options.summary,
		changedNode: options.changedNode,
		executionId: options.executionId,
	};
}

export const SEED_WORKFLOWS = {
	leadEnrichment: { id: 'self-healing-demo-lead-enrichment', name: 'Lead enrichment sync' },
	invoiceReminders: { id: 'self-healing-demo-invoice-reminders', name: 'Invoice reminder emails' },
	dealAlerts: { id: 'self-healing-demo-deal-alerts', name: 'Deal alerts to Slack' },
	orderSync: { id: 'self-healing-demo-order-sync', name: 'Order sync to warehouse' },
	weeklyReport: { id: 'self-healing-demo-weekly-report', name: 'Weekly pipeline report' },
} as const;

/**
 * Two reviews the assistant "already submitted": one waiting for the viewer,
 * one approved and published. Both point at fixture workflows.
 */
export interface BuildOutcomeOptions {
	id: string;
	title: string;
	/** One line for the inbox card. */
	summary: string;
	/** The item's description: the outcome and the user's next step first. */
	description: string;
	/** Body of the assistant's report in the activity feed. */
	analysis: string;
	outcome: SelfHealingOutcome;
	usage: SelfHealingUsage | null;
	trace: SelfHealingTraceEntry[];
	executionId: string;
	workflowId: string;
	workflowName: string;
	projectId: string;
	nodes: INode[];
	reviewers: WorkflowReviewEligibleReviewer[];
	createdAt: string;
}

/**
 * An inbox item that is not a review: the assistant either needs the user to
 * act or gave up. It reuses the review item shape so the inbox lists it and
 * the detail shows the same description and activity, but it carries no diff
 * and nobody can decide on it.
 */
export function buildSelfHealingOutcome(
	options: BuildOutcomeOptions,
	nextEntryId: () => string,
): SelfHealingReview {
	const version = snapshot(
		`${options.workflowId}-published`,
		'Published',
		options.nodes,
		{},
		options.createdAt,
	);

	const item: WorkflowReviewInboxItem = {
		id: options.id,
		state: 'open',
		decision: 'pending',
		workflowVersionId: version.versionId,
		createdAt: options.createdAt,
		updatedAt: options.createdAt,
		projectId: options.projectId,
		title: options.title,
		workflowName: options.workflowName,
		requester: SELF_HEALING_ASSISTANT,
		authors: [SELF_HEALING_ASSISTANT],
		reviewers: [...options.reviewers],
	};

	const detail: WorkflowReviewRequestDetail = {
		id: item.id,
		state: 'open',
		decision: 'pending',
		createdAt: item.createdAt,
		updatedAt: item.updatedAt,
		projectId: item.projectId,
		title: item.title,
		requester: item.requester,
		authors: item.authors,
		reviewers: item.reviewers,
		description: options.description,
		workflows: [
			{
				workflowId: options.workflowId,
				workflowName: options.workflowName,
				workflowVersionId: version.versionId,
				pinnedVersion: version,
				publishedVersionId: version.versionId,
				baselineVersion: version,
			},
		],
		viewerCanDecide: false,
		viewerDecisionIneligibilityReason: null,
		viewerCanComment: true,
	};

	const activity: WorkflowReviewActivityEntry[] = [
		{
			id: nextEntryId(),
			typeVersion: 1,
			type: 'review.opened',
			createdBy: SELF_HEALING_ASSISTANT,
			createdAt: options.createdAt,
			data: {
				workflowVersions: [
					{ workflowId: options.workflowId, workflowVersionId: version.versionId },
				],
			},
		},
		{
			id: nextEntryId(),
			typeVersion: 1,
			type: 'comment.created',
			createdBy: SELF_HEALING_ASSISTANT,
			createdAt: options.createdAt,
			data: null,
			messages: [
				{
					id: `${options.id}-analysis`,
					body: options.analysis,
					createdBy: SELF_HEALING_ASSISTANT,
					createdAt: options.createdAt,
					updatedAt: null,
					deletedAt: null,
				},
			],
		},
	];

	return {
		kind: options.outcome.kind,
		usage: options.usage,
		trace: options.trace,
		outcome: options.outcome,
		item,
		detail,
		activity,
		summary: options.summary,
		changedNode: '',
		executionId: options.executionId,
	};
}

function seedNodes(names: string[], types: string[]): INode[] {
	return names.map((name, index) => ({
		id: `seed-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
		name,
		type: types[index] ?? 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [240 * index, 0],
		parameters: {},
	}));
}

const DEAL_ALERTS_NODES = seedNodes(
	['Every hour', 'Get new deals', 'Post to #sales'],
	['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.hubspot', 'n8n-nodes-base.slack'],
);

const ORDER_SYNC_NODES = seedNodes(
	['New paid order', 'Map shipment', 'Create shipment'],
	['n8n-nodes-base.shopifyTrigger', 'n8n-nodes-base.set', 'n8n-nodes-base.httpRequest'],
);

/** Placeholder teammate who opens the one regular, human-authored review. */
export const SEED_TEAMMATE: WorkflowReviewEligibleReviewer = {
	id: 'seed-teammate-alex',
	email: 'alex.rivera@example.com',
	firstName: 'Alex',
	lastName: 'Rivera',
};

const WEEKLY_REPORT_FIXED_NODES = seedNodes(
	['Every Monday at 8:00', 'Get open deals', 'Summarise by stage', 'Post to #sales'],
	[
		'n8n-nodes-base.scheduleTrigger',
		'n8n-nodes-base.hubspot',
		'n8n-nodes-base.code',
		'n8n-nodes-base.slack',
	],
);

const WEEKLY_REPORT_NODES = WEEKLY_REPORT_FIXED_NODES.filter(
	(node) => node.name !== 'Summarise by stage',
);

export function createSeedReviews(
	reviewer: WorkflowReviewEligibleReviewer | null,
	projectId: string,
	nextEntryId: () => string,
	now = Date.now(),
): SelfHealingReview[] {
	const openedAt = hoursAgo(2, now);
	const invoiceOpenedAt = daysAgo(3, now);
	const invoiceApprovedAt = daysAgo(2, now);
	const reviewers = reviewer ? [reviewer] : [];

	return [
		buildSelfHealingReview(
			{
				id: `${SELF_HEALING_REVIEW_ID_PREFIX}seed-lead-enrichment`,
				description:
					'Fix ready for review. Approving publishes it.\n\nImpact: 14 of 100 new leads were not enriched or updated in the last run.\nCause: Clearbit rate-limited "Enrich with Clearbit" with 429 Too Many Requests.\nChange: turned on Retry On Fail (3 tries, 5 s apart) and batched requests 10 per second. Nothing else changed.\nChecked: replayed the failed execution against the fix. All 100 leads went through.',
				title: 'Auto-fix: Retry Clearbit requests on 429 in Lead enrichment sync',
				summary:
					'Failed: "Enrich with Clearbit" hit 429 Too Many Requests on 14 of 100 items. Changed: enabled Retry On Fail (3 tries, 5 s) and batched requests 10 at a time.',
				analysis:
					'What failed: execution #48213 stopped at "Enrich with Clearbit" with HTTP 429 Too Many Requests. Clearbit allows 600 requests per minute and the node sent 100 in a burst; 14 items were rejected and the run failed before "Update lead" ran.\n\nWhat I changed: turned on Retry On Fail (3 attempts, 5 seconds apart) and set request batching to 10 items every second. No other node or parameter changed.\n\nHow I checked: replayed the failed execution against the fixed version with pinned input data. All 100 items were enriched and updated.',
				changedNode: 'Enrich with Clearbit',
				executionId: '48213',
				workflowId: SEED_WORKFLOWS.leadEnrichment.id,
				workflowName: SEED_WORKFLOWS.leadEnrichment.name,
				projectId,
				baseline: snapshot(
					'le-v7',
					'Published',
					LEAD_ENRICHMENT_NODES,
					LEAD_ENRICHMENT_CONNECTIONS,
					daysAgo(9, now),
				),
				pinned: snapshot(
					'le-v8',
					'Auto-fix: retry on 429',
					leadEnrichmentFixedNodes(),
					LEAD_ENRICHMENT_CONNECTIONS,
					openedAt,
				),
				reviewers,
				createdAt: openedAt,
				usage: { credits: 14, turns: 8, durationSeconds: 240 },
				trace: [
					{ type: 'event', at: 0, label: 'Execution #48213 failed at "Enrich with Clearbit"' },
					{ type: 'event', at: 1, label: 'Pre-check passed. Investigation started' },
					{
						type: 'tool',
						at: 3,
						tool: 'executions',
						label: 'Read failed execution #48213',
						input: { executionId: '48213', include: ['error', 'nodeOutputs'] },
						output:
							'Stopped at "Enrich with Clearbit": 429 Too Many Requests on 14 of 100 items.\n"Get new leads" returned 100 items in one batch.\n"Update lead" did not run.',
					},
					{
						type: 'text',
						at: 20,
						text: 'All 14 failures are 429 responses in the same second. The node sends every item at once, so the burst goes over the rate limit.',
					},
					{
						type: 'tool',
						at: 24,
						tool: 'workflows',
						label: 'Read published workflow "Lead enrichment sync"',
						input: { workflowId: 'self-healing-demo-lead-enrichment', version: 'published' },
						output:
							'4 nodes, published version le-v7.\n"Enrich with Clearbit" is an HTTP Request node with no retry and no batching.',
					},
					{
						type: 'tool',
						at: 41,
						tool: 'research',
						label: 'Search the web: Clearbit Enrichment API rate limit',
						input: { query: 'Clearbit Enrichment API rate limit' },
						output: 'Clearbit allows 600 requests per minute per key and returns 429 above that.',
					},
					{
						type: 'tool',
						at: 70,
						tool: 'n8n-docs',
						label: 'Read n8n docs: HTTP Request batching and retries',
						input: { page: 'HTTP Request node', sections: ['Batching', 'Retry On Fail'] },
						output:
							'Options > Batching: items per batch, batch interval (ms).\nSettings > Retry On Fail: max tries, wait between tries (ms).',
					},
					{
						type: 'text',
						at: 95,
						text: 'Batching 10 items per second keeps the node under the limit. Retry On Fail covers any request that still gets a 429.',
					},
					{
						type: 'tool',
						at: 110,
						tool: 'draft-workflow',
						label: 'Draft a change to "Enrich with Clearbit"',
						input: {
							node: 'Enrich with Clearbit',
							set: {
								retryOnFail: true,
								maxTries: 3,
								waitBetweenTries: 5000,
								'options.batching': { batchSize: 10, batchInterval: 1000 },
							},
						},
						output: 'Draft saved. 1 node changed.',
					},
					{
						type: 'tool',
						at: 150,
						tool: 'validate-draft',
						label: 'Validate the draft',
						input: { draft: 'le-v8' },
						output: 'Structure and parameters are valid. No other node changed.',
					},
					{
						type: 'tool',
						at: 190,
						tool: 'executions',
						label: 'Replay #48213 on the draft with pinned data',
						input: { executionId: '48213', draft: 'le-v8', pinnedData: true },
						output: 'Completed. 100 of 100 items enriched and updated.',
					},
					{ type: 'event', at: 240, label: 'Fix submitted for review' },
				],
			},
			nextEntryId,
		),
		// A regular review from a teammate, so the inbox shows what reviews were built for.
		buildSelfHealingReview(
			{
				id: `${SELF_HEALING_REVIEW_ID_PREFIX}seed-teammate-weekly-report`,
				requester: SEED_TEAMMATE,
				title: 'Summarise deals by stage in the Monday sales report',
				summary: '',
				description:
					'Sales asked for totals per stage instead of the raw deal list, so the Monday report is easier to scan.\n\nI added a Code node, "Summarise by stage", that groups open deals by stage and sums their amounts. "Post to #sales" now sends that summary. The workflow still runs every Monday at 8:00.\n\nTested with last week\'s deals: 42 deals across 5 stages, and the totals match HubSpot.',
				analysis:
					'Could you check the Slack formatting? I kept the stage names exactly as they are in HubSpot.',
				changedNode: 'Summarise by stage',
				executionId: null,
				workflowId: SEED_WORKFLOWS.weeklyReport.id,
				workflowName: SEED_WORKFLOWS.weeklyReport.name,
				projectId,
				baseline: snapshot(
					'wr-v5',
					'Published',
					WEEKLY_REPORT_NODES,
					connect('Every Monday at 8:00', 'Get open deals', 'Post to #sales'),
					daysAgo(14, now),
				),
				pinned: snapshot(
					'wr-v6',
					'Summarise by stage',
					WEEKLY_REPORT_FIXED_NODES,
					connect('Every Monday at 8:00', 'Get open deals', 'Summarise by stage', 'Post to #sales'),
					daysAgo(1, now),
				),
				reviewers,
				createdAt: daysAgo(1, now),
				usage: null,
				trace: [],
			},
			nextEntryId,
		),
		buildSelfHealingReview(
			{
				id: `${SELF_HEALING_REVIEW_ID_PREFIX}seed-invoice-reminders`,
				description:
					'Fix published after review. Reminders now skip days with no overdue invoices.\n\nImpact: the weekday run failed on every day without overdue invoices.\nCause: "Send reminder" received no items and threw "Cannot read properties of undefined (reading \'customer_email\')".\nChange: added an IF node, "Has overdue invoices?", before "Send reminder".\nChecked: ran the fix with no overdue invoices and with three. Both runs completed.',
				title: 'Auto-fix: Skip sending when no invoices are overdue in Invoice reminder emails',
				summary:
					'Failed: "Send reminder" threw "Cannot read properties of undefined (reading \'customer_email\')" when the query returned no rows. Changed: added a "Has overdue invoices?" guard before sending.',
				analysis:
					'What failed: execution #47902 stopped at "Send reminder" with "Cannot read properties of undefined (reading \'customer_email\')". "Get overdue invoices" returned zero rows, so the Gmail node ran with no input item.\n\nWhat I changed: set "Get overdue invoices" to always output data and added an IF node, "Has overdue invoices?", that only continues to "Send reminder" when an item has a customer email.\n\nHow I checked: ran the fixed version with an empty result set and with three overdue invoices. The empty run finishes without sending; the other sends three reminders.',
				changedNode: 'Has overdue invoices?',
				executionId: '47902',
				workflowId: SEED_WORKFLOWS.invoiceReminders.id,
				workflowName: SEED_WORKFLOWS.invoiceReminders.name,
				projectId,
				baseline: snapshot(
					'ir-v3',
					'Published',
					INVOICE_REMINDER_NODES,
					INVOICE_REMINDER_CONNECTIONS,
					daysAgo(20, now),
				),
				pinned: snapshot(
					'ir-v4',
					'Auto-fix: guard empty result',
					invoiceReminderFixedNodes(),
					INVOICE_REMINDER_FIXED_CONNECTIONS,
					invoiceOpenedAt,
				),
				reviewers,
				createdAt: invoiceOpenedAt,
				usage: { credits: 11, turns: 7, durationSeconds: 180 },
				trace: [
					{ type: 'event', at: 0, label: 'Execution #47902 failed at "Send reminder"' },
					{ type: 'event', at: 1, label: 'Pre-check passed. Investigation started' },
					{
						type: 'tool',
						at: 3,
						tool: 'executions',
						label: 'Read failed execution #47902',
						input: { executionId: '47902', include: ['error', 'nodeOutputs'] },
						output:
							'"Get overdue invoices" returned 0 items.\n"Send reminder" threw: Cannot read properties of undefined (reading \'customer_email\').',
					},
					{
						type: 'text',
						at: 18,
						text: 'The Gmail node still runs when the query returns nothing, so it reads a field from an item that does not exist.',
					},
					{
						type: 'tool',
						at: 22,
						tool: 'workflows',
						label: 'Read published workflow "Invoice reminder emails"',
						input: { workflowId: 'self-healing-demo-invoice-reminders', version: 'published' },
						output: '3 nodes, published version ir-v3. No guard between the query and the send.',
					},
					{
						type: 'tool',
						at: 60,
						tool: 'draft-workflow',
						label: 'Draft a guard before "Send reminder"',
						input: {
							addNode: { name: 'Has overdue invoices?', type: 'n8n-nodes-base.if' },
							set: { 'Get overdue invoices.alwaysOutputData': true },
						},
						output: 'Draft saved. 1 node added, 1 node changed.',
					},
					{
						type: 'tool',
						at: 110,
						tool: 'validate-draft',
						label: 'Validate the draft',
						input: { draft: 'ir-v4' },
						output: 'Structure and parameters are valid.',
					},
					{
						type: 'tool',
						at: 140,
						tool: 'executions',
						label: 'Run the draft with no overdue invoices and with three',
						input: { draft: 'ir-v4', pinnedData: ['empty', 'three invoices'] },
						output: 'Empty run finished without sending.\nThree-invoice run sent 3 reminders.',
					},
					{ type: 'event', at: 180, label: 'Fix submitted for review' },
				],
				state: 'closed',
				decision: 'approved',
				approval: { by: reviewer, at: invoiceApprovedAt, note: 'Looks good, thanks.' },
			},
			nextEntryId,
		),
		buildSelfHealingOutcome(
			{
				id: `${SELF_HEALING_REVIEW_ID_PREFIX}seed-deal-alerts`,
				description:
					'Action needed: reconnect the credential "HubSpot – Sales". No fix was attempted because nothing in the workflow has to change.\n\nImpact: every hourly run fails, so no new deals reach #sales in Slack.\nCause: the credential\'s OAuth token expired, so "Get new deals" is refused with 401 Unauthorized.\nNext: reconnect the credential, then run the failed execution again or wait for the next run.',
				title: 'Reconnect the HubSpot credential in Deal alerts to Slack',
				summary:
					'Failed: "Get new deals" was refused with 401 Unauthorized. The credential "HubSpot – Sales" has expired; reconnect it to resume.',
				executionId: '48377',
				workflowId: SEED_WORKFLOWS.dealAlerts.id,
				workflowName: SEED_WORKFLOWS.dealAlerts.name,
				projectId,
				nodes: DEAL_ALERTS_NODES,
				reviewers,
				createdAt: hoursAgo(0.7, now),
				analysis:
					'What failed: execution #48377 stopped at "Get new deals" with "Authorization failed. Please check your credentials (401 Unauthorized)".\n\nWhat I found: the pre-check matched this error to an expired OAuth token on the credential "HubSpot – Sales". The workflow has not changed since its last successful run, so there is nothing in it to fix.\n\nWhat to do next:\n1. Reconnect the credential "HubSpot – Sales" under Credentials.\n2. Run the failed execution again, or wait for the next hourly run.',
				outcome: {
					kind: 'needs_you',
					action: { type: 'open_credential', credentialName: 'HubSpot – Sales' },
				},
				usage: null,
				trace: [
					{ type: 'event', at: 0, label: 'Execution #48377 failed at "Get new deals"' },
					{
						type: 'event',
						at: 0,
						label: 'Pre-check: expired token on "HubSpot – Sales"',
					},
					{
						type: 'event',
						at: 0,
						label: 'Investigation skipped. Nothing in the workflow to change',
					},
					{ type: 'event', at: 0, label: 'Sent to your inbox as Action needed' },
				],
			},
			nextEntryId,
		),
		buildSelfHealingOutcome(
			{
				id: `${SELF_HEALING_REVIEW_ID_PREFIX}seed-order-sync`,
				description:
					'No fix prepared. The Assistant could not work out what replaced the field "shipping_method_v1" and stopped rather than guess.\n\nImpact: paid orders since yesterday at 22:10 have no shipment in the warehouse.\nCause: the warehouse API now rejects "shipping_method_v1" in "Create shipment" with HTTP 400. The workflow did not change.\nNext: find the new field in the vendor\'s API changelog and update "Create shipment", or continue in chat with the changelog link.',
				title: 'Could not fix "Create shipment" in Order sync to warehouse',
				summary:
					'Failed: the warehouse API rejected "shipping_method_v1", a field this workflow has always sent. The Assistant could not find the replacement.',
				executionId: '48311',
				workflowId: SEED_WORKFLOWS.orderSync.id,
				workflowName: SEED_WORKFLOWS.orderSync.name,
				projectId,
				nodes: ORDER_SYNC_NODES,
				reviewers,
				createdAt: hoursAgo(5, now),
				analysis:
					'What failed: execution #48311 stopped at "Create shipment" with HTTP 400 "Unknown field shipping_method_v1".\n\nWhat I found: the same request succeeded until yesterday at 22:10 and nothing in the workflow changed since, so the warehouse API has renamed or removed the field.\n\nWhy I stopped: the error does not say what replaced the field, and the API reference I can reach still lists the old name. Guessing a field name could create shipments with wrong data.\n\nWhat to do next:\n1. Check the warehouse vendor\'s API changelog for the new shipping method field.\n2. Update the field mapping in "Create shipment", then run the failed execution again.\n3. Or continue in chat with the changelog link and I will prepare the fix.',
				outcome: {
					kind: 'could_not_fix',
					action: null,
				},
				usage: { credits: 9, turns: 6, durationSeconds: 170 },
				trace: [
					{ type: 'event', at: 0, label: 'Execution #48311 failed at "Create shipment"' },
					{ type: 'event', at: 1, label: 'Pre-check passed. Investigation started' },
					{
						type: 'tool',
						at: 3,
						tool: 'executions',
						label: 'Read failed execution #48311',
						input: { executionId: '48311', include: ['error', 'nodeOutputs'] },
						output:
							'HTTP 400 Bad Request: Unknown field "shipping_method_v1".\nRequest body built by "Map shipment".',
					},
					{
						type: 'tool',
						at: 20,
						tool: 'executions',
						label: 'List recent executions of "Order sync to warehouse"',
						input: { workflowId: 'self-healing-demo-order-sync', limit: 20 },
						output:
							'Last success: yesterday 22:04.\nFirst failure: yesterday 22:10.\nNo workflow changes in between.',
					},
					{
						type: 'text',
						at: 35,
						text: 'The workflow did not change, so the warehouse API did. I need the name of the field that replaced "shipping_method_v1".',
					},
					{
						type: 'tool',
						at: 40,
						tool: 'research',
						label: 'Search the web: warehouse API shipping_method_v1 deprecated',
						input: { query: 'warehouse API "shipping_method_v1" deprecated replacement' },
						output: 'No changelog entry or announcement found.',
					},
					{
						type: 'tool',
						at: 80,
						tool: 'research',
						label: 'Fetch the warehouse API reference for POST /shipments',
						input: { url: 'https://docs.example-warehouse.com/api/shipments#create' },
						output: 'The reference still lists "shipping_method_v1" as a required field.',
					},
					{
						type: 'text',
						at: 120,
						text: 'The error and the reference disagree, and nothing names the replacement. A guessed field name could create shipments with wrong data, so I stop here.',
					},
					{
						type: 'event',
						at: 170,
						label: 'Stopped without a fix',
						error: 'No source names the field that replaced "shipping_method_v1".',
					},
					{ type: 'event', at: 170, label: 'Sent to your inbox as Could not fix' },
				],
			},
			nextEntryId,
		),
	];
}

/**
 * Snapshots for a fix started from a real execution. When the workflow's
 * nodes are known the diff is real; otherwise the lead enrichment fixture
 * stands in.
 */
export function createLiveFixSnapshots(input: {
	nodes: INode[] | undefined;
	connections: IConnections | undefined;
	failedNodeName: string | null;
	now?: number;
}): {
	baseline: WorkflowReviewVersionSnapshot;
	pinned: WorkflowReviewVersionSnapshot;
	changedNode: string;
} {
	const now = input.now ?? Date.now();
	const knownNodes = input.nodes && input.nodes.length > 0 ? input.nodes : null;
	const nodes = knownNodes ? deepCopy(knownNodes) : LEAD_ENRICHMENT_NODES;
	const connections = knownNodes ? deepCopy(input.connections ?? {}) : LEAD_ENRICHMENT_CONNECTIONS;
	const changedNode =
		(input.failedNodeName && nodes.some((node) => node.name === input.failedNodeName)
			? input.failedNodeName
			: nodes.at(-1)?.name) ?? 'Enrich with Clearbit';
	const version = String(now);

	return {
		baseline: snapshot(`${version}-base`, null, nodes, connections, daysAgo(1, now)),
		pinned: snapshot(
			`${version}-fix`,
			'Auto-fix: retry on failure',
			applyRetryFix(nodes, changedNode),
			connections,
			new Date(now).toISOString(),
		),
		changedNode,
	};
}

/** Title, summary and feed comment for a fix started from a real execution. */
/** Trace for a fix started from the execution banner. */
export function createLiveTrace(input: {
	executionId: string;
	workflowId: string;
	workflowName: string;
	changedNode: string;
	errorMessage: string | null;
	autoDeployed: boolean;
}): SelfHealingTraceEntry[] {
	const error = input.errorMessage ?? 'an unhandled error';
	return [
		{
			type: 'event',
			at: 0,
			label: `Execution #${input.executionId} failed at "${input.changedNode}"`,
		},
		{ type: 'event', at: 1, label: 'Pre-check passed. Investigation started' },
		{
			type: 'tool',
			at: 3,
			tool: 'executions',
			label: `Read failed execution #${input.executionId}`,
			input: { executionId: input.executionId, include: ['error', 'nodeOutputs'] },
			output: `Stopped at "${input.changedNode}" with ${error}.`,
		},
		{
			type: 'tool',
			at: 18,
			tool: 'workflows',
			label: `Read published workflow "${input.workflowName}"`,
			input: { workflowId: input.workflowId, version: 'published' },
			output: `"${input.changedNode}" has no retry configured.`,
		},
		{
			type: 'text',
			at: 40,
			text: 'The input data looks valid and the same node succeeded on earlier runs, so the failure is most likely transient. A retry covers it.',
		},
		{
			type: 'tool',
			at: 70,
			tool: 'draft-workflow',
			label: `Draft a change to "${input.changedNode}"`,
			input: {
				node: input.changedNode,
				set: { retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 },
			},
			output: 'Draft saved. 1 node changed.',
		},
		{
			type: 'tool',
			at: 100,
			tool: 'validate-draft',
			label: 'Validate the draft',
			input: { node: input.changedNode },
			output: 'Structure and parameters are valid. No other node changed.',
		},
		{
			type: 'tool',
			at: 130,
			tool: 'executions',
			label: `Replay #${input.executionId} on the draft with pinned data`,
			input: { executionId: input.executionId, pinnedData: true },
			output: 'The run completed.',
		},
		{
			type: 'event',
			at: 150,
			label: input.autoDeployed ? 'Fix published automatically' : 'Fix submitted for review',
		},
	];
}

export function createLiveReviewCopy(input: {
	executionId: string;
	changedNode: string;
	workflowName: string;
	errorMessage: string | null;
	/** Under "deploy fixes automatically" the fix is live before anyone reviews it. */
	autoDeployed: boolean;
}): { title: string; summary: string; description: string; analysis: string } {
	const error = input.errorMessage ?? 'an unhandled error';
	const lead = input.autoDeployed
		? 'Fix published automatically, without a review.'
		: 'Fix ready for review. Approving publishes it.';
	return {
		title: `Auto-fix: Retry "${input.changedNode}" on failure in ${input.workflowName}`,
		description: `${lead}\n\nCause: "${input.changedNode}" stopped execution #${input.executionId} with ${error}.\nChange: turned on Retry On Fail (3 tries, 5 s apart) on "${input.changedNode}". Nothing else changed.\nChecked: replayed the failed execution against the fix. The run completed.`,
		summary: `Failed: "${input.changedNode}" stopped execution #${input.executionId} with ${error}. Changed: enabled Retry On Fail (3 tries, 5 s) on "${input.changedNode}".`,
		analysis: `What failed: execution #${input.executionId} stopped at "${input.changedNode}" with "${error}".\n\nWhat I changed: turned on Retry On Fail for "${input.changedNode}" with 3 attempts, 5 seconds apart. No other node or parameter changed.\n\nHow I checked: replayed the failed execution against the fixed version with pinned input data. The run completed.`,
	};
}

/** Root-cause summary and suggestion for the "diagnose and notify" autonomy level. */
export function createDiagnosisCopy(input: {
	executionId: string;
	failedNode: string;
	errorMessage: string | null;
}): { summary: string; suggestedFix: string } {
	const error = input.errorMessage ?? 'an unhandled error';
	return {
		summary: `Execution #${input.executionId} stopped at "${input.failedNode}" with ${error}. The upstream data looked valid, so the failure is most likely transient.`,
		suggestedFix: `Turn on Retry On Fail for "${input.failedNode}" with 3 attempts, 5 seconds apart.`,
	};
}
