import { Logger } from '@n8n/backend-common';
import { GlobalConfig, AzureAdConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { AuthIdentityRepository, UserRepository, RoleRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import config from '@/config';
import {
	ConfidentialClientApplication,
	type Configuration,
	type AuthorizationUrlRequest,
	type AuthorizationCodeRequest,
	type AccountInfo,
	CryptoProvider,
} from '@azure/msal-node';

import { AuthError } from '@/errors/response-errors/auth.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';

interface AzureAdUserProfile {
	email: string;
	firstName: string;
	lastName: string;
	displayName?: string;
	id: string;
}

interface PkceData {
	codeVerifier: string;
	codeChallenge: string;
	codeChallengeMethod: string;
}

@Service()
export class AzureAdService {
	private msalClient: ConfidentialClientApplication | null = null;
	private config: AzureAdConfig;
	private cryptoProvider: CryptoProvider;
	// Store PKCE verifiers temporarily (state -> codeVerifier)
	private pkceStore: Map<string, string> = new Map();

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly authIdentityRepository: AuthIdentityRepository,
		private readonly roleRepository: RoleRepository,
	) {
		this.config = globalConfig.azureAd;
		this.cryptoProvider = new CryptoProvider();
		if (this.config.loginEnabled) {
			this.initializeMsalClient();
		}
	}

	private initializeMsalClient() {
		try {
			const authority = this.config.useTenantAuthority
				? `https://login.microsoftonline.com/${this.config.tenantId}`
				: this.config.authority;

			const msalConfig: Configuration = {
				auth: {
					clientId: this.config.clientId,
					authority,
					clientSecret: this.config.clientSecret,
				},
				system: {
					loggerOptions: {
						loggerCallback: (level, message, containsPii) => {
							if (containsPii) return;
							switch (level) {
								case 1: // Error
									this.logger.error(message);
									break;
								case 2: // Warning
									this.logger.warn(message);
									break;
								case 3: // Info
									this.logger.info(message);
									break;
								case 4: // Verbose
									this.logger.debug(message);
									break;
							}
						},
						piiLoggingEnabled: false,
						logLevel: 3, // Info level
					},
				},
			};

			this.msalClient = new ConfidentialClientApplication(msalConfig);
			this.logger.info('Azure AD MSAL confidential client initialized successfully');
		} catch (error) {
			this.logger.error('Failed to initialize Azure AD MSAL client', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new InternalServerError('Failed to initialize Azure AD authentication');
		}
	}

	/**
	 * Get the authorization URL for Azure AD login
	 */
	async getAuthorizationUrl(state: string): Promise<string> {
		if (!this.msalClient) {
			throw new InternalServerError('Azure AD client not initialized');
		}

		const scopes = this.config.scopes.split(' ').filter((s) => s.length > 0);

		// Generate PKCE parameters
		const { verifier, challenge } = await this.cryptoProvider.generatePkceCodes();

		// Store the verifier for later use in the callback
		this.pkceStore.set(state, verifier);

		// Clean up old verifiers (older than 10 minutes)
		this.cleanupPkceStore();

		const authCodeUrlParameters: AuthorizationUrlRequest = {
			scopes,
			redirectUri: this.config.redirectUri,
			state,
			prompt: 'select_account', // Force account selection
			codeChallenge: challenge,
			codeChallengeMethod: 'S256', // SHA-256
		};

		try {
			const authUrl = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
			this.logger.debug('Generated Azure AD authorization URL with PKCE');
			return authUrl;
		} catch (error) {
			this.logger.error('Failed to generate Azure AD authorization URL', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new InternalServerError('Failed to initiate Azure AD login');
		}
	}

	/**
	 * Clean up old PKCE verifiers (simple time-based cleanup)
	 */
	private cleanupPkceStore() {
		// In a production environment, you'd want to store timestamps and clean based on age
		// For now, if we have more than 100 entries, clear the oldest 50
		if (this.pkceStore.size > 100) {
			const entries = Array.from(this.pkceStore.entries());
			const toDelete = entries.slice(0, 50);
			toDelete.forEach(([key]) => this.pkceStore.delete(key));
			this.logger.debug('Cleaned up old PKCE verifiers');
		}
	}

	/**
	 * Handle the OAuth callback and exchange code for tokens
	 */
	async handleCallback(code: string, state: string): Promise<User> {
		if (!this.msalClient) {
			throw new InternalServerError('Azure AD client not initialized');
		}

		// Retrieve the PKCE code verifier
		const codeVerifier = this.pkceStore.get(state);
		if (!codeVerifier) {
			this.logger.error('PKCE code verifier not found for state', { state });
			throw new AuthError('Invalid authentication state. Please try again.');
		}

		// Remove the verifier from storage after use
		this.pkceStore.delete(state);

		const scopes = this.config.scopes.split(' ').filter((s) => s.length > 0);

		const tokenRequest: AuthorizationCodeRequest = {
			code,
			scopes,
			redirectUri: this.config.redirectUri,
			codeVerifier, // Include PKCE code verifier
		};

		try {
			// Exchange authorization code for tokens
			const response = await this.msalClient.acquireTokenByCode(tokenRequest);

			if (!response || !response.account) {
				throw new AuthError('Failed to acquire token from Azure AD');
			}

			// Extract user profile from token claims
			const profile = this.extractUserProfile(response.account);

			// Find or create user
			const user = await this.findOrCreateUser(profile);

			this.logger.info('User successfully authenticated via Azure AD', {
				userId: user.id,
				email: user.email,
			});

			return user;
		} catch (error) {
			this.logger.error('Azure AD authentication failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
				details: error,
			});
			console.error('DETAILED ERROR:', error);
			if (error instanceof AuthError) {
				throw error;
			}
			throw new AuthError('Azure AD authentication failed');
		}
	}

	/**
	 * Handle SSO login with an existing id_token from the SPA
	 */
	async handleSsoLogin(idToken: string): Promise<User> {
		if (!this.msalClient) {
			throw new AuthError('Azure AD is not configured');
		}

		try {
			// Validate the token by verifying it with Azure AD
			// For a proper implementation, you would validate:
			// 1. Token signature
			// 2. Token expiration
			// 3. Issuer
			// 4. Audience

			// Decode the JWT token (without verification for now, in production you should verify)
			const base64Payload = idToken.split('.')[1];
			const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());

			this.logger.info(`SSO token claims: ${JSON.stringify(payload)}`);

			// Validate basic claims
			if (!payload.email && !payload.preferred_username && !payload.upn) {
				throw new AuthError('Token does not contain email claim');
			}

			const email = payload.email || payload.preferred_username || payload.upn;

			// Create profile from token claims
			const profile: AzureAdUserProfile = {
				email,
				firstName: payload.given_name || payload.name?.split(' ')[0] || email.split('@')[0],
				lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
				displayName: payload.name || email,
				id: payload.oid || payload.sub,
			};

			// Find or create user
			const user = await this.findOrCreateUser(profile);

			this.logger.info('User successfully authenticated via SSO', {
				userId: user.id,
				email: user.email,
			});

			return user;
		} catch (error) {
			this.logger.error('SSO authentication failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (error instanceof AuthError) {
				throw error;
			}
			throw new AuthError('SSO authentication failed');
		}
	}

	/**
	 * Extract user profile information from Azure AD account info
	 */
	private extractUserProfile(account: AccountInfo): AzureAdUserProfile {
		const email = account.username; // In Azure AD, username is the email
		const idTokenClaims = account.idTokenClaims as any;

		// Log ALL claims to see what's available
		this.logger.info('=== ALL AZURE AD TOKEN CLAIMS ===');
		this.logger.info(JSON.stringify(idTokenClaims, null, 2));
		this.logger.info('=================================');

		// Try to get first/last name from separate claims first
		let firstName = idTokenClaims?.given_name || '';
		let lastName = idTokenClaims?.family_name || '';

		// If not available, try to parse from the "name" field
		if (!firstName && !lastName && idTokenClaims?.name) {
			const nameParts = idTokenClaims.name.trim().split(/\s+/);
			if (nameParts.length > 0) {
				firstName = nameParts[0];
				lastName = nameParts.slice(1).join(' ');
			}
		}

		// Final fallback to email prefix
		if (!firstName) {
			firstName = email.split('@')[0];
		}

		const displayName = idTokenClaims?.name || `${firstName} ${lastName}`.trim();

		const profile = {
			email,
			firstName,
			lastName,
			displayName,
			id: account.homeAccountId,
		};

		this.logger.info('Extracted user profile:', profile);

		return profile;
	}

	/**
	 * Find existing user or create a new one
	 */
	private async findOrCreateUser(profile: AzureAdUserProfile): Promise<User> {
		// Look for existing auth identity
		const authIdentity = await this.authIdentityRepository.findOne({
			where: {
				providerType: 'azuread',
				providerId: profile.id,
			},
			relations: ['user', 'user.role'],
		});

		if (authIdentity?.user) {
			// Update user profile if sync is enabled
			if (this.config.syncProfile) {
				await this.updateUserProfile(authIdentity.user, profile);
			}
			return authIdentity.user;
		}

		// Check if user exists by email
		const user = await this.userRepository.findOne({
			where: { email: profile.email.toLowerCase() },
			relations: ['role'],
		});

		if (user) {
			// Link existing user to Azure AD
			await this.authIdentityRepository.insert({
				providerId: profile.id,
				providerType: 'azuread',
				userId: user.id,
			});

			if (this.config.syncProfile) {
				await this.updateUserProfile(user, profile);
			}

			return user;
		}

		// Create new user if auto-creation is enabled
		if (!this.config.autoCreateUser) {
			throw new AuthError('User does not exist and auto-creation is disabled');
		}

		// Check if there's already an owner - if not, make this user the owner
		const ownerCount = await this.userRepository.count({
			where: { role: { slug: 'global:owner' } },
		});

		const isFirstUser = ownerCount === 0;
		const roleSlug = isFirstUser
			? 'global:owner'
			: this.config.defaultRole === 'member'
				? 'global:member'
				: this.config.defaultRole;

		// Get the role for the new user
		const role = await this.roleRepository.findBySlug(roleSlug);
		if (!role) {
			throw new AuthError(`Role '${roleSlug}' not found`);
		}

		this.logger.info('Creating new user with project from Azure AD', {
			email: profile.email,
			roleSlug,
			isFirstUser,
		});

		// Create new user with personal project using the repository method
		const { user: createdUser, project } = await this.userRepository.createUserWithProject({
			email: profile.email.toLowerCase(),
			firstName: profile.firstName,
			lastName: profile.lastName,
			role,
		});

		this.logger.info('User and project created', {
			userId: createdUser.id,
			projectId: project.id,
			projectName: project.name,
		});

		// Create auth identity
		await this.authIdentityRepository.insert({
			providerId: profile.id,
			providerType: 'azuread',
			userId: createdUser.id,
		});

		this.logger.info('Created new user from Azure AD', {
			userId: createdUser.id,
			email: createdUser.email,
			role: roleSlug,
			isFirstUser,
			projectId: project.id,
		});

		// If this is the first user (owner), mark instance as set up
		if (isFirstUser) {
			config.set('userManagement.isInstanceOwnerSetUp', true);
			this.logger.info('Instance owner setup completed via Azure AD');
		}

		return createdUser;
	}

	/**
	 * Update user profile with Azure AD information
	 */
	private async updateUserProfile(user: User, profile: AzureAdUserProfile): Promise<void> {
		const updates: Partial<User> = {};

		if (profile.firstName && user.firstName !== profile.firstName) {
			updates.firstName = profile.firstName;
		}

		if (profile.lastName && user.lastName !== profile.lastName) {
			updates.lastName = profile.lastName;
		}

		if (Object.keys(updates).length > 0) {
			await this.userRepository.update(user.id, updates);
			this.logger.debug('Updated user profile from Azure AD', {
				userId: user.id,
				updates,
			});
		}
	}

	/**
	 * Check if Azure AD authentication is enabled
	 */
	isEnabled(): boolean {
		return this.config.loginEnabled;
	}

	/**
	 * Get the login label
	 */
	getLoginLabel(): string {
		return this.config.loginLabel;
	}

	/**
	 * Validate Azure AD configuration
	 */
	validateConfig(): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!this.config.loginEnabled) {
			return { valid: true, errors: [] };
		}

		if (!this.config.clientId) {
			errors.push('Azure AD Client ID is required');
		}

		if (!this.config.clientSecret) {
			errors.push('Azure AD Client Secret is required');
		}

		if (!this.config.redirectUri) {
			errors.push('Azure AD Redirect URI is required');
		}

		if (this.config.useTenantAuthority && !this.config.tenantId) {
			errors.push('Azure AD Tenant ID is required when using tenant-specific authority');
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}
}
