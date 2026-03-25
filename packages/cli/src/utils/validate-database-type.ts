export const supportedTypesForExport = [
	'sqlite',
	'sqlite-pooled',
	'sqlite-memory',
	'postgres',
	'postgresql',
];

export const supportedTypesForImport = [
	'sqlite',
	'sqlite-pooled',
	'sqlite-memory',
	'postgres',
	'postgresql',
];

export function validateDbTypeForExportEntities(dbType: string) {
	if (!supportedTypesForExport.includes(dbType.toLowerCase())) {
		throw new Error(
			`Unsupported database type: ${dbType}. Supported types: ${supportedTypesForExport.join(', ')}`,
		);
	}
}

export function validateDbTypeForImportEntities(dbType: string) {
	if (!supportedTypesForImport.includes(dbType.toLowerCase())) {
		throw new Error(
			`Unsupported database type: ${dbType}. Supported types: ${supportedTypesForImport.join(', ')}`,
		);
	}
}
