import {
	getMissingRoleDefaultStatements,
	getMissingRoleDefaultsWarning,
} from '../postgres-session-defaults';

describe('getMissingRoleDefaultStatements', () => {
	const settings = { database: 'n8n', schema: 'n8n', statementTimeoutMs: 300_000 };

	it('should return nothing when the role defaults match', () => {
		expect(
			getMissingRoleDefaultStatements(settings, { schema: 'n8n', statementTimeout: '300000' }),
		).toEqual([]);
	});

	it('should return both statements when the role has no defaults', () => {
		expect(
			getMissingRoleDefaultStatements(settings, { schema: 'public', statementTimeout: '0' }),
		).toEqual([
			'ALTER ROLE CURRENT_USER IN DATABASE "n8n" SET search_path = "n8n", public;',
			'ALTER ROLE CURRENT_USER IN DATABASE "n8n" SET statement_timeout = 300000;',
		]);
	});

	it('should return the timeout statement when only the timeout differs', () => {
		expect(
			getMissingRoleDefaultStatements(settings, { schema: 'n8n', statementTimeout: '60000' }),
		).toEqual(['ALTER ROLE CURRENT_USER IN DATABASE "n8n" SET statement_timeout = 300000;']);
	});

	it('should accept the public schema when the role default resolves to it', () => {
		expect(
			getMissingRoleDefaultStatements(
				{ ...settings, schema: 'public' },
				{ schema: 'public', statementTimeout: '300000' },
			),
		).toEqual([]);
	});

	it('should ask for a search_path default when the role resolves elsewhere on the public schema', () => {
		expect(
			getMissingRoleDefaultStatements(
				{ ...settings, schema: 'public' },
				{ schema: 'private', statementTimeout: '300000' },
			),
		).toEqual(['ALTER ROLE CURRENT_USER IN DATABASE "n8n" SET search_path = public;']);
	});

	it('should ask for a search_path default when no schema in the role default exists', () => {
		expect(
			getMissingRoleDefaultStatements(settings, { schema: null, statementTimeout: '300000' }),
		).toEqual(['ALTER ROLE CURRENT_USER IN DATABASE "n8n" SET search_path = "n8n", public;']);
	});

	it('should not ask for a timeout default when the timeout is disabled', () => {
		expect(
			getMissingRoleDefaultStatements(
				{ ...settings, statementTimeoutMs: 0 },
				{ schema: 'n8n', statementTimeout: '0' },
			),
		).toEqual([]);
	});

	it('should quote identifiers in the statements', () => {
		expect(
			getMissingRoleDefaultStatements(
				{ database: 'my"db', schema: 'a"b', statementTimeoutMs: 0 },
				{ schema: 'public', statementTimeout: null },
			),
		).toEqual(['ALTER ROLE CURRENT_USER IN DATABASE "my""db" SET search_path = "a""b", public;']);
	});
});

describe('getMissingRoleDefaultsWarning', () => {
	it('should return null when the role defaults match', () => {
		expect(
			getMissingRoleDefaultsWarning(
				{ database: 'n8n', schema: 'public', statementTimeoutMs: 0 },
				{ schema: 'public', statementTimeout: '0' },
			),
		).toBeNull();
	});

	it('should name the setting and the statements to run', () => {
		const warning = getMissingRoleDefaultsWarning(
			{ database: 'n8n', schema: 'public', statementTimeoutMs: 300_000 },
			{ schema: 'public', statementTimeout: '0' },
		);

		expect(warning).toContain('DB_POSTGRESDB_APPLY_SESSION_SETTINGS_ONCE');
		expect(warning).toContain(
			'ALTER ROLE CURRENT_USER IN DATABASE "n8n" SET statement_timeout = 300000;',
		);
		expect(warning).toContain('reconnect the pooler');
	});
});
