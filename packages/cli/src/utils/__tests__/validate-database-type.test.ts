import { validateDbTypeForExportEntities } from '../validate-database-type';

describe('validateDbTypeForExportEntities', () => {
	it('should throw an error if the database type is not supported', () => {
		expect(() => validateDbTypeForExportEntities('invalid')).toThrow(
			'Unsupported database type: invalid. Supported types: sqlite, postgres',
		);
	});

	it('should not throw an error if the database type is supported', () => {
		expect(() => validateDbTypeForExportEntities('sqlite')).not.toThrow();
		expect(() => validateDbTypeForExportEntities('postgres')).not.toThrow();
	});
});
