/**
 * Builds the WHERE clause and parameters for a query to find workflows which have a caller policy of 'any'
 */
export function buildWorkflowsByCallerPolicyAny(
	dbType: 'postgresdb' | 'mysqldb' | 'mariadb' | 'sqlite',
) {
	let whereClause: string;

	const parameters: Record<string, string> = {};

	switch (dbType) {
		case 'postgresdb':
			whereClause = 'workflow.settings::jsonb @> \'{"callerPolicy": "any"}\'';
			break;
		case 'mysqldb':
		case 'mariadb': {
			whereClause = "JSON_EXTRACT(workflow.settings, '$callerPolicy') = :policy";
			parameters['policy'] = 'any';
			break;
		}
		case 'sqlite': {
			whereClause = "json_extract(workflow.settings, '$.callerPolicy') = :policy";
			parameters['policy'] = 'any';
			break;
		}
		default:
			throw new Error('Unsupported database type');
	}

	return { whereClause, parameters };
}
