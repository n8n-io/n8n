import type { LdapConfig } from '@n8n/constants';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

import { LdapController } from '../ldap.controller.ee';
import type { LdapService } from '../ldap.service.ee';
import type { LdapConfiguration } from '../types';

describe('LdapController', () => {
	const ldapService = mock<LdapService>();
	const eventService = mock<EventService>();
	const controller = new LdapController(ldapService, eventService);

	const baseConfig: LdapConfig = {
		loginEnabled: true,
		loginLabel: 'label',
		connectionUrl: 'connection.url',
		allowUnauthorizedCerts: true,
		connectionSecurity: 'none',
		connectionPort: 1234,
		baseDn: 'dc=example,dc=com',
		bindingAdminDn: 'cn=admin,dc=example,dc=com',
		bindingAdminPassword: 'REAL-PASSWORD',
		firstNameAttribute: 'givenName',
		lastNameAttribute: 'sn',
		emailAttribute: 'mail',
		loginIdAttribute: 'uid',
		ldapIdAttribute: 'uid',
		userFilter: '(uid=jdoe)',
		synchronizationEnabled: true,
		synchronizationInterval: 60,
		searchPageSize: 1,
		searchTimeout: 6,
		enforceEmailUniqueness: true,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getConfig', () => {
		it('blanks bindingAdminPassword when a password is stored', async () => {
			ldapService.loadConfig.mockResolvedValue({
				...baseConfig,
				bindingAdminPassword: 'REAL-PASSWORD',
			});

			const result = await controller.getConfig();

			expect(result.bindingAdminPassword).toBe(CREDENTIAL_BLANKING_VALUE);
		});

		it('returns an empty string when no password is stored', async () => {
			ldapService.loadConfig.mockResolvedValue({ ...baseConfig, bindingAdminPassword: '' });

			const result = await controller.getConfig();

			expect(result.bindingAdminPassword).toBe('');
		});
	});

	describe('updateConfig', () => {
		it('blanks bindingAdminPassword in the response', async () => {
			ldapService.loadConfig.mockResolvedValue({
				...baseConfig,
				bindingAdminPassword: 'REAL-PASSWORD',
			});

			const req = {
				body: { ...baseConfig },
				user: { id: 'user-1' },
			} as unknown as LdapConfiguration.Update;

			const result = await controller.updateConfig(req);

			expect(result.bindingAdminPassword).toBe(CREDENTIAL_BLANKING_VALUE);
		});
	});
});
