import { buildWorkflowsByCredentialIdQuery } from '../build-workflows-by-credential-id-query';

describe('buildWorkflowsByCredentialIdQuery', () => {
	it('returns postgres query', () => {
		const { whereClause, parameters } = buildWorkflowsByCredentialIdQuery('123', 'postgresdb');

		expect(whereClause).toContain('jsonb_array_elements');
		expect(whereClause).toContain('jsonb_each');
		expect(parameters).toEqual({ credentialId: '123' });
	});

	it('returns mysql query', () => {
		const { whereClause } = buildWorkflowsByCredentialIdQuery('abc', 'mysqldb');

		expect(whereClause).toContain('JSON_SEARCH');
		expect(whereClause).toContain('credentials.*.id');
	});

	it('returns sqlite query', () => {
		const { whereClause } = buildWorkflowsByCredentialIdQuery('xyz', 'sqlite');

		expect(whereClause).toContain('json_tree');
		expect(whereClause).toContain("json_tree.path LIKE '$[%].credentials.%'");
	});

	it('throws for unsupported db', () => {
		expect(() =>
			// @ts-expect-error invalid db type for test coverage
			buildWorkflowsByCredentialIdQuery('id', 'mssql'),
		).toThrow('Unsupported database type');
	});
});
