import type {
	ScimUser,
	ScimUserCreate,
	ScimListResponse,
	ScimPatchRequestDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { AuthIdentity, User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { UrlService } from '@/services/url.service';

@Service()
export class ScimService {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
	) {}

	/**
	 * Convert n8n User entity to SCIM User format
	 */
	private toScimUser(user: User): ScimUser {
		const baseUrl = this.urlService.getInstanceBaseUrl();
		const scimUser: ScimUser = {
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
			id: user.id,
			userName: user.email,
			name: {
				givenName: user.firstName || undefined,
				familyName: user.lastName || undefined,
			},
			displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
			emails: user.email
				? [
						{
							value: user.email,
							primary: true,
						},
					]
				: undefined,
			active: !user.disabled,
			meta: {
				resourceType: 'User',
				created: user.createdAt.toISOString(),
				lastModified: user.updatedAt.toISOString(),
				location: `${baseUrl}/scim/v2/Users/${user.id}`,
			},
		};

		return scimUser;
	}

	/**
	 * Get all users with SCIM format
	 */
	async getUsers(options: {
		startIndex?: number;
		count?: number;
		filter?: string;
	}): Promise<ScimListResponse> {
		const { startIndex = 1, count = 100, filter } = options;

		// Calculate pagination
		const skip = startIndex - 1;
		const take = Math.min(count, 1000);

		// Build query
		const queryBuilder = this.userRepository.createQueryBuilder('user');

		// Apply filter if provided (basic userName filter support)
		if (filter) {
			// Simple filter parsing for userName eq "email@example.com"
			const userNameMatch = filter.match(/userName\s+eq\s+"([^"]+)"/i);
			if (userNameMatch?.[1]) {
				queryBuilder.where('LOWER(user.email) = LOWER(:email)', { email: userNameMatch[1] });
			}
		}

		// Get total count
		const totalResults = await queryBuilder.getCount();

		// Get paginated results
		const users = await queryBuilder.skip(skip).take(take).getMany();

		// Convert to SCIM format
		const scimUsers = users.map((user) => this.toScimUser(user));

		return {
			schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
			totalResults,
			startIndex,
			itemsPerPage: scimUsers.length,
			Resources: scimUsers,
		};
	}

	/**
	 * Get a single user by ID
	 */
	async getUserById(id: string): Promise<ScimUser | null> {
		const user = await this.userRepository.findOne({ where: { id } });

		if (!user) {
			return null;
		}

		return this.toScimUser(user);
	}

	/**
	 * Create a new user from SCIM data
	 */
	async createUser(scimUser: ScimUserCreate): Promise<ScimUser> {
		try {
			// Extract user data from SCIM format
			const email = scimUser.userName;
			const firstName = scimUser.name?.givenName ?? '';
			const lastName = scimUser.name?.familyName ?? '';
			const active = scimUser.active ?? true;
			const externalId = scimUser.externalId;

			this.logger.info('SCIM: Starting user creation', {
				email,
				firstName,
				lastName,
				active,
				externalId,
				hasName: !!scimUser.name,
			});

			// Check if user already exists
			this.logger.debug('SCIM: Checking if user already exists', { email });
			const existingUser = await this.userRepository.findOne({ where: { email } });
			if (existingUser) {
				this.logger.warn('SCIM: User with this email already exists', {
					email,
					userId: existingUser.id,
				});
				throw new UnexpectedError('User with this email already exists');
			}
			this.logger.debug('SCIM: No existing user found, proceeding with creation');

			// Determine which SSO provider is enabled
			const isOidcEnabled = this.globalConfig.sso.oidc.loginEnabled;
			const isSamlEnabled = this.globalConfig.sso.saml.loginEnabled;
			const providerType = isOidcEnabled ? 'oidc' : isSamlEnabled ? 'saml' : null;

			this.logger.info('SCIM: SSO provider configuration', {
				isOidcEnabled,
				isSamlEnabled,
				providerType,
				hasExternalId: !!externalId,
				willCreateAuthIdentity: !!(providerType && externalId),
			});

			// Create user and auth identity in a transaction
			this.logger.debug('SCIM: Starting database transaction');
			return await this.userRepository.manager.transaction(async (trx) => {
				// Create user entity
				this.logger.debug('SCIM: Creating user entity', {
					email,
					firstName,
					lastName,
					disabled: !active,
				});
				const user = this.userRepository.create({
					email,
					firstName,
					lastName,
					password: null, // SCIM provisioned users start with no password (pending state)
					disabled: !active,
				});

				// Save the user
				this.logger.debug('SCIM: Saving user to database');
				await trx.save(user);
				this.logger.info('SCIM: User saved successfully', { userId: user.id, email: user.email });

				// Create auth identity for SSO integration if externalId is provided
				// Use OIDC if enabled, otherwise SAML
				if (providerType && externalId) {
					this.logger.debug('SCIM: Creating auth identity', {
						userId: user.id,
						providerType,
						providerId: externalId,
					});

					const authIdentity = trx.create(AuthIdentity, {
						providerId: externalId, // Use externalId from identity provider (e.g., OIDC 'sub' or SAML 'userPrincipalName')
						providerType,
						userId: user.id,
					});

					await trx.save(authIdentity);
					this.logger.info('SCIM: Auth identity created successfully', {
						userId: user.id,
						providerType,
					});
				} else {
					this.logger.warn('SCIM: No auth identity created', {
						userId: user.id,
						reason: !providerType ? 'No SSO provider enabled' : 'No externalId provided',
						providerType,
						externalId,
					});
				}

				this.logger.debug('SCIM: Converting user to SCIM format');
				const scimUserResponse = this.toScimUser(user);
				this.logger.info('SCIM: User creation completed successfully', {
					userId: user.id,
					email: user.email,
				});

				return scimUserResponse;
			});
		} catch (error) {
			this.logger.error('SCIM: Error creating user', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				scimUserName: scimUser.userName,
			});
			throw error;
		}
	}

	/**
	 * Update a user via SCIM PATCH operation
	 */
	async patchUser(id: string, patchRequest: ScimPatchRequestDto): Promise<ScimUser> {
		const user = await this.userRepository.findOne({ where: { id } });

		if (!user) {
			throw new UnexpectedError('User not found');
		}

		// Process patch operations
		for (const operation of patchRequest.Operations) {
			const { op, path, value } = operation;

			if (op === 'replace') {
				// Handle active status
				if (
					path === 'active' ||
					(!path && typeof value === 'object' && value !== null && 'active' in value)
				) {
					const activeValue =
						typeof value === 'boolean' ? value : (value as { active: boolean }).active;
					user.disabled = !activeValue;
				}

				// Handle name changes
				if (!path && typeof value === 'object' && value !== null) {
					const valueObj = value as Record<string, unknown>;
					if ('name' in valueObj && typeof valueObj.name === 'object' && valueObj.name !== null) {
						const name = valueObj.name as { givenName?: string; familyName?: string };
						if (name.givenName !== undefined) user.firstName = name.givenName;
						if (name.familyName !== undefined) user.lastName = name.familyName;
					}
				}
			}
		}

		await this.userRepository.save(user);

		return this.toScimUser(user);
	}

	/**
	 * Update a user via SCIM PUT operation
	 */
	async updateUser(id: string, scimUser: ScimUserCreate): Promise<ScimUser> {
		const user = await this.userRepository.findOne({ where: { id } });

		if (!user) {
			throw new UnexpectedError('User not found');
		}

		// Update user fields
		if (scimUser.name?.givenName !== undefined) {
			user.firstName = scimUser.name.givenName;
		}
		if (scimUser.name?.familyName !== undefined) {
			user.lastName = scimUser.name.familyName;
		}
		if (scimUser.active !== undefined) {
			user.disabled = !scimUser.active;
		}

		await this.userRepository.save(user);

		return this.toScimUser(user);
	}

	/**
	 * Delete a user (soft delete by disabling)
	 */
	async deleteUser(id: string): Promise<void> {
		const user = await this.userRepository.findOne({ where: { id } });

		if (!user) {
			throw new UnexpectedError('User not found');
		}

		// Soft delete by disabling the user
		user.disabled = true;
		await this.userRepository.save(user);
	}
}
