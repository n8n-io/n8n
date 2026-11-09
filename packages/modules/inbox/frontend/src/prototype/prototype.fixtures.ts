import type {
	InboxItem,
	InboxPromotionReviewItem,
	InboxSelfHealingItem,
	InboxWorkflowReviewItem,
	ListWorkflowReviewActivityResponse,
	PromotionResource,
	PromotionResourceDetail,
	PromotionReviewChanges,
	SelfHealingResultDetail,
	SerializedWorkflow,
	WorkflowReviewEligibleReviewer,
	WorkflowReviewRequestDetail,
	WorkflowReviewVersionSnapshot,
	WorkflowSuggestionSnapshot,
} from '@n8n/api-types';
import type { IConnections, INode } from 'n8n-workflow';

import type { SelfHealingResultWorkflowMetadata } from '../self-healing/selfHealingResults.api';

/**
 * Sample items for the layout prototype, in the shapes that the API sends.
 * The ids start with `prototype-`, so no real request matches them.
 * Times are relative to page load, so the cards stay recent.
 */
const PROJECT_ID = 'prototype-project';

function minutesAgo(minutes: number) {
	return new Date(Date.now() - minutes * 60_000).toISOString();
}

const maya: WorkflowReviewEligibleReviewer = {
	id: 'prototype-user-maya',
	email: 'maya.chen@example.com',
	firstName: 'Maya',
	lastName: 'Chen',
};
const omar: WorkflowReviewEligibleReviewer = {
	id: 'prototype-user-omar',
	email: 'omar.haddad@example.com',
	firstName: 'Omar',
	lastName: 'Haddad',
};
const priya: WorkflowReviewEligibleReviewer = {
	id: 'prototype-user-priya',
	email: 'priya.shah@example.com',
	firstName: 'Priya',
	lastName: 'Shah',
};

function chain(...names: string[]): IConnections {
	const connections: IConnections = {};
	for (const [index, name] of names.slice(0, -1).entries()) {
		connections[name] = { main: [[{ node: names[index + 1], type: 'main', index: 0 }]] };
	}
	return connections;
}

// Payment Handler: the workflow of the workflow review and of the promotion review.
const paymentWebhook: INode = {
	id: 'prototype-node-webhook',
	name: 'Payment webhook',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 2,
	position: [0, 0],
	parameters: { httpMethod: 'POST', path: 'payments' },
};
const chargeBefore: INode = {
	id: 'prototype-node-charge',
	name: 'Charge Stripe',
	type: 'n8n-nodes-base.stripe',
	typeVersion: 1,
	position: [240, 0],
	parameters: { resource: 'charge', operation: 'create' },
};
const chargeAfter: INode = {
	...chargeBefore,
	retryOnFail: true,
	maxTries: 4,
	waitBetweenTries: 5000,
};
const billingPost: INode = {
	id: 'prototype-node-slack',
	name: 'Post to #billing',
	type: 'n8n-nodes-base.slack',
	typeVersion: 2.3,
	position: [480, 0],
	parameters: {
		select: 'channel',
		channelId: { __rl: true, mode: 'name', value: '#billing' },
		text: 'Payment received',
	},
};
const paymentsPost: INode = {
	...billingPost,
	name: 'Post to #payments',
	parameters: {
		select: 'channel',
		channelId: { __rl: true, mode: 'name', value: '#payments' },
		text: 'Payment received',
	},
};

const paymentBefore = {
	nodes: [paymentWebhook, chargeBefore, billingPost],
	connections: chain(paymentWebhook.name, chargeBefore.name, billingPost.name),
};
const paymentAfter = {
	nodes: [paymentWebhook, chargeAfter, paymentsPost],
	connections: chain(paymentWebhook.name, chargeAfter.name, paymentsPost.name),
};

// Workflow review

const WORKFLOW_REVIEW_ID = 'prototype-workflow-review';
const PAYMENT_WORKFLOW_ID = 'prototype-workflow-payment';

const publishedVersion: WorkflowReviewVersionSnapshot = {
	versionId: 'prototype-version-published',
	name: null,
	...paymentBefore,
	nodeGroups: [],
	createdAt: minutesAgo(60 * 24 * 6),
};
const pinnedVersion: WorkflowReviewVersionSnapshot = {
	versionId: 'prototype-version-pinned',
	name: 'Retry failed charges',
	...paymentAfter,
	nodeGroups: [],
	createdAt: minutesAgo(95),
};

export const workflowReviewItem: InboxWorkflowReviewItem = {
	type: 'workflow_review',
	id: WORKFLOW_REVIEW_ID,
	state: 'open',
	decision: 'pending',
	projectId: PROJECT_ID,
	title: 'Update Payment Handler',
	workflowName: 'Payment Handler',
	workflowVersionId: pinnedVersion.versionId,
	requester: maya,
	authors: [maya],
	reviewers: [omar, priya],
	createdAt: minutesAgo(90),
	updatedAt: minutesAgo(40),
};

const { workflowName: _workflowName, workflowVersionId, ...reviewSummary } = workflowReviewItem;

export const workflowReviewDetail: WorkflowReviewRequestDetail = {
	...reviewSummary,
	description:
		'Retry failed Stripe charges up to 4 times before the workflow fails. Send the payment message to #payments, not #billing.',
	workflows: [
		{
			workflowId: PAYMENT_WORKFLOW_ID,
			workflowName: 'Payment Handler',
			workflowVersionId,
			pinnedVersion,
			publishedVersionId: publishedVersion.versionId,
			baselineVersion: publishedVersion,
		},
	],
	viewerCanDecide: true,
	viewerDecisionIneligibilityReason: null,
	viewerCanComment: true,
};

export const workflowReviewActivity: ListWorkflowReviewActivityResponse = {
	data: [
		{
			id: '1',
			typeVersion: 1,
			type: 'review.opened',
			createdBy: maya,
			createdAt: minutesAgo(90),
			data: {
				workflowVersions: [
					{ workflowId: PAYMENT_WORKFLOW_ID, workflowVersionId: pinnedVersion.versionId },
				],
			},
		},
		{
			id: '2',
			typeVersion: 1,
			type: 'comment.created',
			createdBy: priya,
			createdAt: minutesAgo(40),
			data: null,
			messages: [
				{
					id: 'prototype-message-1',
					body: 'Please keep the old Slack channel until finance confirms the move.',
					createdBy: priya,
					createdAt: minutesAgo(40),
					updatedAt: null,
					deletedAt: null,
				},
			],
		},
	],
	nextCursor: null,
	hasMore: false,
};

// Self-healing result

const SELF_HEALING_RESULT_ID = 'prototype-self-healing-result';
const INVOICE_WORKFLOW_ID = 'prototype-workflow-invoice-sync';

const invoiceTrigger: INode = {
	id: 'prototype-node-schedule',
	name: 'Every hour',
	type: 'n8n-nodes-base.scheduleTrigger',
	typeVersion: 1.2,
	position: [0, 0],
	parameters: { rule: { interval: [{ field: 'hours' }] } },
};
const fetchInvoicesBefore: INode = {
	id: 'prototype-node-http',
	name: 'Fetch invoices',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	position: [240, 0],
	parameters: { url: 'https://billing.example.com/api/invoices', options: {} },
};
const fetchInvoicesAfter: INode = {
	...fetchInvoicesBefore,
	parameters: {
		url: 'https://billing.example.com/api/invoices',
		options: { timeout: 30000 },
	},
	retryOnFail: true,
	maxTries: 3,
	waitBetweenTries: 5000,
};
const financePost: INode = {
	id: 'prototype-node-finance',
	name: 'Post to #finance',
	type: 'n8n-nodes-base.slack',
	typeVersion: 2.3,
	position: [480, 0],
	parameters: {
		select: 'channel',
		channelId: { __rl: true, mode: 'name', value: '#finance' },
		text: 'Invoices synced',
	},
};

const invoiceConnections = chain(invoiceTrigger.name, fetchInvoicesBefore.name, financePost.name);
const invoiceOriginal: WorkflowSuggestionSnapshot = {
	name: 'Invoice sync',
	nodes: [invoiceTrigger, fetchInvoicesBefore, financePost],
	connections: invoiceConnections,
};
const invoiceProposed: WorkflowSuggestionSnapshot = {
	name: 'Invoice sync',
	nodes: [invoiceTrigger, fetchInvoicesAfter, financePost],
	connections: invoiceConnections,
};

const selfHealingSummary = 'Retry the invoice request after a timeout';

export const selfHealingItem: InboxSelfHealingItem = {
	type: 'self_healing_result',
	id: SELF_HEALING_RESULT_ID,
	state: 'open',
	projectId: PROJECT_ID,
	workflowId: INVOICE_WORKFLOW_ID,
	workflowName: 'Invoice sync',
	summary: selfHealingSummary,
	outcome: 'fix_ready',
	createdAt: minutesAgo(12),
	updatedAt: minutesAgo(8),
	completedAt: minutesAgo(8),
};

export const selfHealingDetail: SelfHealingResultDetail = {
	resultId: SELF_HEALING_RESULT_ID,
	workflowId: INVOICE_WORKFLOW_ID,
	projectId: PROJECT_ID,
	backgroundUserId: omar.id,
	outcome: 'fix_ready',
	summary: selfHealingSummary,
	report: [
		'### What failed',
		'Execution 4821 stopped at **Fetch invoices**. The billing API did not answer in time.',
		'',
		'### What changed',
		'- **Fetch invoices** waits up to 30 seconds for an answer.',
		'- **Fetch invoices** tries again up to 3 times, with 5 seconds between tries.',
	].join('\n'),
	usage: { turns: 6, durationSeconds: 94, credits: 12 },
	completedAt: minutesAgo(8),
	createdAt: minutesAgo(12),
	updatedAt: minutesAgo(8),
	dismissedAt: null,
	dismissedById: null,
	reviewState: 'open',
	execution: { status: 'available', id: '4821' },
	suggestion: {
		suggestionId: 'prototype-suggestion',
		workflowId: INVOICE_WORKFLOW_ID,
		projectId: PROJECT_ID,
		backgroundUserId: omar.id,
		expectedBaseline: {
			savedVersionId: 'prototype-version-invoice',
			publishedVersionId: 'prototype-version-invoice',
			checksum: 'prototype-checksum',
			versionCounter: 7,
			latestPublishHistoryEventId: null,
		},
		state: 'pending',
		closedReason: null,
		resultKind: 'fix_ready',
		appliedVersion: null,
		author: 'assistant',
		payload: {
			original: invoiceOriginal,
			candidate: { nodes: invoiceProposed.nodes, connections: invoiceProposed.connections },
			proposed: invoiceProposed,
			explanation: 'Retry the invoice request and wait longer for an answer.',
			errorContext: { summary: 'The billing API timed out.', evidenceReference: null },
		},
		activity: [
			{
				id: 'prototype-suggestion-submitted',
				action: 'submitted',
				author: 'assistant',
				actorId: null,
				createdAt: minutesAgo(8),
			},
		],
	},
};

export const selfHealingWorkflow: SelfHealingResultWorkflowMetadata = {
	name: 'Invoice sync',
	scopes: ['workflow:read', 'workflow:update', 'workflow:publish'],
};

// Promotion review

const PROMOTION_REVIEW_ID = 'prototype-promotion-review';
const COMMIT_SHA = { baseline: 'a'.repeat(40), head: 'b'.repeat(40) };

export const promotionReviewItem: InboxPromotionReviewItem = {
	type: 'promotion_review',
	id: PROMOTION_REVIEW_ID,
	state: 'open',
	reviewState: 'open',
	reviewType: 'gitlab',
	title: 'Promote payment changes to Production',
	webUrl: 'https://gitlab.example.com/acme/n8n-workflows/-/merge_requests/42',
	branchName: 'n8n/promote-payments',
	environmentName: 'Production',
	requester: { id: maya.id, firstName: 'Maya', lastName: 'Chen', email: maya.email },
	approver: { id: omar.id, firstName: 'Omar', lastName: 'Haddad', email: omar.email },
	remoteError: null,
	headCommitSha: COMMIT_SHA.head,
	runCommitSha: COMMIT_SHA.head,
	hasConflicts: false,
	createdAt: minutesAgo(50),
	updatedAt: minutesAgo(6),
};

const errorTrigger: INode = {
	id: 'prototype-node-error-trigger',
	name: 'Error Trigger',
	type: 'n8n-nodes-base.errorTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};
const notifyFinance: INode = {
	id: 'prototype-node-notify',
	name: 'Post to #finance',
	type: 'n8n-nodes-base.slack',
	typeVersion: 2.3,
	position: [240, 0],
	parameters: {
		select: 'channel',
		channelId: { __rl: true, mode: 'name', value: '#finance' },
		text: 'A payment workflow failed',
	},
};

const promotionResources: PromotionResource[] = [
	{
		key: 'project:prototype-project',
		type: 'project',
		id: PROJECT_ID,
		name: 'Payments',
		parentKey: null,
		change: 'unchanged',
		selectable: false,
		revision: { before: 'prototype-project-blob', after: 'prototype-project-blob' },
	},
	{
		key: `workflow:${PAYMENT_WORKFLOW_ID}`,
		type: 'workflow',
		id: PAYMENT_WORKFLOW_ID,
		name: 'Payment Handler',
		parentKey: 'project:prototype-project',
		change: 'modified',
		selectable: true,
		revision: { before: 'prototype-payment-before', after: 'prototype-payment-after' },
	},
	{
		key: 'workflow:prototype-workflow-notify',
		type: 'workflow',
		id: 'prototype-workflow-notify',
		name: 'Notify finance',
		parentKey: 'project:prototype-project',
		change: 'added',
		selectable: true,
		revision: { before: null, after: 'prototype-notify-after' },
	},
	{
		key: 'credential:prototype-credential-stripe',
		type: 'credential',
		id: 'prototype-credential-stripe',
		name: 'Stripe API',
		parentKey: 'project:prototype-project',
		change: 'added',
		selectable: false,
		revision: { before: null, after: 'prototype-stripe-after' },
	},
];

export const promotionReviewChanges: PromotionReviewChanges = {
	baselineCommitSha: COMMIT_SHA.baseline,
	headCommitSha: COMMIT_SHA.head,
	resources: promotionResources,
	dependencies: [
		{
			workflowKey: `workflow:${PAYMENT_WORKFLOW_ID}`,
			resourceKey: 'credential:prototype-credential-stripe',
			included: true,
		},
	],
	warnings: [],
	outcome: null,
};

function serializedWorkflow(
	id: string,
	name: string,
	graph: { nodes: INode[]; connections: IConnections },
): SerializedWorkflow {
	return { id, name, ...graph, parentFolderId: null, isArchived: false };
}

export const promotionResourceDetails: PromotionResourceDetail[] = [
	{
		key: `workflow:${PAYMENT_WORKFLOW_ID}`,
		type: 'workflow',
		before: serializedWorkflow(PAYMENT_WORKFLOW_ID, 'Payment Handler', paymentBefore),
		after: serializedWorkflow(PAYMENT_WORKFLOW_ID, 'Payment Handler', paymentAfter),
		revision: { before: 'prototype-payment-before', after: 'prototype-payment-after' },
	},
	{
		key: 'workflow:prototype-workflow-notify',
		type: 'workflow',
		before: null,
		after: serializedWorkflow('prototype-workflow-notify', 'Notify finance', {
			nodes: [errorTrigger, notifyFinance],
			connections: chain(errorTrigger.name, notifyFinance.name),
		}),
		revision: { before: null, after: 'prototype-notify-after' },
	},
	{
		key: 'credential:prototype-credential-stripe',
		type: 'credential',
		before: null,
		after: { id: 'prototype-credential-stripe', name: 'Stripe API', type: 'stripeApi' },
		revision: { before: null, after: 'prototype-stripe-after' },
	},
];

export const prototypeItems: InboxItem[] = [
	workflowReviewItem,
	selfHealingItem,
	promotionReviewItem,
];
