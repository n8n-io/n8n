import { supportedTypes, validateDbTypeForExportEntities } from '../validate-database-type';

describe('validateDbTypeForExportEntities', () => {
	it('should throw an error if the database type is not supported', () => {
		expect(() => validateDbTypeForExportEntities('invalid')).toThrow(
			'Unsupported database type: invalid. Supported types: ' + supportedTypes.join(', '),
		);
	});

	it('should not throw an error if the database type is supported', () => {
		expect(() => validateDbTypeForExportEntities('sqlite')).not.toThrow();
		expect(() => validateDbTypeForExportEntities('postgres')).not.toThrow();
		expect(() => validateDbTypeForExportEntities('mysql')).not.toThrow();
		expect(() => validateDbTypeForExportEntities('mariadb')).not.toThrow();
		expect(() => validateDbTypeForExportEntities('mysqldb')).not.toThrow();
		expect(() => validateDbTypeForExportEntities('sqlite-pooled')).not.toThrow();
		expect(() => validateDbTypeForExportEntities('sqlite-memory')).not.toThrow();
		expect(() => validateDbTypeForExportEntities('postgresql')).not.toThrow();
	});
});
