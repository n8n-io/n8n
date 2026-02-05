import { GLOBAL_OWNER_ROLE, GLOBAL_MEMBER_ROLE } from '@n8n/db';
import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import {
	validateExternalSecretsPermissions,
	isChangingExternalSecretExpression,
} from '../validation';

describe('Credentials Validation', () => {
	const ownerUser = mock<User>({ id: 'owner-id', role: GLOBAL_OWNER_ROLE });
	const memberUser = mock<User>({ id: 'member-id', role: GLOBAL_MEMBER_ROLE });
	const errorMessage = 'Lacking permissions to reference external secrets in credentials';

	describe('validateExternalSecretsPermissions', () => {
		it('should pass when credential data contains no external secrets', () => {
			const data = {
				apiKey: 'regular-key',
				domain: 'example.com',
			};

			expect(() => validateExternalSecretsPermissions(memberUser, data)).not.toThrow();
		});

		it('should pass when credential data contains external secrets and user has permission', () => {
			const data = {
				apiKey: '={{ $secrets.myApiKey }}',
				domain: 'example.com',
			};

			expect(() => validateExternalSecretsPermissions(ownerUser, data)).not.toThrow();
		});

		it('should throw BadRequestError when user lacks externalSecret:list permission', () => {
			const data = {
				apiKey: '={{ $secrets.myApiKey }}',
				domain: 'example.com',
			};

			expect(() => validateExternalSecretsPermissions(memberUser, data)).toThrow(errorMessage);
		});

		it('should throw when user lacks permission and uses nested external secrets', () => {
			const data = {
				apiKey: 'regular-key',
				advanced: {
					token: '={{ $secrets.myToken }}',
				},
			};

			expect(() => validateExternalSecretsPermissions(memberUser, data)).toThrow(errorMessage);
		});

		it('should pass when user has permission and uses nested external secrets', () => {
			const data = {
				apiKey: 'regular-key',
				advanced: {
					token: '={{ $secrets.myToken }}',
				},
			};

			expect(() => validateExternalSecretsPermissions(ownerUser, data)).not.toThrow();
		});

		it('should throw when updating nested credential with external secret without permission', () => {
			const existingData = {
				apiKey: 'key',
				config: { token: 'old-token' },
			};
			const newData = {
				apiKey: 'key',
				config: { token: '={{ $secrets.newToken }}' },
			};

			expect(() => validateExternalSecretsPermissions(memberUser, newData, existingData)).toThrow(
				errorMessage,
			);
		});
	});

	describe('isChangingExternalSecretExpression', () => {
		it('should return true when adding a new external secret expression', () => {
			const existingData = { apiKey: 'plain-value' };
			const newData = { apiKey: '={{ $secrets.myKey }}' };

			expect(isChangingExternalSecretExpression(newData, existingData)).toBe(true);
		});

		it('should return true when modifying an existing external secret expression', () => {
			const existingData = { apiKey: '={{ $secrets.oldKey }}' };
			const newData = { apiKey: '={{ $secrets.newKey }}' };

			expect(isChangingExternalSecretExpression(newData, existingData)).toBe(true);
		});

		it('should return false when keeping external secret unchanged while modifying other fields', () => {
			const existingData = { apiKey: '={{ $secrets.myKey }}', domain: 'old.com' };
			const newData = { apiKey: '={{ $secrets.myKey }}', domain: 'new.com' };

			expect(isChangingExternalSecretExpression(newData, existingData)).toBe(false);
		});

		it('should return false when removing an external secret expression', () => {
			const existingData = { apiKey: '={{ $secrets.myKey }}' };
			const newData = { apiKey: 'plain-value' };

			expect(isChangingExternalSecretExpression(newData, existingData)).toBe(false);
		});

		it('should return false when neither version contains external secrets', () => {
			const existingData = { apiKey: 'value1' };
			const newData = { apiKey: 'value2' };

			expect(isChangingExternalSecretExpression(newData, existingData)).toBe(false);
		});

		it('should return true when one external secret changed among multiple fields', () => {
			const existingData = { key1: '={{ $secrets.a }}', key2: '={{ $secrets.b }}' };
			const newData = { key1: '={{ $secrets.a }}', key2: '={{ $secrets.c }}' };

			expect(isChangingExternalSecretExpression(newData, existingData)).toBe(true);
		});

		it('should return true when adding external secret in nested object', () => {
			const existingData = { apiKey: 'plain', config: { token: 'old-token' } };
			const newData = { apiKey: 'plain', config: { token: '={{ $secrets.myToken }}' } };

			expect(isChangingExternalSecretExpression(newData, existingData)).toBe(true);
		});

		it('should return true when modifying external secret in nested object', () => {
			const existingData = { apiKey: 'plain', config: { token: '$secrets.oldToken' } };
			const newData = { apiKey: 'plain', config: { token: '$secrets.newToken' } };

			expect(isChangingExternalSecretExpression(newData, existingData)).toBe(true);
		});

		it('should return false when keeping nested external secret unchanged', () => {
			const existingData = { apiKey: 'plain', config: { token: '={{ $secrets.myToken }}' } };
			const newData = { apiKey: 'plain', config: { token: '={{ $secrets.myToken }}' } };

			expect(isChangingExternalSecretExpression(newData, existingData)).toBe(false);
		});

		it('should return false when removing nested external secret', () => {
			const existingData = { config: { token: '={{ $secrets.myToken }}' } };
			const newData = { config: { token: 'plain-value' } };

			expect(isChangingExternalSecretExpression(newData, existingData)).toBe(false);
		});
	});

	describe('bracket notation support', () => {
		describe('validateExternalSecretsPermissions with bracket notation', () => {
			it('should throw when user lacks permission and uses bracket notation', () => {
				const data = {
					apiKey: "={{ $secrets['vault']['key'] }}",
				};

				expect(() => validateExternalSecretsPermissions(memberUser, data)).toThrow(errorMessage);
			});

			it('should pass when user has permission and uses bracket notation', () => {
				const data = {
					apiKey: "={{ $secrets['vault']['key'] }}",
				};

				expect(() => validateExternalSecretsPermissions(ownerUser, data)).not.toThrow();
			});

			it('should throw when user lacks permission and uses mixed notation', () => {
				const data = {
					apiKey: "={{ $secrets.vault['nested'] }}",
				};

				expect(() => validateExternalSecretsPermissions(memberUser, data)).toThrow(errorMessage);
			});
		});

		describe('isChangingExternalSecretExpression with bracket notation', () => {
			it('should return true when adding bracket notation external secret', () => {
				const existingData = { apiKey: 'plain-value' };
				const newData = { apiKey: "={{ $secrets['vault']['key'] }}" };

				expect(isChangingExternalSecretExpression(newData, existingData)).toBe(true);
			});

			it('should return true when changing from dot to bracket notation', () => {
				const existingData = { apiKey: '={{ $secrets.vault.key }}' };
				const newData = { apiKey: "={{ $secrets['vault']['key'] }}" };

				expect(isChangingExternalSecretExpression(newData, existingData)).toBe(true);
			});

			it('should return false when keeping bracket notation unchanged', () => {
				const existingData = { apiKey: "={{ $secrets['vault']['key'] }}" };
				const newData = { apiKey: "={{ $secrets['vault']['key'] }}" };

				expect(isChangingExternalSecretExpression(newData, existingData)).toBe(false);
			});
		});
	});
});
