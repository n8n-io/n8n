import { DATA_TABLE_WRITE_TOOL_ACTIONS } from '../../builder-tool-names';
import {
	DATA_TABLE_CHANGE_SEVERITY,
	instanceAiApprovalDetailsSchema,
	isSessionGrantableDataTableAction,
} from '../instance-ai-approval.schema';

describe('instanceAiApprovalDetailsSchema data-table-changes', () => {
	it('parses a batch of table changes', () => {
		const details = {
			action: 'data-table-changes',
			changes: [
				{
					tableName: 'Leads',
					tableKey: 'created:Leads',
					details: {
						action: 'create-table',
						columns: [{ name: 'email', columnType: 'string' }],
					},
				},
				{
					tableName: 'Leads',
					tableKey: 'created:Leads',
					details: {
						action: 'insert-rows',
						count: 1,
						rows: [{ values: [{ column: 'email', value: 'a@b.c' }], remainingColumns: 0 }],
					},
				},
			],
		};

		expect(instanceAiApprovalDetailsSchema.parse(details)).toEqual(details);
	});

	it('rejects an empty batch', () => {
		const result = instanceAiApprovalDetailsSchema.safeParse({
			action: 'data-table-changes',
			changes: [],
		});

		expect(result.success).toBe(false);
	});

	it('rejects a change with an unknown action', () => {
		const result = instanceAiApprovalDetailsSchema.safeParse({
			action: 'data-table-changes',
			changes: [
				{ tableName: 'Leads', tableKey: 'existing:dt-1', details: { action: 'drop-database' } },
			],
		});

		expect(result.success).toBe(false);
	});

	it('rejects a change without a table key', () => {
		const result = instanceAiApprovalDetailsSchema.safeParse({
			action: 'data-table-changes',
			changes: [{ tableName: 'Leads', details: { action: 'delete-table' } }],
		});

		expect(result.success).toBe(false);
	});
});

describe('isSessionGrantableDataTableAction', () => {
	it('grants a session approval only for actions that are not destructive', () => {
		expect(isSessionGrantableDataTableAction('create')).toBe(true);
		expect(isSessionGrantableDataTableAction('insert-rows')).toBe(true);
		expect(isSessionGrantableDataTableAction('delete')).toBe(false);
		expect(isSessionGrantableDataTableAction('delete-column')).toBe(false);
		expect(isSessionGrantableDataTableAction('delete-rows')).toBe(false);
	});

	it.each(DATA_TABLE_WRITE_TOOL_ACTIONS)('follows the severity of %s', (action) => {
		expect(isSessionGrantableDataTableAction(action)).toBe(
			DATA_TABLE_CHANGE_SEVERITY[action] !== 'destructive',
		);
	});
});
