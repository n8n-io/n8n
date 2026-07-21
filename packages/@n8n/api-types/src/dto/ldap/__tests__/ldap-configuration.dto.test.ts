import { zodObjectFieldsAreAllRequired } from '../../../__tests__/helpers/zod-object-keys-match';
import { UpdateLdapConfigurationDto } from '../ldap-configuration.dto';
import { LdapSyncDto } from '../ldap-sync.dto';

describe('LDAP DTOs', () => {
	describe('UpdateLdapConfigurationDto', () => {
		const fullBody = {
			loginEnabled: true,
			loginLabel: 'LDAP Login',
			connectionUrl: 'ldap://example.com',
			allowUnauthorizedCerts: false,
			connectionSecurity: 'startTls' as const,
			connectionPort: 389,
			baseDn: 'dc=example,dc=com',
			bindingAdminDn: 'cn=admin,dc=example,dc=com',
			bindingAdminPassword: 'password123',
			firstNameAttribute: 'givenName',
			lastNameAttribute: 'sn',
			emailAttribute: 'mail',
			loginIdAttribute: 'uid',
			ldapIdAttribute: 'dn',
			userFilter: '(objectClass=inetOrgPerson)',
			synchronizationEnabled: true,
			synchronizationInterval: 3600,
			searchPageSize: 1000,
			searchTimeout: 5000,
			enforceEmailUniqueness: true,
		};

		it('rejects an empty body with an error for every top-level field - Guards against .optional() / .default() on PUT fields', () => {
			const result = UpdateLdapConfigurationDto.safeParse({});
			assert(!result.success, 'expected empty body to fail validation');

			const erroredFields = new Set(result.error.issues.map((issue) => String(issue.path[0])));
			const requiredFields = Object.keys(UpdateLdapConfigurationDto.schema.shape).sort();

			expect([...erroredFields].sort()).toEqual(requiredFields);
		});

		it('requires every nested field with no optional or default', () => {
			expect(zodObjectFieldsAreAllRequired(UpdateLdapConfigurationDto.schema)).toBe(true);
		});

		it('accepts a complete valid configuration', () => {
			const result = UpdateLdapConfigurationDto.safeParse(fullBody);
			expect(result.success).toBe(true);
			expect(result.data?.connectionUrl).toBe('ldap://example.com');
			expect(result.data?.connectionSecurity).toBe('startTls');
		});

		it('rejects connectionPort as a string instead of number', () => {
			const result = UpdateLdapConfigurationDto.safeParse({
				...fullBody,
				connectionPort: '389',
			});
			assert(!result.success, 'expected a non-numeric connectionPort to fail');
			expect(result.error.issues[0].path).toEqual(['connectionPort']);
		});

		it('rejects invalid connectionSecurity value', () => {
			const result = UpdateLdapConfigurationDto.safeParse({
				...fullBody,
				connectionSecurity: 'bogus',
			});
			assert(!result.success, 'expected an invalid connectionSecurity to fail');
			expect(result.error.issues[0].path).toEqual(['connectionSecurity']);
		});

		it('strips unknown properties during parsing', () => {
			const result = UpdateLdapConfigurationDto.safeParse({
				...fullBody,
				unknownField: 'should-be-ignored',
			});
			expect(result.success).toBe(true);
			expect(result.data?.['unknownField' as keyof typeof result.data]).toBeUndefined();
		});
	});

	describe('LdapSyncDto', () => {
		it('accepts valid live sync type', () => {
			const result = LdapSyncDto.safeParse({ type: 'live' });
			expect(result.success).toBe(true);
			expect(result.data?.type).toBe('live');
		});

		it('accepts valid dry sync type', () => {
			const result = LdapSyncDto.safeParse({ type: 'dry' });
			expect(result.success).toBe(true);
			expect(result.data?.type).toBe('dry');
		});

		it('rejects invalid sync type', () => {
			const result = LdapSyncDto.safeParse({ type: 'weekly' });
			assert(!result.success, 'expected an out-of-enum sync type to fail');
			expect(result.error.issues[0].path).toEqual(['type']);
			expect(result.error.issues[0].code).toBe('invalid_enum_value');
		});

		it('rejects empty body', () => {
			const result = LdapSyncDto.safeParse({});
			assert(!result.success, 'expected an empty body to fail');
			expect(result.error.issues[0].path).toEqual(['type']);
		});

		it('requires every field with no optional or default', () => {
			expect(zodObjectFieldsAreAllRequired(LdapSyncDto.schema)).toBe(true);
		});
	});
});
