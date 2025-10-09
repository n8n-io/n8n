export function validateDbTypeForExportEntities(dbType: string) {
	if (
		!['sqlite', 'sqlite-pooled', 'sqlite-memory', 'postgres', 'postgresql'].includes(
			dbType.toLowerCase(),
		)
	) {
		throw new Error(`Unsupported database type: ${dbType}. Supported types: sqlite, postgres`);
	}
}

export const validateDbTypeForImportEntities = validateDbTypeForExportEntities;
