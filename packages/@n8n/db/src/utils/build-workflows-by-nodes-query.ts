/**
 * Quotes a column reference for use in raw SQL based on database type.
 * Handles table.column format by quoting each part separately.
 */
function quoteColumnRef(
	column: string,
	dbType: 'postgresdb' | 'mysqldb' | 'mariadb' | 'sqlite',
): string {
	if (!column.includes('.')) {
		return column;
	}

	const [table, col] = column.split('.');
	if (dbType === 'mysqldb' || dbType === 'mariadb') {
		return `\`${table}\`.\`${col}\``;
	}
	// PostgreSQL and SQLite use double quotes
	return `"${table}"."${col}"`;
}

/**
 * Builds the WHERE clause and parameters for a query to find workflows by node types.
 * @param nodeTypes - Array of node types to search for
 * @param dbType - Database type
 * @param nodesColumn - The column to search in (default: 'workflow.nodes')
 * @param paramPrefix - Prefix for parameter names to avoid conflicts when used multiple times (default: '')
 */
export function buildWorkflowsByNodesQuery(
	nodeTypes: string[],
	dbType: 'postgresdb' | 'mysqldb' | 'mariadb' | 'sqlite',
	nodesColumn: string = 'workflow.nodes',
	paramPrefix: string = '',
) {
	let whereClause: string;

	const nodeTypesParam = `${paramPrefix}nodeTypes`;
	const parameters: Record<string, string | string[]> = { [nodeTypesParam]: nodeTypes };
	const quotedColumn = quoteColumnRef(nodesColumn, dbType);

	switch (dbType) {
		case 'postgresdb':
			whereClause = `EXISTS (
					SELECT 1
					FROM jsonb_array_elements(${quotedColumn}::jsonb) AS node
					WHERE node->>'type' = ANY(:${nodeTypesParam})
				)`;
			break;
		case 'mysqldb':
		case 'mariadb': {
			const conditions = nodeTypes
				.map(
					(_, i) =>
						`JSON_SEARCH(JSON_EXTRACT(${quotedColumn}, '$[*].type'), 'one', :${paramPrefix}nodeType${i}) IS NOT NULL`,
				)
				.join(' OR ');

			whereClause = `(${conditions})`;

			nodeTypes.forEach((nodeType, index) => {
				parameters[`${paramPrefix}nodeType${index}`] = nodeType;
			});
			break;
		}
		case 'sqlite': {
			const conditions = nodeTypes
				.map(
					(_, i) =>
						`EXISTS (SELECT 1 FROM json_each(${quotedColumn}) WHERE json_extract(json_each.value, '$.type') = :${paramPrefix}nodeType${i})`,
				)
				.join(' OR ');

			whereClause = `(${conditions})`;

			nodeTypes.forEach((nodeType, index) => {
				parameters[`${paramPrefix}nodeType${index}`] = nodeType;
			});
			break;
		}
		default:
			throw new Error('Unsupported database type');
	}

	return { whereClause, parameters };
}
