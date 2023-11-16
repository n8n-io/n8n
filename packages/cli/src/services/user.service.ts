import Container, { Service } from 'typedi';
import type { EntityManager, FindManyOptions, FindOneOptions, FindOptionsWhere } from 'typeorm';
import { In } from 'typeorm';
import { User } from '@db/entities/User';
import type { IUserSettings } from 'n8n-workflow';
import { UserRepository } from '@db/repositories/user.repository';
import { generateUserInviteUrl, getInstanceBaseUrl } from '@/UserManagement/UserManagementHelper';
import type { PublicUser } from '@/Interfaces';
import type { PostHogClient } from '@/posthog';
import { type JwtPayload, JwtService } from './jwt.service';
import { TokenExpiredError } from 'jsonwebtoken';
import { Logger } from '@/Logger';
import { createPasswordSha } from '@/auth/jwt';
import { UserManagementMailer } from '@/UserManagement/email';
import { InternalHooks } from '@/InternalHooks';
import { RoleService } from '@/services/role.service';
import { ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';
import { InternalServerError } from '@/ResponseHelper';
import type { UserRequest } from '@/requests';

@Service()
export class UserService {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly jwtService: JwtService,
		private readonly mailer: UserManagementMailer,
		private readonly roleService: RoleService,
	) {}

	async findOne(options: FindOneOptions<User>) {
		return this.userRepository.findOne({ relations: ['globalRole'], ...options });
	}

	async findOneOrFail(options: FindOneOptions<User>) {
		return this.userRepository.findOneOrFail({ relations: ['globalRole'], ...options });
	}

	async findMany(options: FindManyOptions<User>) {
		return this.userRepository.find(options);
	}

	async findOneBy(options: FindOptionsWhere<User>) {
		return this.userRepository.findOneBy(options);
	}

	create(data: Partial<User>) {
		return this.userRepository.create(data);
	}

	async save(user: Partial<User>) {
		return this.userRepository.save(user);
	}

	async update(userId: string, data: Partial<User>) {
		return this.userRepository.update(userId, data);
	}

	async getByIds(transaction: EntityManager, ids: string[]) {
		return transaction.find(User, { where: { id: In(ids) } });
	}

	getManager() {
		return this.userRepository.manager;
	}

	async updateSettings(userId: string, newSettings: Partial<IUserSettings>) {
		const { settings } = await this.userRepository.findOneOrFail({ where: { id: userId } });

		return this.userRepository.update(userId, { settings: { ...settings, ...newSettings } });
	}

	generatePasswordResetToken(user: User, expiresIn = '20m') {
		return this.jwtService.sign(
			{ sub: user.id, passwordSha: createPasswordSha(user) },
			{ expiresIn },
		);
	}

	generatePasswordResetUrl(user: User) {
		const instanceBaseUrl = getInstanceBaseUrl();
		const url = new URL(`${instanceBaseUrl}/change-password`);

		url.searchParams.append('token', this.generatePasswordResetToken(user));
		url.searchParams.append('mfaEnabled', user.mfaEnabled.toString());

		return url.toString();
	}

	async resolvePasswordResetToken(token: string): Promise<User | undefined> {
		let decodedToken: JwtPayload & { passwordSha: string };
		try {
			decodedToken = this.jwtService.verify(token);
		} catch (e) {
			if (e instanceof TokenExpiredError) {
				this.logger.debug('Reset password token expired', { token });
			} else {
				this.logger.debug('Error verifying token', { token });
			}
			return;
		}

		const user = await this.userRepository.findOne({
			where: { id: decodedToken.sub },
			relations: ['authIdentities', 'globalRole'],
		});

		if (!user) {
			this.logger.debug(
				'Request to resolve password token failed because no user was found for the provided user ID',
				{ userId: decodedToken.sub, token },
			);
			return;
		}

		if (createPasswordSha(user) !== decodedToken.passwordSha) {
			this.logger.debug('Password updated since this token was generated');
			return;
		}

		return user;
	}

	async toPublic(
		user: User,
		options?: { withInviteUrl?: boolean; posthog?: PostHogClient; withScopes?: boolean },
	) {
		const { password, updatedAt, apiKey, authIdentities, ...rest } = user;

		const ldapIdentity = authIdentities?.find((i) => i.providerType === 'ldap');

		let publicUser: PublicUser = {
			...rest,
			signInType: ldapIdentity ? 'ldap' : 'email',
			hasRecoveryCodesLeft: !!user.mfaRecoveryCodes?.length,
		};

		if (options?.withScopes) {
			publicUser.globalScopes = user.globalScopes;
		}

		if (options?.withInviteUrl && publicUser.isPending) {
			publicUser = this.addInviteUrl(publicUser, user.id);
		}

		if (options?.posthog) {
			publicUser = await this.addFeatureFlags(publicUser, options.posthog);
		}

		return publicUser;
	}

	private addInviteUrl(user: PublicUser, inviterId: string) {
		const url = new URL(getInstanceBaseUrl());
		url.pathname = '/signup';
		url.searchParams.set('inviterId', inviterId);
		url.searchParams.set('inviteeId', user.id);

		user.inviteAcceptUrl = url.toString();

		return user;
	}

	private async addFeatureFlags(publicUser: PublicUser, posthog: PostHogClient) {
		// native PostHog implementation has default 10s timeout and 3 retries.. which cannot be updated without affecting other functionality
		// https://github.com/PostHog/posthog-js-lite/blob/a182de80a433fb0ffa6859c10fb28084d0f825c2/posthog-core/src/index.ts#L67
		const timeoutPromise = new Promise<PublicUser>((resolve) => {
			setTimeout(() => {
				resolve(publicUser);
			}, 1500);
		});

		const fetchPromise = new Promise<PublicUser>(async (resolve) => {
			publicUser.featureFlags = await posthog.getFeatureFlags(publicUser);
			resolve(publicUser);
		});

		return Promise.race([fetchPromise, timeoutPromise]);
	}

	private async sendEmails(owner: User, toInviteUsers: { [key: string]: string }) {
		const domain = getInstanceBaseUrl();

		return Promise.all(
			Object.entries(toInviteUsers).map(async ([email, id]) => {
				const inviteAcceptUrl = generateUserInviteUrl(owner.id, id);
				const invitedUser: UserRequest.InviteResponse = {
					user: {
						id,
						email,
						inviteAcceptUrl,
						emailSent: false,
					},
					error: '',
				};

				try {
					const result = await this.mailer.invite({
						email,
						inviteAcceptUrl,
						domain,
					});
					if (result.emailSent) {
						invitedUser.user.emailSent = true;
						delete invitedUser.user?.inviteAcceptUrl;
						void Container.get(InternalHooks).onUserTransactionalEmail({
							user_id: id,
							message_type: 'New user invite',
							public_api: false,
						});
					}

					void Container.get(InternalHooks).onUserInvite({
						user: owner,
						target_user_id: Object.values(toInviteUsers),
						public_api: false,
						email_sent: result.emailSent,
					});
				} catch (e) {
					if (e instanceof Error) {
						void Container.get(InternalHooks).onEmailFailed({
							user: owner,
							message_type: 'New user invite',
							public_api: false,
						});
						this.logger.error('Failed to send email', {
							userId: owner.id,
							inviteAcceptUrl,
							domain,
							email,
						});
						invitedUser.error = e.message;
					}
				}

				return invitedUser;
			}),
		);
	}

	public async inviteMembers(owner: User, emails: string[]) {
		const memberRole = await this.roleService.findGlobalMemberRole();

		const existingUsers = await this.findMany({
			where: { email: In(emails) },
			relations: ['globalRole'],
			select: ['email', 'password', 'id'],
		});

		const existUsersEmails = existingUsers.map((user) => user.email);

		const toCreateUsers = emails.filter((email) => !existUsersEmails.includes(email));

		const pendingUsersToInvite = existingUsers.filter((email) => email.isPending);

		const createdUsers = new Map<string, string>();

		this.logger.debug(
			toCreateUsers.length > 1
				? `Creating ${toCreateUsers.length} user shells...`
				: 'Creating 1 user shell...',
		);

		try {
			await this.getManager().transaction(async (transactionManager) =>
				Promise.all(
					toCreateUsers.map(async (email) => {
						const newUser = Object.assign(new User(), {
							email,
							globalRole: memberRole,
						});
						const savedUser = await transactionManager.save<User>(newUser);
						createdUsers.set(email, savedUser.id);
						return savedUser;
					}),
				),
			);
		} catch (error) {
			ErrorReporter.error(error);
			this.logger.error('Failed to create user shells', { userShells: createdUsers });
			throw new InternalServerError('An error occurred during user creation');
		}

		pendingUsersToInvite.forEach(({ email, id }) => createdUsers.set(email, id));

		const usersInvited = await this.sendEmails(owner, Object.fromEntries(createdUsers));

		return { usersInvited, usersCreated: toCreateUsers };
	}
}
