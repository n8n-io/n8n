import {
	supportedTypesForExport,
	supportedTypesForImport,
	validateDbTypeForExportEntities,
	validateDbTypeForImportEntities,
} from '../validate-database-type';

describe('validateDbTypeForExportEntities', () => {
	it('should throw an error if the database type is not supported', () => {
		expect(() => validateDbTypeForExportEntities('invalid')).toThrow(
			'Unsupported database type: invalid. Supported types: ' + supportedTypesForExport.join(', '),
		);
	});

	it('should not throw an error if the database type is supported', () => {
		expect(() => validateDbTypeForExportEntities('sqlite')).not.toThrow();
		expect(() => validateDbTypeForExportEntities('postgres')).not.toThrow();
		expect(() => validateDbTypeForExportEntities('sqlite-pooled')).not.toThrow();
		expect(() => validateDbTypeForExportEntities('sqlite-memory')).not.toThrow();
		expect(() => validateDbTypeForExportEntities('postgresql')).not.toThrow();
	});
});

describe('validateDbTypeForImportEntities', () => {
	it('should throw an error if the database type is not supported', () => {
		expect(() => validateDbTypeForImportEntities('invalid')).toThrow(
			'Unsupported database type: invalid. Supported types: ' + supportedTypesForImport.join(', '),
		);
	});

	it('should not throw an error if the database type is supported', () => {
		expect(() => validateDbTypeForImportEntities('sqlite')).not.toThrow();
		expect(() => validateDbTypeForImportEntities('postgres')).not.toThrow();
		expect(() => validateDbTypeForImportEntities('sqlite-pooled')).not.toThrow();
		expect(() => validateDbTypeForImportEntities('sqlite-memory')).not.toThrow();
		expect(() => validateDbTypeForImportEntities('postgresql')).not.toThrow();
	});
});
