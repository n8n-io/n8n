import type { PromotionResourceDetail, SerializedWorkflow } from '@n8n/api-types';

import { toPromotionDiffSide } from './promotionPreview.workflow';

const workflow = (overrides: Partial<SerializedWorkflow> = {}): SerializedWorkflow => ({
	id: 'w1',
	name: 'Invoice reconciliation',
	nodes: [
		{
			id: 'node-trigger',
			name: 'Schedule',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: 'node-sheet',
			name: 'Read invoices',
			type: 'n8n-nodes-base.googleSheets',
			typeVersion: 4,
			position: [200, 0],
			parameters: { sheetName: 'Invoices' },
		},
	],
	connections: { Schedule: { main: [[{ node: 'Read invoices', type: 'main', index: 0 }]] } },
	nodeGroups: [{ id: 'group-1', name: 'Load', nodeIds: ['node-trigger', 'node-sheet'] }],
	settings: { executionOrder: 'v1' },
	parentFolderId: 'f1',
	isArchived: false,
	tagIds: ['g1', 'g2'],
	...overrides,
});

describe('toPromotionDiffSide', () => {
	it('should keep the content of each side and list the tags of both sides in the same order', () => {
		const detail: PromotionResourceDetail = {
			key: 'workflow:w1',
			type: 'workflow',
			before: workflow({
				name: 'Reconcile invoices',
				settings: { executionOrder: 'v0' },
				tagIds: ['g2', 'g1'],
			}),
			after: workflow(),
			revision: { before: 'blob-before', after: 'blob-after' },
		};
		const tagName = (id: string) => ({ g1: 'finance', g2: 'billing' })[id] ?? id;

		const before = toPromotionDiffSide(detail, 'before', tagName);
		const after = toPromotionDiffSide(detail, 'after', tagName);

		const tags = [
			{ id: 'g2', name: 'billing' },
			{ id: 'g1', name: 'finance' },
		];
		expect(before).toMatchObject({
			kind: 'content',
			content: {
				name: 'Reconcile invoices',
				versionId: 'promotion-before-blob-before',
				settings: { executionOrder: 'v0' },
				tags,
			},
		});
		expect(after).toEqual({
			kind: 'content',
			content: {
				id: 'w1',
				name: 'Invoice reconciliation',
				versionId: 'promotion-after-blob-after',
				nodes: workflow().nodes,
				connections: workflow().connections,
				nodeGroups: workflow().nodeGroups,
				settings: { executionOrder: 'v1' },
				tags,
				isArchived: false,
			},
		});
	});
});
