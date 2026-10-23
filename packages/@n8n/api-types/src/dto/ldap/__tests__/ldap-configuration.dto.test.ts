import {
	zodObjectFieldsAreAllRequired,
	zodObjectKeysMatch,
} from '../../../__tests__/helpers/zod-object-keys-match';
import {
	LdapConfigurationPublicDto,
	UpdateLdapConfigurationPublicDto,
} from '../ldap-configuration-public.dto';
import { LdapSyncHistoryPublicDto, RunLdapSyncPublicDto } from '../ldap-sync-public.dto';

describe('LDAP DTOs', () => {
	describe('UpdateLdapConfigurationPublicDto', () => {
		const fullBody: UpdateLdapConfigurationPublicDto = {
			loginEnabled: true,
			loginLabel: 'LDAP Login',
			connectionUrl: 'ldap://example.com',
			allowUnauthorizedCerts: false,
			connectionSecurity: 'startTls',
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

		it('requires every field with no optional or default - guards against .optional() / .default() on PUT fields', () => {
			expect(zodObjectFieldsAreAllRequired(UpdateLdapConfigurationPublicDto.schema)).toBe(true);
		});

		it('uses the same fields as the GET response', () => {
			expect(
				zodObjectKeysMatch(
					UpdateLdapConfigurationPublicDto.schema,
					LdapConfigurationPublicDto.schema,
				),
			).toBe(true);
		});

		it('accepts a complete valid configuration', () => {
			const result = UpdateLdapConfigurationPublicDto.safeParse(fullBody);
			expect(result.success).toBe(true);
			expect(result.data?.connectionUrl).toBe('ldap://example.com');
			expect(result.data?.connectionSecurity).toBe('startTls');
		});

		it('returns non-integer numbers the editor can store and rejects them on update', () => {
			const withFractions = {
				...fullBody,
				connectionPort: 389.5,
				synchronizationInterval: 60.5,
				searchPageSize: 1000.5,
				searchTimeout: 60.5,
			};

			expect(LdapConfigurationPublicDto.safeParse(withFractions).success).toBe(true);

			const update = UpdateLdapConfigurationPublicDto.safeParse(withFractions);
			assert(!update.success, 'expected a non-integer connectionPort to fail');
			expect(update.error.issues[0].path).toEqual(['connectionPort']);
		});

		it('rejects connectionPort as a string instead of number', () => {
			const result = UpdateLdapConfigurationPublicDto.safeParse({
				...fullBody,
				connectionPort: '389',
			});
			assert(!result.success, 'expected a non-numeric connectionPort to fail');
			expect(result.error.issues[0].path).toEqual(['connectionPort']);
		});

		it('rejects invalid connectionSecurity value', () => {
			const result = UpdateLdapConfigurationPublicDto.safeParse({
				...fullBody,
				connectionSecurity: 'bogus',
			});
			assert(!result.success, 'expected an invalid connectionSecurity to fail');
			expect(result.error.issues[0].path).toEqual(['connectionSecurity']);
		});

		it('rejects unknown properties', () => {
			const result = UpdateLdapConfigurationPublicDto.safeParse({
				...fullBody,
				unknownField: 'should-be-rejected',
			});
			assert(!result.success, 'expected an unknown property to fail');
			expect(result.error.issues[0].code).toBe('unrecognized_keys');
		});
	});

	describe('RunLdapSyncPublicDto', () => {
		it('accepts valid live sync type', () => {
			const result = RunLdapSyncPublicDto.safeParse({ type: 'live' });
			expect(result.success).toBe(true);
			expect(result.data?.type).toBe('live');
		});

		it('accepts valid dry sync type', () => {
			const result = RunLdapSyncPublicDto.safeParse({ type: 'dry' });
			expect(result.success).toBe(true);
			expect(result.data?.type).toBe('dry');
		});

		it('rejects invalid sync type', () => {
			const result = RunLdapSyncPublicDto.safeParse({ type: 'weekly' });
			assert(!result.success, 'expected an out-of-enum sync type to fail');
			expect(result.error.issues[0].path).toEqual(['type']);
			expect(result.error.issues[0].code).toBe('invalid_enum_value');
		});

		it('rejects empty body', () => {
			const result = RunLdapSyncPublicDto.safeParse({});
			assert(!result.success, 'expected an empty body to fail');
			expect(result.error.issues[0].path).toEqual(['type']);
		});

		it('rejects unknown properties', () => {
			const result = RunLdapSyncPublicDto.safeParse({ type: 'dry', unknownField: 'nope' });
			assert(!result.success, 'expected an unknown property to fail');
			expect(result.error.issues[0].code).toBe('unrecognized_keys');
		});

		it('requires every field with no optional or default', () => {
			expect(zodObjectFieldsAreAllRequired(RunLdapSyncPublicDto.schema)).toBe(true);
		});
	});

	describe('LdapSyncHistoryPublicDto', () => {
		it('accepts a history record', () => {
			const result = LdapSyncHistoryPublicDto.safeParse({
				id: 1,
				runMode: 'live',
				status: 'success',
				startedAt: '2025-07-21T10:30:00.000Z',
				endedAt: '2025-07-21T10:35:00.000Z',
				scanned: 42,
				created: 5,
				updated: 3,
				disabled: 0,
				error: '',
			});
			expect(result.success).toBe(true);
		});
	});
});
