import { ExpandVariablesValueColumn1774500000000 } from '../1774500000000-ExpandVariablesValueColumn';

describe('ExpandVariablesValueColumn1774500000000', () => {
	it('expands the variables.value column to TEXT in postgres', async () => {
		const queryRunner = {
			query: jest.fn(),
		};
		const escape = {
			tableName: jest.fn().mockReturnValue('"variables"'),
			columnName: jest.fn().mockReturnValue('"value"'),
		};

		await new ExpandVariablesValueColumn1774500000000().up({
			queryRunner,
			escape,
		} as never);

		expect(escape.tableName).toHaveBeenCalledWith('variables');
		expect(escape.columnName).toHaveBeenCalledWith('value');
		expect(queryRunner.query).toHaveBeenCalledWith(
			'ALTER TABLE "variables" ALTER COLUMN "value" TYPE TEXT;',
		);
	});
});
