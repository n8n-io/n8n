/**
 * Builds the WHERE clause and parameters to find workflows referencing a credential ID.
 */
export function buildWorkflowsByCredentialIdQuery(
	credentialId: string,
	dbType: 'postgresdb' | 'mysqldb' | 'mariadb' | 'sqlite',
) {
	let whereClause: string;
	const parameterName = 'credentialId';

	switch (dbType) {
		case 'postgresdb':
			whereClause = `EXISTS (
				SELECT 1
				FROM jsonb_array_elements(workflow.nodes::jsonb) AS node
				CROSS JOIN LATERAL jsonb_each(COALESCE(node->'credentials', '{}'::jsonb)) AS credential
				WHERE credential.value->>'id' = :${parameterName}
			)`;
			break;
		case 'mysqldb':
		case 'mariadb':
			whereClause = `JSON_SEARCH(workflow.nodes, 'one', :${parameterName}, NULL, '$[*].credentials.*.id') IS NOT NULL`;
			break;
		case 'sqlite':
			whereClause = `EXISTS (
				SELECT 1
				FROM json_tree(workflow.nodes)
				WHERE json_tree.path LIKE '$[%].credentials.%'
					AND json_tree.key = 'id'
					AND json_tree.value = :${parameterName}
			)`;
			break;
		default:
			throw new Error('Unsupported database type');
	}

	return {
		whereClause,
		parameters: {
			[parameterName]: credentialId,
		},
	};
}
