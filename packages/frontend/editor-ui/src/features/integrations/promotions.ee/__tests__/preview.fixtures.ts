import type { PromotionPreview, PromotionResource } from '@n8n/api-types';

export const COMMIT_SHA = 'c'.repeat(40);

export const resource = (
	overrides: Partial<PromotionResource> & Pick<PromotionResource, 'key' | 'name'>,
): PromotionResource => {
	// Variable keys have more parts, such as `variable:global:API_URL`.
	const [type, ...idParts] = overrides.key.split(':');
	const id = idParts.join(':');
	return {
		type: type as PromotionResource['type'],
		id,
		parentKey: null,
		change: 'unchanged',
		selectable: type === 'workflow',
		revision: { before: `${id}-before`, after: `${id}-after` },
		...overrides,
	};
};

/**
 * A project with two folders. "Invoice reconciliation" and "Payment reminders" share the
 * "Invoices" table. "Invoice reconciliation" calls the "Format currency" sub-workflow, which
 * calls "Shared logger", a workflow outside the project.
 */
export const billingResources = {
	project: resource({ key: 'project:p1', name: 'Billing' }),
	payments: resource({
		key: 'folder:f1',
		name: 'Payments',
		previousName: 'Invoicing',
		parentKey: 'project:p1',
		change: 'modified',
	}),
	reports: resource({ key: 'folder:f2', name: 'Reports', parentKey: 'project:p1' }),
	reconciliation: resource({
		key: 'workflow:w1',
		name: 'Invoice reconciliation',
		parentKey: 'folder:f1',
		change: 'modified',
	}),
	reminders: resource({ key: 'workflow:w2', name: 'Payment reminders', parentKey: 'folder:f1' }),
	kpiReport: resource({
		key: 'workflow:w3',
		name: 'Weekly KPI report',
		parentKey: 'folder:f2',
		change: 'added',
		revision: { before: null, after: 'w3-after' },
	}),
	formatCurrency: resource({
		key: 'workflow:w4',
		name: 'Format currency',
		parentKey: 'project:p1',
	}),
	sharedLogger: resource({
		key: 'workflow:w9',
		name: 'Shared logger',
		selectable: false,
		revision: { before: null, after: null },
	}),
	invoicesTable: resource({
		key: 'dataTable:t1',
		name: 'Invoices',
		parentKey: 'project:p1',
		change: 'modified',
	}),
	stripe: resource({ key: 'credential:c1', name: 'Stripe', parentKey: 'project:p1' }),
	currencyApi: resource({ key: 'credential:c2', name: 'Currency API', parentKey: 'project:p1' }),
	apiUrl: resource({
		key: 'variable:global:API_URL',
		name: 'API_URL',
		change: 'added',
		revision: { before: null, after: 'API_URL-after' },
	}),
	finance: resource({ key: 'tag:g1', name: 'finance' }),
};

export const billingPreview = (overrides: Partial<PromotionPreview> = {}): PromotionPreview => ({
	commitSha: COMMIT_SHA,
	source: { environmentId: 'environment-1', branchName: 'main' },
	changes: [],
	resources: Object.values(billingResources),
	dependencies: [
		{ workflowKey: 'workflow:w1', resourceKey: 'dataTable:t1', included: true },
		{ workflowKey: 'workflow:w1', resourceKey: 'credential:c1', included: true },
		{ workflowKey: 'workflow:w1', resourceKey: 'tag:g1', included: true },
		{ workflowKey: 'workflow:w1', resourceKey: 'workflow:w4', included: false },
		{ workflowKey: 'workflow:w2', resourceKey: 'dataTable:t1', included: true },
		{ workflowKey: 'workflow:w3', resourceKey: 'variable:global:API_URL', included: true },
		{ workflowKey: 'workflow:w4', resourceKey: 'credential:c2', included: true },
		{ workflowKey: 'workflow:w4', resourceKey: 'workflow:w9', included: false },
	],
	...overrides,
});
