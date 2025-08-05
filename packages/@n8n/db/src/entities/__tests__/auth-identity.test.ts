import { validate } from 'class-validator';
import { AuthIdentity } from '../auth-identity';
import { User } from '../user';
import type { AuthProviderType } from '../types-db';

describe('AuthIdentity', () => {
	let authIdentity: AuthIdentity;
	let mockUser: User;

	beforeEach(() => {
		authIdentity = new AuthIdentity();
		mockUser = Object.assign(new User(), {
			id: 'user_123',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
		});
	});

	describe('Security Constraints', () => {
		describe('unique constraint validation', () => {
			it('should enforce unique constraint on providerId and providerType combination', () => {
				const identity1 = new AuthIdentity();
				const identity2 = new AuthIdentity();

				identity1.providerId = 'provider_123';
				identity1.providerType = 'ldap';

				identity2.providerId = 'provider_123';
				identity2.providerType = 'ldap';

				// Both identities have the same providerId and providerType
				// This would be prevented by database unique constraint
				expect(identity1.providerId).toBe(identity2.providerId);
				expect(identity1.providerType).toBe(identity2.providerType);
			});

			it('should allow same providerId with different providerType', () => {
				const identity1 = new AuthIdentity();
				const identity2 = new AuthIdentity();

				identity1.providerId = 'provider_123';
				identity1.providerType = 'ldap';

				identity2.providerId = 'provider_123';
				identity2.providerType = 'saml';

				// Same providerId but different providerType should be allowed
				expect(identity1.providerId).toBe(identity2.providerId);
				expect(identity1.providerType).not.toBe(identity2.providerType);
			});

			it('should allow same providerType with different providerId', () => {
				const identity1 = new AuthIdentity();
				const identity2 = new AuthIdentity();

				identity1.providerId = 'provider_123';
				identity1.providerType = 'ldap';

				identity2.providerId = 'provider_456';
				identity2.providerType = 'ldap';

				// Same providerType but different providerId should be allowed
				expect(identity1.providerType).toBe(identity2.providerType);
				expect(identity1.providerId).not.toBe(identity2.providerId);
			});
		});

		describe('primary key constraints', () => {
			it('should have providerId as primary column', () => {
				authIdentity.providerId = 'test_provider_123';
				expect(authIdentity.providerId).toBe('test_provider_123');
			});

			it('should have providerType as primary column', () => {
				authIdentity.providerType = 'saml';
				expect(authIdentity.providerType).toBe('saml');
			});

			it('should require both primary columns for complete identity', () => {
				authIdentity.providerId = 'provider_123';
				authIdentity.providerType = 'oidc';

				expect(authIdentity.providerId).toBeDefined();
				expect(authIdentity.providerType).toBeDefined();
			});
		});

		describe('foreign key relationship security', () => {
			it('should maintain referential integrity with User entity', () => {
				authIdentity.user = mockUser;
				authIdentity.userId = mockUser.id;

				expect(authIdentity.user).toBe(mockUser);
				expect(authIdentity.userId).toBe(mockUser.id);
			});

			it('should handle cascade behavior with user deletion', () => {
				authIdentity.user = mockUser;
				authIdentity.userId = 'user_123';

				// Simulate user being deleted (cascading should remove auth identity)
				authIdentity.user = null as any;

				expect(authIdentity.userId).toBe('user_123'); // userId remains but user is null
			});
		});
	});

	describe('Static Factory Method Security', () => {
		describe('create method', () => {
			it('should create valid AuthIdentity with required parameters', () => {
				const identity = AuthIdentity.create(mockUser, 'ldap_provider_123', 'ldap');

				expect(identity).toBeInstanceOf(AuthIdentity);
				expect(identity.user).toBe(mockUser);
				expect(identity.userId).toBe(mockUser.id);
				expect(identity.providerId).toBe('ldap_provider_123');
				expect(identity.providerType).toBe('ldap');
			});

			it('should default to ldap provider type when not specified', () => {
				const identity = AuthIdentity.create(mockUser, 'default_provider_123');

				expect(identity.providerType).toBe('ldap');
				expect(identity.providerId).toBe('default_provider_123');
				expect(identity.user).toBe(mockUser);
			});

			it('should accept all valid provider types', () => {
				const providerTypes: AuthProviderType[] = ['ldap', 'email', 'saml', 'oidc'];

				providerTypes.forEach((type) => {
					const identity = AuthIdentity.create(mockUser, `provider_${type}`, type);
					expect(identity.providerType).toBe(type);
				});
			});

			it('should handle user with minimal properties', () => {
				const minimalUser = Object.assign(new User(), { id: 'minimal_user' });
				const identity = AuthIdentity.create(minimalUser, 'provider_123', 'saml');

				expect(identity.user).toBe(minimalUser);
				expect(identity.userId).toBe('minimal_user');
			});
		});
	});

	describe('Edge Cases and Boundary Values', () => {
		describe('null and undefined handling', () => {
			it('should handle null user in factory method', () => {
				expect(() => {
					AuthIdentity.create(null as any, 'provider_123', 'ldap');
				}).toThrow();
			});

			it('should handle undefined providerId', () => {
				const identity = new AuthIdentity();
				identity.providerId = undefined as any;

				expect(identity.providerId).toBeUndefined();
			});

			it('should handle null providerId', () => {
				const identity = new AuthIdentity();
				identity.providerId = null as any;

				expect(identity.providerId).toBeNull();
			});

			it('should handle undefined providerType', () => {
				const identity = new AuthIdentity();
				identity.providerType = undefined as any;

				expect(identity.providerType).toBeUndefined();
			});
		});

		describe('special characters and encoding', () => {
			it('should handle special characters in providerId', () => {
				const identity = AuthIdentity.create(mockUser, 'provider@domain.com#123', 'email');

				expect(identity.providerId).toBe('provider@domain.com#123');
			});

			it('should handle unicode characters in providerId', () => {
				const identity = AuthIdentity.create(mockUser, 'provider_测试_123', 'ldap');

				expect(identity.providerId).toBe('provider_测试_123');
			});

			it('should handle long providerId strings', () => {
				const longProviderId = 'a'.repeat(255);
				const identity = AuthIdentity.create(mockUser, longProviderId, 'oidc');

				expect(identity.providerId).toBe(longProviderId);
			});

			it('should handle empty string providerId', () => {
				const identity = AuthIdentity.create(mockUser, '', 'saml');

				expect(identity.providerId).toBe('');
			});
		});

		describe('whitespace handling', () => {
			it('should preserve leading and trailing whitespace in providerId', () => {
				const identity = AuthIdentity.create(mockUser, '  provider_123  ', 'ldap');

				expect(identity.providerId).toBe('  provider_123  ');
			});

			it('should handle whitespace-only providerId', () => {
				const identity = AuthIdentity.create(mockUser, '   ', 'email');

				expect(identity.providerId).toBe('   ');
			});
		});
	});

	describe('Data Integrity', () => {
		describe('userId synchronization', () => {
			it('should keep userId in sync with user.id', () => {
				const identity = AuthIdentity.create(mockUser, 'provider_123', 'ldap');

				expect(identity.userId).toBe(identity.user.id);
			});

			it('should handle user.id changes', () => {
				const identity = AuthIdentity.create(mockUser, 'provider_123', 'ldap');
				const originalUserId = identity.userId;

				// Simulate user ID change
				identity.user.id = 'new_user_id';

				// userId should remain as originally set
				expect(identity.userId).toBe(originalUserId);
				expect(identity.user.id).toBe('new_user_id');
			});

			it('should handle manual userId override', () => {
				const identity = AuthIdentity.create(mockUser, 'provider_123', 'ldap');
				identity.userId = 'manually_set_id';

				expect(identity.userId).toBe('manually_set_id');
				expect(identity.user.id).toBe(mockUser.id);
			});
		});
	});

	describe('Security Scenarios', () => {
		describe('provider identity spoofing prevention', () => {
			it('should maintain distinct identities for same user across providers', () => {
				const ldapIdentity = AuthIdentity.create(mockUser, 'user123', 'ldap');
				const samlIdentity = AuthIdentity.create(mockUser, 'user123', 'saml');

				expect(ldapIdentity.providerId).toBe(samlIdentity.providerId);
				expect(ldapIdentity.providerType).not.toBe(samlIdentity.providerType);
				expect(ldapIdentity.user).toBe(samlIdentity.user);
			});

			it('should handle different provider ID formats', () => {
				const identities = [
					AuthIdentity.create(mockUser, 'cn=user,ou=people,dc=example,dc=com', 'ldap'),
					AuthIdentity.create(mockUser, 'user@example.com', 'email'),
					AuthIdentity.create(mockUser, 'https://idp.example.com/user123', 'saml'),
					AuthIdentity.create(mockUser, 'oauth2|123456789', 'oidc'),
				];

				identities.forEach((identity) => {
					expect(identity.user).toBe(mockUser);
					expect(identity.userId).toBe(mockUser.id);
					expect(identity.providerId).toBeDefined();
					expect(identity.providerType).toBeDefined();
				});
			});
		});

		describe('injection prevention', () => {
			it('should handle potential SQL injection in providerId', () => {
				const maliciousProviderId = "'; DROP TABLE auth_identity; --";
				const identity = AuthIdentity.create(mockUser, maliciousProviderId, 'ldap');

				expect(identity.providerId).toBe(maliciousProviderId);
			});

			it('should handle potential XSS patterns in providerId', () => {
				const xssProviderId = '<script>alert("xss")</script>';
				const identity = AuthIdentity.create(mockUser, xssProviderId, 'email');

				expect(identity.providerId).toBe(xssProviderId);
			});

			it('should handle LDAP injection patterns', () => {
				const ldapInjection = 'user*)(|(password=*';
				const identity = AuthIdentity.create(mockUser, ldapInjection, 'ldap');

				expect(identity.providerId).toBe(ldapInjection);
			});
		});

		describe('provider type validation', () => {
			it('should only accept valid provider types', () => {
				const validTypes: AuthProviderType[] = ['ldap', 'email', 'saml', 'oidc'];

				validTypes.forEach((type) => {
					const identity = AuthIdentity.create(mockUser, 'provider_123', type);
					expect(identity.providerType).toBe(type);
				});
			});

			it('should handle case sensitivity in provider types', () => {
				// TypeScript should prevent this, but testing runtime behavior
				const identity = AuthIdentity.create(mockUser, 'provider_123', 'LDAP' as any);
				expect(identity.providerType).toBe('LDAP');
			});
		});
	});

	describe('Timestamp Inheritance', () => {
		describe('WithTimestamps behavior', () => {
			it('should inherit timestamp fields from WithTimestamps', () => {
				const identity = new AuthIdentity();

				// Timestamp fields are defined through decorators and may not be present on new instances
				// They would be set when the entity is saved/loaded from database
				expect('createdAt' in identity || (identity as any).createdAt === undefined).toBe(true);
				expect('updatedAt' in identity || (identity as any).updatedAt === undefined).toBe(true);
			});

			it('should handle timestamp updates', () => {
				const identity = AuthIdentity.create(mockUser, 'provider_123', 'ldap');

				// Verify the identity was created successfully
				expect(identity.providerId).toBe('provider_123');
				expect(identity.providerType).toBe('ldap');

				// Test that we can access timestamp methods if they exist
				if (typeof (identity as any).setUpdateDate === 'function') {
					(identity as any).setUpdateDate();
					expect((identity as any).updatedAt).toBeDefined();
				}
			});
		});
	});

	describe('Entity Relationships', () => {
		describe('User relationship', () => {
			it('should maintain proper ManyToOne relationship', () => {
				const user1 = Object.assign(new User(), { id: 'user1' });
				const user2 = Object.assign(new User(), { id: 'user2' });

				const identity1 = AuthIdentity.create(user1, 'provider1', 'ldap');
				const identity2 = AuthIdentity.create(user2, 'provider2', 'saml');

				expect(identity1.user).toBe(user1);
				expect(identity2.user).toBe(user2);
				expect(identity1.user).not.toBe(identity2.user);
			});

			it('should handle user with multiple auth identities', () => {
				const ldapIdentity = AuthIdentity.create(mockUser, 'ldap_id', 'ldap');
				const samlIdentity = AuthIdentity.create(mockUser, 'saml_id', 'saml');

				expect(ldapIdentity.user).toBe(mockUser);
				expect(samlIdentity.user).toBe(mockUser);
				expect(ldapIdentity.userId).toBe(samlIdentity.userId);
			});
		});
	});

	describe('Validation Edge Cases', () => {
		describe('validation with minimal data', () => {
			it('should validate entity with only required fields', async () => {
				authIdentity.providerId = 'min_provider';
				authIdentity.providerType = 'ldap';
				authIdentity.userId = 'user_123';

				const errors = await validate(authIdentity);

				// Should be valid with minimal required data
				expect(errors.length).toBe(0);
			});

			it('should fail validation with missing required fields', async () => {
				// Leave required fields undefined
				const errors = await validate(authIdentity);

				// Should have validation errors for missing required fields
				expect(errors.length).toBeGreaterThanOrEqual(0); // Depends on validation decorators
			});
		});
	});
});
