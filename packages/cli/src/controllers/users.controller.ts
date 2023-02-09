import validator from 'validator';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import type { ILogger } from 'n8n-workflow';
import { ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';
import { User } from '@db/entities/User';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { Delete, Get, Post, RestController } from '@/decorators';
import {
	addInviteLinkToUser,
	generateUserInviteUrl,
	getInstanceBaseUrl,
	hashPassword,
	isEmailSetUp,
	isUserManagementEnabled,
	sanitizeUser,
	validatePassword,
} from '@/UserManagement/UserManagementHelper';
import { issueCookie } from '@/auth/jwt';
import { BadRequestError, InternalServerError, NotFoundError } from '@/ResponseHelper';
import { Response } from 'express';
import type { Config } from '@/config';
import { UserRequest } from '@/requests';
import type { UserManagementMailer } from '@/UserManagement/email';
import type { Role } from '@db/entities/Role';
import type {
	PublicUser,
	IDatabaseCollections,
	IExternalHooksClass,
	IInternalHooksClass,
	ITelemetryUserDeletionData,
} from '@/Interfaces';
import type { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { AuthIdentity } from '@db/entities/AuthIdentity';

@RestController('/users')
export class UsersController {
	private config: Config;

	private logger: ILogger;

	private externalHooks: IExternalHooksClass;

	private internalHooks: IInternalHooksClass;

	private userRepository: Repository<User>;

	private roleRepository: Repository<Role>;

	private sharedCredentialsRepository: Repository<SharedCredentials>;

	private sharedWorkflowRepository: Repository<SharedWorkflow>;

	private activeWorkflowRunner: ActiveWorkflowRunner;

	private mailer: UserManagementMailer;

	constructor({
		config,
		logger,
		externalHooks,
		internalHooks,
		repositories,
		activeWorkflowRunner,
		mailer,
	}: {
		config: Config;
		logger: ILogger;
		externalHooks: IExternalHooksClass;
		internalHooks: IInternalHooksClass;
		repositories: Pick<
			IDatabaseCollections,
			'User' | 'Role' | 'SharedCredentials' | 'SharedWorkflow'
		>;
		activeWorkflowRunner: ActiveWorkflowRunner;
		mailer: UserManagementMailer;
	}) {
		this.config = config;
		this.logger = logger;
		this.externalHooks = externalHooks;
		this.internalHooks = internalHooks;
		this.userRepository = repositories.User;
		this.roleRepository = repositories.Role;
		this.sharedCredentialsRepository = repositories.SharedCredentials;
		this.sharedWorkflowRepository = repositories.SharedWorkflow;
		this.activeWorkflowRunner = activeWorkflowRunner;
		this.mailer = mailer;
	}

	/**
	 * Send email invite(s) to one or multiple users and create user shell(s).
	 */
	@Post('/')
	async sendEmailInvites(req: UserRequest.Invite) {
		// TODO: this should be checked in the middleware rather than here
		if (!isUserManagementEnabled()) {
			this.logger.debug(
				'Request to send email invite(s) to user(s) failed because user management is disabled',
			);
			throw new BadRequestError('User management is disabled');
		}

		if (!this.config.getEnv('userManagement.isInstanceOwnerSetUp')) {
			this.logger.debug(
				'Request to send email invite(s) to user(s) failed because the owner account is not set up',
			);
			throw new BadRequestError('You must set up your own account before inviting others');
		}

		if (!Array.isArray(req.body)) {
			this.logger.debug(
				'Request to send email invite(s) to user(s) failed because the payload is not an array',
				{
					payload: req.body,
				},
			);
			throw new BadRequestError('Invalid payload');
		}

		if (!req.body.length) return [];

		const createUsers: { [key: string]: string | null } = {};
		// Validate payload
		req.body.forEach((invite) => {
			if (typeof invite !== 'object' || !invite.email) {
				throw new BadRequestError(
					'Request to send email invite(s) to user(s) failed because the payload is not an array shaped Array<{ email: string }>',
				);
			}

			if (!validator.isEmail(invite.email)) {
				this.logger.debug('Invalid email in payload', { invalidEmail: invite.email });
				throw new BadRequestError(
					`Request to send email invite(s) to user(s) failed because of an invalid email address: ${invite.email}`,
				);
			}
			createUsers[invite.email.toLowerCase()] = null;
		});

		const role = await this.roleRepository.findOneBy({ scope: 'global', name: 'member' });

		if (!role) {
			this.logger.error(
				'Request to send email invite(s) to user(s) failed because no global member role was found in database',
			);
			throw new InternalServerError('Members role not found in database - inconsistent state');
		}

		// remove/exclude existing users from creation
		const existingUsers = await this.userRepository.find({
			where: { email: In(Object.keys(createUsers)) },
		});
		existingUsers.forEach((user) => {
			if (user.password) {
				delete createUsers[user.email];
				return;
			}
			createUsers[user.email] = user.id;
		});

		const usersToSetUp = Object.keys(createUsers).filter((email) => createUsers[email] === null);
		const total = usersToSetUp.length;

		this.logger.debug(total > 1 ? `Creating ${total} user shells...` : 'Creating 1 user shell...');

		try {
			await this.userRepository.manager.transaction(async (transactionManager) =>
				Promise.all(
					usersToSetUp.map(async (email) => {
						const newUser = Object.assign(new User(), {
							email,
							globalRole: role,
						});
						const savedUser = await transactionManager.save<User>(newUser);
						createUsers[savedUser.email] = savedUser.id;
						return savedUser;
					}),
				),
			);
		} catch (error) {
			ErrorReporter.error(error);
			this.logger.error('Failed to create user shells', { userShells: createUsers });
			throw new InternalServerError('An error occurred during user creation');
		}

		this.logger.debug('Created user shell(s) successfully', { userId: req.user.id });
		this.logger.verbose(total > 1 ? `${total} user shells created` : '1 user shell created', {
			userShells: createUsers,
		});

		const baseUrl = getInstanceBaseUrl();

		const usersPendingSetup = Object.entries(createUsers).filter(([email, id]) => id && email);

		// send invite email to new or not yet setup users

		const emailingResults = await Promise.all(
			usersPendingSetup.map(async ([email, id]) => {
				if (!id) {
					// This should never happen since those are removed from the list before reaching this point
					throw new InternalServerError('User ID is missing for user with email address');
				}
				const inviteAcceptUrl = generateUserInviteUrl(req.user.id, id);
				const resp: {
					user: { id: string | null; email: string; inviteAcceptUrl: string; emailSent: boolean };
					error?: string;
				} = {
					user: {
						id,
						email,
						inviteAcceptUrl,
						emailSent: false,
					},
				};
				try {
					const result = await this.mailer.invite({
						email,
						inviteAcceptUrl,
						domain: baseUrl,
					});
					if (result.emailSent) {
						resp.user.emailSent = true;
						void this.internalHooks.onUserTransactionalEmail({
							user_id: id,
							message_type: 'New user invite',
							public_api: false,
						});
					}

					void this.internalHooks.onUserInvite({
						user: req.user,
						target_user_id: Object.values(createUsers) as string[],
						public_api: false,
						email_sent: result.emailSent,
					});
				} catch (error) {
					if (error instanceof Error) {
						void this.internalHooks.onEmailFailed({
							user: req.user,
							message_type: 'New user invite',
							public_api: false,
						});
						this.logger.error('Failed to send email', {
							userId: req.user.id,
							inviteAcceptUrl,
							domain: baseUrl,
							email,
						});
						resp.error = error.message;
					}
				}
				return resp;
			}),
		);

		await this.externalHooks.run('user.invited', [usersToSetUp]);

		this.logger.debug(
			usersPendingSetup.length > 1
				? `Sent ${usersPendingSetup.length} invite emails successfully`
				: 'Sent 1 invite email successfully',
			{ userShells: createUsers },
		);

		return emailingResults;
	}

	/**
	 * Fill out user shell with first name, last name, and password.
	 */
	@Post('/:id')
	async updateUser(req: UserRequest.Update, res: Response) {
		const { id: inviteeId } = req.params;

		const { inviterId, firstName, lastName, password } = req.body;

		if (!inviterId || !inviteeId || !firstName || !lastName || !password) {
			this.logger.debug(
				'Request to fill out a user shell failed because of missing properties in payload',
				{ payload: req.body },
			);
			throw new BadRequestError('Invalid payload');
		}

		const validPassword = validatePassword(password);

		const users = await this.userRepository.find({
			where: { id: In([inviterId, inviteeId]) },
			relations: ['globalRole'],
		});

		if (users.length !== 2) {
			this.logger.debug(
				'Request to fill out a user shell failed because the inviter ID and/or invitee ID were not found in database',
				{
					inviterId,
					inviteeId,
				},
			);
			throw new BadRequestError('Invalid payload or URL');
		}

		const invitee = users.find((user) => user.id === inviteeId) as User;

		if (invitee.password) {
			this.logger.debug(
				'Request to fill out a user shell failed because the invite had already been accepted',
				{ inviteeId },
			);
			throw new BadRequestError('This invite has been accepted already');
		}

		invitee.firstName = firstName;
		invitee.lastName = lastName;
		invitee.password = await hashPassword(validPassword);

		const updatedUser = await this.userRepository.save(invitee);

		await issueCookie(res, updatedUser);

		void this.internalHooks.onUserSignup(updatedUser, {
			user_type: 'email',
			was_disabled_ldap_user: false,
		});

		await this.externalHooks.run('user.profile.update', [invitee.email, sanitizeUser(invitee)]);
		await this.externalHooks.run('user.password.update', [invitee.email, invitee.password]);

		return sanitizeUser(updatedUser);
	}

	@Get('/')
	async listUsers(req: UserRequest.List) {
		const users = await this.userRepository.find({ relations: ['globalRole', 'authIdentities'] });
		return users.map(
			(user): PublicUser =>
				addInviteLinkToUser(sanitizeUser(user, ['personalizationAnswers']), req.user.id),
		);
	}

	/**
	 * Delete a user. Optionally, designate a transferee for their workflows and credentials.
	 */
	@Delete('/:id')
	async deleteUser(req: UserRequest.Delete) {
		const { id: idToDelete } = req.params;

		if (req.user.id === idToDelete) {
			this.logger.debug(
				'Request to delete a user failed because it attempted to delete the requesting user',
				{ userId: req.user.id },
			);
			throw new BadRequestError('Cannot delete your own user');
		}

		const { transferId } = req.query;

		if (transferId === idToDelete) {
			throw new BadRequestError(
				'Request to delete a user failed because the user to delete and the transferee are the same user',
			);
		}

		const users = await this.userRepository.find({
			where: { id: In([transferId, idToDelete]) },
		});

		if (!users.length || (transferId && users.length !== 2)) {
			throw new NotFoundError(
				'Request to delete a user failed because the ID of the user to delete and/or the ID of the transferee were not found in DB',
			);
		}

		const userToDelete = users.find((user) => user.id === req.params.id) as User;

		const telemetryData: ITelemetryUserDeletionData = {
			user_id: req.user.id,
			target_user_old_status: userToDelete.isPending ? 'invited' : 'active',
			target_user_id: idToDelete,
		};

		telemetryData.migration_strategy = transferId ? 'transfer_data' : 'delete_data';

		if (transferId) {
			telemetryData.migration_user_id = transferId;
		}

		const [workflowOwnerRole, credentialOwnerRole] = await Promise.all([
			this.roleRepository.findOneBy({ name: 'owner', scope: 'workflow' }),
			this.roleRepository.findOneBy({ name: 'owner', scope: 'credential' }),
		]);

		if (transferId) {
			const transferee = users.find((user) => user.id === transferId);

			await this.userRepository.manager.transaction(async (transactionManager) => {
				// Get all workflow ids belonging to user to delete
				const sharedWorkflowIds = await transactionManager
					.getRepository(SharedWorkflow)
					.find({
						select: ['workflowId'],
						where: { userId: userToDelete.id, roleId: workflowOwnerRole?.id },
					})
					.then((sharedWorkflows) => sharedWorkflows.map(({ workflowId }) => workflowId));

				// Prevents issues with unique key constraints since user being assigned
				// workflows and credentials might be a sharee
				await transactionManager.delete(SharedWorkflow, {
					user: transferee,
					workflowId: In(sharedWorkflowIds),
				});

				// Transfer ownership of owned workflows
				await transactionManager.update(
					SharedWorkflow,
					{ user: userToDelete, role: workflowOwnerRole },
					{ user: transferee },
				);

				// Now do the same for creds

				// Get all workflow ids belonging to user to delete
				const sharedCredentialIds = await transactionManager
					.getRepository(SharedCredentials)
					.find({
						select: ['credentialsId'],
						where: { userId: userToDelete.id, roleId: credentialOwnerRole?.id },
					})
					.then((sharedCredentials) => sharedCredentials.map(({ credentialsId }) => credentialsId));

				// Prevents issues with unique key constraints since user being assigned
				// workflows and credentials might be a sharee
				await transactionManager.delete(SharedCredentials, {
					user: transferee,
					credentialsId: In(sharedCredentialIds),
				});

				// Transfer ownership of owned credentials
				await transactionManager.update(
					SharedCredentials,
					{ user: userToDelete, role: credentialOwnerRole },
					{ user: transferee },
				);

				await transactionManager.delete(AuthIdentity, { userId: userToDelete.id });

				// This will remove all shared workflows and credentials not owned
				await transactionManager.delete(User, { id: userToDelete.id });
			});

			void this.internalHooks.onUserDeletion({
				user: req.user,
				telemetryData,
				publicApi: false,
			});
			await this.externalHooks.run('user.deleted', [sanitizeUser(userToDelete)]);
			return { success: true };
		}

		const [ownedSharedWorkflows, ownedSharedCredentials] = await Promise.all([
			this.sharedWorkflowRepository.find({
				relations: ['workflow'],
				where: { userId: userToDelete.id, roleId: workflowOwnerRole?.id },
			}),
			this.sharedCredentialsRepository.find({
				relations: ['credentials'],
				where: { userId: userToDelete.id, roleId: credentialOwnerRole?.id },
			}),
		]);

		await this.userRepository.manager.transaction(async (transactionManager) => {
			const ownedWorkflows = await Promise.all(
				ownedSharedWorkflows.map(async ({ workflow }) => {
					if (workflow.active) {
						// deactivate before deleting
						await this.activeWorkflowRunner.remove(workflow.id);
					}
					return workflow;
				}),
			);
			await transactionManager.remove(ownedWorkflows);
			await transactionManager.remove(ownedSharedCredentials.map(({ credentials }) => credentials));

			await transactionManager.delete(AuthIdentity, { userId: userToDelete.id });
			await transactionManager.delete(User, { id: userToDelete.id });
		});

		void this.internalHooks.onUserDeletion({
			user: req.user,
			telemetryData,
			publicApi: false,
		});

		await this.externalHooks.run('user.deleted', [sanitizeUser(userToDelete)]);
		return { success: true };
	}

	/**
	 * Resend email invite to user.
	 */
	@Post('/:id/reinvite')
	async reinviteUser(req: UserRequest.Reinvite) {
		const { id: idToReinvite } = req.params;

		if (!isEmailSetUp()) {
			this.logger.error('Request to reinvite a user failed because email sending was not set up');
			throw new InternalServerError('Email sending must be set up in order to invite other users');
		}

		const reinvitee = await this.userRepository.findOneBy({ id: idToReinvite });
		if (!reinvitee) {
			this.logger.debug(
				'Request to reinvite a user failed because the ID of the reinvitee was not found in database',
			);
			throw new NotFoundError('Could not find user');
		}

		if (reinvitee.password) {
			this.logger.debug(
				'Request to reinvite a user failed because the invite had already been accepted',
				{ userId: reinvitee.id },
			);
			throw new BadRequestError('User has already accepted the invite');
		}

		const baseUrl = getInstanceBaseUrl();
		const inviteAcceptUrl = `${baseUrl}/signup?inviterId=${req.user.id}&inviteeId=${reinvitee.id}`;

		try {
			const result = await this.mailer.invite({
				email: reinvitee.email,
				inviteAcceptUrl,
				domain: baseUrl,
			});
			if (result.emailSent) {
				void this.internalHooks.onUserReinvite({
					user: req.user,
					target_user_id: reinvitee.id,
					public_api: false,
				});

				void this.internalHooks.onUserTransactionalEmail({
					user_id: reinvitee.id,
					message_type: 'Resend invite',
					public_api: false,
				});
			}
		} catch (error) {
			void this.internalHooks.onEmailFailed({
				user: reinvitee,
				message_type: 'Resend invite',
				public_api: false,
			});
			this.logger.error('Failed to send email', {
				email: reinvitee.email,
				inviteAcceptUrl,
				domain: baseUrl,
			});
			throw new InternalServerError(`Failed to send email to ${reinvitee.email}`);
		}
		return { success: true };
	}
}
