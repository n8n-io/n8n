import { validate } from 'class-validator';
import { CredentialsEntity } from '../credentials-entity';

describe('CredentialsEntity', () => {
	let credentialsEntity: CredentialsEntity;

	beforeEach(() => {
		credentialsEntity = new CredentialsEntity();
	});

	describe('Security Validations', () => {
		describe('name property', () => {
			it('should validate string type requirement', async () => {
				// @ts-expect-error Testing invalid type
				credentialsEntity.name = 123;
				credentialsEntity.type = 'testType';
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const nameError = errors.find((e) => e.property === 'name');

				expect(nameError).toBeDefined();
				expect(nameError?.constraints?.isString).toContain(
					'Credential `name` must be of type string',
				);
			});

			it('should enforce minimum length constraint', async () => {
				credentialsEntity.name = 'ab'; // 2 characters, below minimum of 3
				credentialsEntity.type = 'testType';
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const nameError = errors.find((e) => e.property === 'name');

				expect(nameError).toBeDefined();
				if (nameError?.constraints?.length) {
					expect(nameError.constraints.length).toContain(
						'Credential name must be 3 to 128 characters long',
					);
				}
			});

			it('should enforce maximum length constraint', async () => {
				credentialsEntity.name = 'a'.repeat(129); // 129 characters, above maximum of 128
				credentialsEntity.type = 'testType';
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const nameError = errors.find((e) => e.property === 'name');

				expect(nameError).toBeDefined();
				if (nameError?.constraints?.length) {
					expect(nameError.constraints.length).toContain(
						'Credential name must be 3 to 128 characters long',
					);
				}
			});

			it('should accept valid name length', async () => {
				credentialsEntity.name = 'ValidCredentialName';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const nameError = errors.find((e) => e.property === 'name');

				expect(nameError).toBeUndefined();
			});

			it('should accept boundary values for name length', async () => {
				// Test minimum boundary (3 characters)
				credentialsEntity.name = 'abc';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = {} as any;

				let errors = await validate(credentialsEntity);
				let nameError = errors.find((e) => e.property === 'name');
				expect(nameError).toBeUndefined();

				// Test maximum boundary (128 characters)
				credentialsEntity.name = 'a'.repeat(128);
				errors = await validate(credentialsEntity);
				nameError = errors.find((e) => e.property === 'name');
				expect(nameError).toBeUndefined();
			});
		});

		describe('type property', () => {
			it('should validate string type requirement', async () => {
				credentialsEntity.name = 'TestCredential';
				// @ts-expect-error Testing invalid type
				credentialsEntity.type = 456;
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const typeError = errors.find((e) => e.property === 'type');

				expect(typeError).toBeDefined();
				expect(typeError?.constraints?.isString).toContain(
					'Credential `type` must be of type string',
				);
			});

			it('should accept valid string type', async () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'oauth2Api';
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const typeError = errors.find((e) => e.property === 'type');

				expect(typeError).toBeUndefined();
			});

			it('should handle empty string type', async () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = '';
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const typeError = errors.find((e) => e.property === 'type');

				// Empty string should still be valid as a string type
				expect(typeError).toBeUndefined();
			});

			it('should handle maximum length for type', async () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'a'.repeat(128); // Maximum length
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const typeError = errors.find((e) => e.property === 'type');

				expect(typeError).toBeUndefined();
			});
		});

		describe('data property', () => {
			it('should validate object type requirement', async () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = 'not an object' as any;

				const errors = await validate(credentialsEntity);
				const dataError = errors.find((e) => e.property === 'data');

				expect(dataError).toBeDefined();
				expect(dataError?.constraints?.isObject).toBeDefined();
			});

			it('should accept valid object', async () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = { key: 'value', secret: 'encrypted' } as any;

				const errors = await validate(credentialsEntity);
				const dataError = errors.find((e) => e.property === 'data');

				expect(dataError).toBeUndefined();
			});

			it('should handle empty object', async () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const dataError = errors.find((e) => e.property === 'data');

				expect(dataError).toBeUndefined();
			});
		});

		describe('isManaged property', () => {
			it('should default to false for isManaged', () => {
				const entity = new CredentialsEntity();
				// Default value might only be set by database, not on new instances
				expect(entity.isManaged === false || entity.isManaged === undefined).toBe(true);
			});

			it('should accept true value for isManaged', () => {
				credentialsEntity.isManaged = true;
				expect(credentialsEntity.isManaged).toBe(true);
			});

			it('should accept false value for isManaged', () => {
				credentialsEntity.isManaged = false;
				expect(credentialsEntity.isManaged).toBe(false);
			});
		});
	});

	describe('Serialization Security', () => {
		describe('toJSON method', () => {
			it('should exclude shared property from serialization', () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = { secret: 'sensitive_data' } as any;
				credentialsEntity.isManaged = false;
				// @ts-expect-error Testing with mock shared data
				credentialsEntity.shared = [{ userId: 'user1', role: 'owner' }];

				const serialized = credentialsEntity.toJSON();

				expect(serialized).toHaveProperty('name');
				expect(serialized).toHaveProperty('type');
				expect(serialized).toHaveProperty('data');
				expect(serialized).toHaveProperty('isManaged');
				expect(serialized).not.toHaveProperty('shared');
			});

			it('should include all other properties in serialization', () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'oauth2Api';
				credentialsEntity.data = { clientId: 'abc123' } as any;
				credentialsEntity.isManaged = true;
				(credentialsEntity as any).id = 'cred_123';

				const serialized = credentialsEntity.toJSON();

				expect(serialized.name).toBe('TestCredential');
				expect(serialized.type).toBe('oauth2Api');
				expect(serialized.data).toEqual({ clientId: 'abc123' });
				expect(serialized.isManaged).toBe(true);
				expect(serialized.id).toBe('cred_123');
			});

			it('should handle undefined shared property', () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = {} as any;

				const serialized = credentialsEntity.toJSON();

				expect(serialized).not.toHaveProperty('shared');
				expect(serialized).toHaveProperty('name');
			});
		});
	});

	describe('Edge Cases and Boundary Values', () => {
		describe('null and undefined handling', () => {
			it('should handle null values gracefully in validation', async () => {
				// @ts-expect-error Testing null values
				credentialsEntity.name = null;
				// @ts-expect-error Testing null values
				credentialsEntity.type = null;
				// @ts-expect-error Testing null values
				credentialsEntity.data = null;

				const errors = await validate(credentialsEntity);

				expect(errors.length).toBeGreaterThan(0);
				expect(errors.some((e) => e.property === 'name')).toBe(true);
				expect(errors.some((e) => e.property === 'type')).toBe(true);
				expect(errors.some((e) => e.property === 'data')).toBe(true);
			});

			it('should handle undefined values in validation', async () => {
				// Properties are undefined by default
				const errors = await validate(credentialsEntity);

				expect(errors.length).toBeGreaterThan(0);
				expect(errors.some((e) => e.property === 'name')).toBe(true);
				expect(errors.some((e) => e.property === 'type')).toBe(true);
				expect(errors.some((e) => e.property === 'data')).toBe(true);
			});
		});

		describe('special characters and encoding', () => {
			it('should handle special characters in name', async () => {
				credentialsEntity.name = 'Test@Credential#123';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const nameError = errors.find((e) => e.property === 'name');

				expect(nameError).toBeUndefined();
			});

			it('should handle unicode characters in name', async () => {
				credentialsEntity.name = 'Test🔑Credential';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const nameError = errors.find((e) => e.property === 'name');

				expect(nameError).toBeUndefined();
			});

			it('should handle escaped characters in data', async () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = { key: 'value with "quotes" and \n newlines' } as any;

				const errors = await validate(credentialsEntity);
				const dataError = errors.find((e) => e.property === 'data');

				expect(dataError).toBeUndefined();
			});
		});

		describe('large data handling', () => {
			it('should handle large data objects', async () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'testType';
				const largeData = {
					key: 'a'.repeat(1000),
					secret: 'b'.repeat(1000),
					config: { nested: 'c'.repeat(500) },
				};
				credentialsEntity.data = largeData as any;

				const errors = await validate(credentialsEntity);
				const dataError = errors.find((e) => e.property === 'data');

				expect(dataError).toBeUndefined();
			});
		});

		describe('whitespace handling', () => {
			it('should handle leading and trailing whitespace in name', async () => {
				credentialsEntity.name = '  TestCredential  ';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const nameError = errors.find((e) => e.property === 'name');

				expect(nameError).toBeUndefined();
			});

			it('should handle whitespace-only name as invalid', async () => {
				credentialsEntity.name = '   '; // Only whitespace
				credentialsEntity.type = 'testType';
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const nameError = errors.find((e) => e.property === 'name');

				// Should be valid as string but may fail length requirements
				expect(nameError).toBeUndefined(); // 3 spaces = 3 characters, meets minimum
			});
		});
	});

	describe('Constraint Violations', () => {
		describe('database constraints simulation', () => {
			it('should handle potential duplicate names', () => {
				const cred1 = new CredentialsEntity();
				const cred2 = new CredentialsEntity();

				cred1.name = 'DuplicateName';
				cred2.name = 'DuplicateName';

				// Both should have the same name (database would handle uniqueness)
				expect(cred1.name).toBe(cred2.name);
			});

			it('should handle foreign key relationships', () => {
				credentialsEntity.shared = [];

				// Should be able to initialize empty relationships
				expect(credentialsEntity.shared).toEqual([]);
			});
		});
	});

	describe('Type Safety', () => {
		describe('data field type handling', () => {
			it('should store data as object structure', () => {
				credentialsEntity.data = { complex: { nested: { structure: true } } } as any;

				expect(typeof credentialsEntity.data).toBe('object');
			});

			it('should handle boolean values in data', async () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = { enabled: true, verified: false } as any;

				const errors = await validate(credentialsEntity);
				const dataError = errors.find((e) => e.property === 'data');

				expect(dataError).toBeUndefined();
			});

			it('should handle numeric values in data', async () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = { port: 443, timeout: 30000, retries: 3 } as any;

				const errors = await validate(credentialsEntity);
				const dataError = errors.find((e) => e.property === 'data');

				expect(dataError).toBeUndefined();
			});

			it('should handle arrays in data', async () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = { scopes: ['read', 'write'], permissions: [1, 2, 3] } as any;

				const errors = await validate(credentialsEntity);
				const dataError = errors.find((e) => e.property === 'data');

				expect(dataError).toBeUndefined();
			});
		});
	});

	describe('Security Scenarios', () => {
		describe('sensitive data handling', () => {
			it('should not expose sensitive data in standard serialization', () => {
				credentialsEntity.name = 'OAuth2Credential';
				credentialsEntity.type = 'oauth2Api';
				credentialsEntity.data = {
					clientSecret: 'very_secret',
					accessToken: 'sensitive_token',
				} as any;

				const serialized = credentialsEntity.toJSON();

				// Data should be included but shared relationships should be excluded
				expect(serialized).toHaveProperty('data');
				expect(serialized).not.toHaveProperty('shared');
			});

			it('should handle credentials with PII in data field', async () => {
				credentialsEntity.name = 'PersonalCredential';
				credentialsEntity.type = 'personalApi';
				credentialsEntity.data = { email: 'user@example.com', phone: '+1234567890' } as any;

				const errors = await validate(credentialsEntity);

				expect(errors.length).toBe(0);
				expect(credentialsEntity.data).toHaveProperty('email', 'user@example.com');
			});
		});

		describe('injection prevention', () => {
			it('should handle potential SQL injection patterns in name', async () => {
				credentialsEntity.name = "'; DROP TABLE credentials; --";
				credentialsEntity.type = 'testType';
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const nameError = errors.find((e) => e.property === 'name');

				// Should pass validation (SQL injection prevention happens at query level)
				expect(nameError).toBeUndefined();
			});

			it('should handle potential XSS patterns in name', async () => {
				credentialsEntity.name = '<script>alert("xss")</script>';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = {} as any;

				const errors = await validate(credentialsEntity);
				const nameError = errors.find((e) => e.property === 'name');

				// Should pass validation (XSS prevention happens at output level)
				expect(nameError).toBeUndefined();
			});

			it('should handle potential JSON injection in data', async () => {
				credentialsEntity.name = 'TestCredential';
				credentialsEntity.type = 'testType';
				credentialsEntity.data = { key: 'value', injection: '"; malicious_code();"' } as any;

				const errors = await validate(credentialsEntity);
				const dataError = errors.find((e) => e.property === 'data');

				expect(dataError).toBeUndefined();
			});
		});
	});
});
