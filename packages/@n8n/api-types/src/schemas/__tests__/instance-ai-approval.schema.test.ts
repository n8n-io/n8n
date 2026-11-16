import { instanceAiApprovalDetailsSchema } from '../instance-ai-approval.schema';

describe('instanceAiApprovalDetailsSchema data-table-changes', () => {
	it('parses a batch of table changes', () => {
		const details = {
			action: 'data-table-changes',
			changes: [
				{
					tableName: 'Leads',
					details: {
						action: 'create-table',
						columns: [{ name: 'email', columnType: 'string' }],
					},
				},
				{
					tableName: 'Leads',
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
			changes: [{ tableName: 'Leads', details: { action: 'drop-database' } }],
		});

		expect(result.success).toBe(false);
	});
});
