import { buildWorkflowsByCredentialIdQuery } from '../build-workflows-by-credential-id-query';

describe('buildWorkflowsByCredentialIdQuery', () => {
	it('should return WHERE clause and parameters for sqlite', () => {
		const { whereClause, parameters } = buildWorkflowsByCredentialIdQuery('cred-123', 'sqlite');

		expect(whereClause).toContain("json_extract(node.value, '$.credentials')");
		expect(whereClause).toContain("json_extract(cred.value, '$.id') = :credentialId");
		expect(parameters).toEqual({ credentialId: 'cred-123' });
	});

	it('should return WHERE clause and parameters for postgresdb', () => {
		const { whereClause, parameters } = buildWorkflowsByCredentialIdQuery('cred-123', 'postgresdb');

		expect(whereClause).toContain('jsonb_array_elements(workflow.nodes::jsonb)');
		const normalized = whereClause.replace(/\s+/g, ' ');
		expect(normalized).toContain(
			"LATERAL jsonb_each( CASE WHEN jsonb_typeof(node->'credentials') = 'object' THEN node->'credentials' ELSE '{}'::jsonb END )",
		);
		expect(whereClause).toContain("cred.value->>'id' = :credentialId");
		expect(parameters).toEqual({ credentialId: 'cred-123' });
	});

	it('should throw for an unsupported database type', () => {
		expect(() =>
			// @ts-expect-error - intentionally passing an invalid db type
			buildWorkflowsByCredentialIdQuery('cred-123', 'mysql'),
		).toThrow('Unsupported database type');
	});
});
