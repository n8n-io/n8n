import type { AppPlan } from '../../schemas/app-plan.schema';

export const reviewDeskPlan: AppPlan = {
	layout: 'topbar',
	nav: { id: 'nav', kind: 'nav', label: 'Review desk' },
	screens: [
		{
			id: 'queue',
			name: 'Review queue',
			components: [
				{
					id: 'kpi-pending',
					kind: 'kpi',
					label: 'Waiting for review',
					span: 4,
					data: {
						kind: 'dataTable',
						name: 'Drafts',
						status: 'new',
						aggregation: 'count of drafts where status = pending',
					},
				},
				{
					id: 'kpi-approved',
					kind: 'kpi',
					label: 'Approved today',
					span: 4,
					data: {
						kind: 'dataTable',
						name: 'Drafts',
						status: 'new',
						aggregation: 'count of drafts approved today',
					},
				},
				{
					id: 'kpi-rejected',
					kind: 'kpi',
					label: 'Rejected today',
					span: 4,
					data: {
						kind: 'dataTable',
						name: 'Drafts',
						status: 'new',
						aggregation: 'count of drafts rejected today',
					},
				},
				{
					id: 'drafts',
					kind: 'table',
					label: 'Drafts',
					span: 12,
					items: ['Title', 'Channel', 'Created', 'Status'],
					data: {
						kind: 'dataTable',
						name: 'Drafts',
						status: 'new',
						fields: ['title', 'channel', 'createdAt', 'status'],
					},
				},
				{
					id: 'draft-detail',
					kind: 'detail',
					label: 'Selected draft',
					region: 'aside',
					items: ['Title', 'AI text', 'Source'],
					data: {
						kind: 'dataTable',
						name: 'Drafts',
						status: 'new',
						fields: ['title', 'body', 'source'],
					},
				},
				{
					id: 'approve',
					kind: 'button',
					label: 'Approve',
					region: 'aside',
					span: 6,
					action: {
						kind: 'workflow',
						name: 'Publish draft',
						status: 'new',
						does: 'Marks the draft approved and publishes it to its channel',
					},
				},
				{
					id: 'reject',
					kind: 'button',
					label: 'Reject',
					region: 'aside',
					span: 6,
					action: {
						kind: 'workflow',
						name: 'Reject draft',
						status: 'new',
						does: 'Marks the draft rejected and tells the author why',
					},
				},
			],
		},
	],
	buildOrder: [
		'shell',
		'nav',
		'drafts',
		'draft-detail',
		'kpi-pending',
		'kpi-approved',
		'kpi-rejected',
		'approve',
		'reject',
	],
};
