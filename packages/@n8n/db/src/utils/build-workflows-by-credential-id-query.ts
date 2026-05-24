/**
 * Builds the WHERE clause and parameters for a query that finds workflows
 * where any node references the given credential ID inside its `credentials`
 * map (`node.credentials[type].id`).
 */
export function buildWorkflowsByCredentialIdQuery(
	credentialId: string,
	dbType: 'postgresdb' | 'sqlite',
) {
	const parameters: Record<string, string> = { credentialId };
	let whereClause: string;

	switch (dbType) {
		case 'postgresdb':
			whereClause = `EXISTS (
					SELECT 1
					FROM jsonb_array_elements(workflow.nodes::jsonb) AS node,
						LATERAL jsonb_each(node->'credentials') AS cred
					WHERE jsonb_typeof(node->'credentials') = 'object'
						AND cred.value->>'id' = :credentialId
				)`;
			break;
		case 'sqlite':
			whereClause = `EXISTS (
					SELECT 1
					FROM json_each(workflow.nodes) AS node
					WHERE json_extract(node.value, '$.credentials') IS NOT NULL
						AND EXISTS (
							SELECT 1
							FROM json_each(json_extract(node.value, '$.credentials')) AS cred
							WHERE json_extract(cred.value, '$.id') = :credentialId
						)
				)`;
			break;
		default:
			throw new Error('Unsupported database type');
	}

	return { whereClause, parameters };
}
