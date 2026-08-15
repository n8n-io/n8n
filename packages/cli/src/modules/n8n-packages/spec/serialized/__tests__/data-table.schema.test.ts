import { serializedDataTableSchema } from '../data-table.schema';

function table(columns: Array<{ name: string; type: string; index: number }>) {
	return { id: 'dtsource1', name: 'Customers', columns };
}

describe('serializedDataTableSchema', () => {
	it('accepts a table with user columns', () => {
		const wire = table([
			{ name: 'email', type: 'string', index: 0 },
			{ name: 'signed_up_at', type: 'date', index: 1 },
		]);

		expect(() => serializedDataTableSchema.parse(wire)).not.toThrow();
	});

	it('rejects a column named after a system column, case-insensitively', () => {
		for (const name of ['id', 'createdAt', 'UPDATEDAT']) {
			const wire = table([{ name, type: 'string', index: 0 }]);

			expect(() => serializedDataTableSchema.parse(wire)).toThrow(/reserved system column/);
		}
	});

	it('rejects a column named after the dry-run testing column', () => {
		const wire = table([{ name: 'dryRunState', type: 'string', index: 0 }]);

		expect(() => serializedDataTableSchema.parse(wire)).toThrow(/reserved system column/);
	});

	it('rejects duplicate column names', () => {
		const wire = table([
			{ name: 'email', type: 'string', index: 0 },
			{ name: 'email', type: 'number', index: 1 },
		]);

		expect(() => serializedDataTableSchema.parse(wire)).toThrow(/duplicate column name/);
	});

	it('rejects unknown keys', () => {
		const wire = {
			...table([{ name: 'email', type: 'string', index: 0 }]),
			rows: [],
		};

		expect(() => serializedDataTableSchema.parse(wire)).toThrow();
	});
});
