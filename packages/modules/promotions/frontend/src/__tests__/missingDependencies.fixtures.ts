import type {
	PromotionBindingConsumer,
	PromotionDependencyWarning,
	PromotionMissingDependency,
} from '@n8n/api-types';

import { billingResources } from './preview.fixtures';

const { reconciliation, kpiReport } = billingResources;

/** The workflows of the "Billing" preview that use a dependency. */
export const usedBy = (
	...workflows: Array<{ id: string; name: string }>
): PromotionBindingConsumer[] => [
	{
		project: { id: 'p1', name: 'Billing' },
		workflows: workflows.map(({ id, name }) => ({ id, name })),
	},
];

/** A credential of another project that the user can access. "Invoice reconciliation" uses it. */
export const otherProjectCredential: PromotionMissingDependency = {
	kind: 'credential',
	id: 'c7',
	name: 'CRM key',
	credentialType: 'httpHeaderAuth',
	group: 'other-project',
	reason: 'not-on-branch',
	accessible: true,
	blocking: false,
	consumers: usedBy(reconciliation),
};

/** A sub-workflow of a project that the user cannot access. Both changed workflows call it. */
export const outsideAccessWorkflow: PromotionMissingDependency = {
	kind: 'workflow',
	id: 'w7',
	name: 'Send audit log',
	group: 'outside-access',
	reason: 'not-on-branch',
	accessible: false,
	blocking: false,
	consumers: usedBy(reconciliation, kpiReport),
};

/** A credential of a personal project. "Weekly KPI report" uses it. */
export const personalCredential: PromotionMissingDependency = {
	kind: 'credential',
	id: 'c8',
	name: 'Personal Gmail',
	credentialType: 'gmailOAuth2',
	group: 'personal',
	reason: 'personal-project',
	accessible: true,
	blocking: false,
	consumers: usedBy(kpiReport),
};

/** A sub-workflow of a personal project. It stops an instance Promote. */
export const personalWorkflow: PromotionMissingDependency = {
	kind: 'workflow',
	id: 'w6',
	name: 'Draft helper',
	group: 'personal',
	reason: 'personal-project',
	accessible: true,
	blocking: true,
	consumers: usedBy(kpiReport),
};

/** A sub-workflow that no longer exists on this instance. "Invoice reconciliation" calls it. */
export const deletedWorkflowWarning: PromotionDependencyWarning = {
	kind: 'workflow',
	code: 'missing-on-source',
	id: 'w8',
	name: 'Archive invoices',
	blocking: false,
	consumers: usedBy(reconciliation),
};
