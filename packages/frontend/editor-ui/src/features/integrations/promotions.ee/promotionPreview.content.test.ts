import type { PromotionResourceDetail } from '@n8n/api-types';

import { billingResources, resource } from './__tests__/preview.fixtures';
import {
	describeDataTable,
	describeFieldChanges,
	describeWorkflowFieldChanges,
	sideState,
	type FieldContext,
} from './promotionPreview.content';

const containerNames: Record<string, string> = {
	'project:p1': 'Billing',
	'folder:f1': 'Payments',
	'folder:f2': 'Reports',
};
const context = (
	overrides: Partial<FieldContext> & Pick<FieldContext, 'resource'>,
): FieldContext => ({
	direction: 'promote',
	containerName: (key) => containerNames[key] ?? key,
	...overrides,
});

const folderDetail = (
	before: { name: string; parentFolderId: string | null },
	after: { name: string; parentFolderId: string | null },
): PromotionResourceDetail => ({
	key: 'folder:f3',
	type: 'folder',
	before: { id: 'f3', ...before },
	after: { id: 'f3', ...after },
	revision: { before: 'b', after: 'a' },
});

describe('promotion preview content', () => {
	it('should treat a file that does not match the package format as unreadable, not as added', () => {
		const detail: PromotionResourceDetail = {
			key: 'tag:g2',
			type: 'tag',
			before: null,
			after: { id: 'g2', name: 'ops' },
			revision: { before: 'invalid-blob', after: 'a' },
		};

		expect(sideState(detail, 'before')).toEqual({ kind: 'unreadable' });
		expect(sideState({ ...detail, revision: { before: null, after: 'a' } }, 'before')).toEqual({
			kind: 'absent',
		});
	});

	it('should show only the changes that Apply makes', () => {
		// The branch renamed and moved the folder. Apply keeps the local name and reports the move.
		const moved = resource({
			key: 'folder:f3',
			name: 'Archive',
			parentKey: 'folder:f2',
			previousParentKey: 'folder:f1',
			change: 'modified',
		});
		const detail = folderDetail(
			{ name: 'Archive', parentFolderId: 'f1' },
			{ name: 'Old invoices', parentFolderId: 'f2' },
		);
		expect(describeFieldChanges(detail, context({ direction: 'apply', resource: moved }))).toEqual([
			{ field: 'location', before: 'Payments', after: 'Reports' },
		]);

		// An unchanged resource has no field changes, even when its files differ.
		const credential: PromotionResourceDetail = {
			key: 'credential:c1',
			type: 'credential',
			before: {
				id: 'c1',
				name: 'Stripe',
				type: 'stripeApi',
				data: { apiKey: '={{ $env.LOCAL }}' },
			},
			after: { id: 'c1', name: 'Stripe', type: 'stripeApi', data: { apiKey: '={{ $env.KEY }}' } },
			revision: { before: 'b', after: 'a' },
		};
		expect(
			describeFieldChanges(
				credential,
				context({ direction: 'apply', resource: billingResources.stripe }),
			),
		).toEqual([]);
	});

	it('should show the renamed and moved fields of a folder on Promote', () => {
		const moved = resource({
			key: 'folder:f3',
			name: 'Old invoices',
			parentKey: 'project:p1',
			previousParentKey: 'folder:f1',
			change: 'modified',
		});
		const detail = folderDetail(
			{ name: 'Archive', parentFolderId: 'f1' },
			{ name: 'Old invoices', parentFolderId: null },
		);

		expect(describeFieldChanges(detail, context({ resource: moved }))).toEqual([
			{ field: 'name', before: 'Archive', after: 'Old invoices' },
			{ field: 'location', before: 'Payments', after: 'Billing' },
		]);
	});

	it('should show the rename and move of a workflow from the preview resource', () => {
		// The workflow was renamed and moved on this instance. Apply restores the branch state.
		const workflow = resource({
			key: 'workflow:w1',
			name: 'Invoice sync',
			previousName: 'Invoice sync (local)',
			parentKey: 'project:p1',
			previousParentKey: 'folder:f1',
			change: 'modified',
		});

		expect(
			describeWorkflowFieldChanges(context({ direction: 'apply', resource: workflow })),
		).toEqual([
			{ field: 'name', before: 'Invoice sync (local)', after: 'Invoice sync' },
			{ field: 'location', before: 'Payments', after: 'Billing' },
		]);
	});

	const changedTable: Extract<PromotionResourceDetail, { type: 'dataTable' }> = {
		key: 'dataTable:t1',
		type: 'dataTable',
		before: null,
		after: null,
		revision: { before: 'b', after: 'a' },
		dataTableChanges: [
			{ kind: 'rename-column', from: 'amount', to: 'total', destructive: false },
			{ kind: 'remove-column', column: 'notes', type: 'string', destructive: true },
		],
	};

	it('should list the column changes of a changed table and the columns of a new table', () => {
		const modified = describeDataTable(changedTable, billingResources.invoicesTable, 'apply');
		expect(modified.changes).toHaveLength(2);

		const added = describeDataTable(
			{
				key: 'dataTable:t2',
				type: 'dataTable',
				before: null,
				after: {
					id: 't2',
					name: 'Refunds',
					columns: [
						{ name: 'reason', type: 'string', index: 1 },
						{ name: 'amount', type: 'number', index: 0 },
					],
				},
				revision: { before: null, after: 'a' },
			},
			resource({ key: 'dataTable:t2', name: 'Refunds', change: 'added' }),
			'apply',
		);
		expect(added.addedColumns.map((column) => column.name)).toEqual(['amount', 'reason']);
	});
});
