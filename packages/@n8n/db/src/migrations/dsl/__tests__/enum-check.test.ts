import type { Driver, QueryRunner, Table } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { Column } from '../column';
import { AddColumns, CreateTable } from '../table';

const createMocks = (escapeChar = '"') => {
	const driver = mock<Driver>();
	driver.escape.mockImplementation((name) => `${escapeChar}${name}${escapeChar}`);

	const queryRunner = mock<QueryRunner>({ connection: { driver } } as unknown as QueryRunner);

	return { driver, queryRunner };
};

describe('Column.withEnumCheck', () => {
	it('should return undefined when no enum check is set', () => {
		const col = new Column('status').varchar(50);
		expect(col.getEnumCheck()).toBeUndefined();
	});

	it('should return column name and values when enum check is set', () => {
		const col = new Column('status').varchar(50).withEnumCheck(['active', 'inactive']);
		expect(col.getEnumCheck()).toEqual({
			columnName: 'status',
			values: ['active', 'inactive'],
		});
	});

	it('should be chainable with other column methods', () => {
		const col = new Column('event')
			.varchar(36)
			.notNull.withEnumCheck(['activated', 'deactivated'])
			.comment('Event type');

		const { driver } = createMocks();
		const options = col.toOptions(driver);

		expect(options).toEqual(
			expect.objectContaining({
				name: 'event',
				isNullable: false,
				comment: 'Event type',
			}),
		);
		expect(col.getEnumCheck()).toEqual({
			columnName: 'event',
			values: ['activated', 'deactivated'],
		});
	});
});

describe('CreateTable with column-level enum checks', () => {
	it('should include CHECK constraints from column-level withEnumCheck', async () => {
		const { queryRunner } = createMocks();

		await new CreateTable('test_table', 'n8n_', queryRunner).withColumns(
			new Column('id').int.primary,
			new Column('status').varchar(50).notNull.withEnumCheck(['active', 'inactive']),
		);

		const tableArg: Table = queryRunner.createTable.mock.calls[0][0];

		expect(tableArg.checks).toEqual([
			expect.objectContaining({
				name: 'CHK_n8n_test_table_status',
				expression: "\"status\" IN ('active', 'inactive')",
			}),
		]);
	});

	it('should handle multiple columns with enum checks', async () => {
		const { queryRunner } = createMocks();

		await new CreateTable('test_table', '', queryRunner).withColumns(
			new Column('id').int.primary,
			new Column('status').varchar(50).withEnumCheck(['active', 'inactive']),
			new Column('role').varchar(20).withEnumCheck(['admin', 'user', 'guest']),
		);

		const tableArg: Table = queryRunner.createTable.mock.calls[0][0];

		expect(tableArg.checks).toEqual([
			expect.objectContaining({
				name: 'CHK_test_table_status',
				expression: "\"status\" IN ('active', 'inactive')",
			}),
			expect.objectContaining({
				name: 'CHK_test_table_role',
				expression: "\"role\" IN ('admin', 'user', 'guest')",
			}),
		]);
	});

	it('should escape single quotes in enum values', async () => {
		const { queryRunner } = createMocks();

		await new CreateTable('test_table', '', queryRunner).withColumns(
			new Column('label').varchar(50).withEnumCheck(["it's", "they're"]),
		);

		const tableArg: Table = queryRunner.createTable.mock.calls[0][0];

		expect(tableArg.checks).toEqual([
			expect.objectContaining({
				expression: "\"label\" IN ('it''s', 'they''re')",
			}),
		]);
	});

	it('should not include checks when no columns have enum values', async () => {
		const { queryRunner } = createMocks();

		await new CreateTable('test_table', '', queryRunner).withColumns(
			new Column('id').int.primary,
			new Column('name').varchar(100),
		);

		const tableArg: Table = queryRunner.createTable.mock.calls[0][0];
		expect(tableArg.checks).toHaveLength(0);
	});
});

describe('AddColumns with column-level enum checks', () => {
	it('should call createCheckConstraints for columns with enum checks', async () => {
		const { queryRunner } = createMocks();

		await new AddColumns(
			'test_table',
			[new Column('status').varchar(50).notNull.withEnumCheck(['active', 'inactive'])],
			'n8n_',
			queryRunner,
		);

		expect(queryRunner.addColumns).toHaveBeenCalledTimes(1);
		expect(queryRunner.createCheckConstraints).toHaveBeenCalledTimes(1);
		expect(queryRunner.createCheckConstraints).toHaveBeenCalledWith('n8n_test_table', [
			expect.objectContaining({
				name: 'CHK_n8n_test_table_status',
				expression: "\"status\" IN ('active', 'inactive')",
			}),
		]);
	});

	it('should not call createCheckConstraints when no columns have enum checks', async () => {
		const { queryRunner } = createMocks();

		await new AddColumns('test_table', [new Column('name').varchar(100)], '', queryRunner);

		expect(queryRunner.addColumns).toHaveBeenCalledTimes(1);
		expect(queryRunner.createCheckConstraints).not.toHaveBeenCalled();
	});

	it('should handle multiple columns with enum checks', async () => {
		const { queryRunner } = createMocks();

		await new AddColumns(
			'test_table',
			[
				new Column('status').varchar(50).withEnumCheck(['active', 'inactive']),
				new Column('role').varchar(20).withEnumCheck(['admin', 'user']),
			],
			'',
			queryRunner,
		);

		expect(queryRunner.createCheckConstraints).toHaveBeenCalledTimes(1);
		expect(queryRunner.createCheckConstraints).toHaveBeenCalledWith('test_table', [
			expect.objectContaining({
				name: 'CHK_test_table_status',
				expression: "\"status\" IN ('active', 'inactive')",
			}),
			expect.objectContaining({
				name: 'CHK_test_table_role',
				expression: "\"role\" IN ('admin', 'user')",
			}),
		]);
	});
});
