export const supportedTypes = [
	'sqlite',
	'sqlite-pooled',
	'sqlite-memory',
	'postgres',
	'postgresql',
	'mysql',
	'mariadb',
	'mysqldb',
];

export function validateDbTypeForExportEntities(dbType: string) {
	if (!supportedTypes.includes(dbType.toLowerCase())) {
		throw new Error(
			`Unsupported database type: ${dbType}. Supported types: ${supportedTypes.join(', ')}`,
		);
	}
}

export const validateDbTypeForImportEntities = validateDbTypeForExportEntities;
