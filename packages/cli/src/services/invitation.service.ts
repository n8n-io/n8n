import { Container, Service } from 'typedi';
import { ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';

import { type AssignableRole, User } from '@db/entities/User';
import { UserRepository } from '@db/repositories/user.repository';
import { Logger } from '@/Logger';
import { UserManagementMailer } from '@/UserManagement/email';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { InternalHooks } from '@/InternalHooks';
import type { UserRequest } from '@/requests';
import { UrlService } from './url.service';
import { JwtService } from './jwt.service';

@Service()
export class InvitationService {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly mailer: UserManagementMailer,
		private readonly urlService: UrlService,
		private readonly jwtService: JwtService,
	) {}

	generateInvitationUrl(inviterId: string, inviteeId: string) {
		const baseUrl = this.urlService.getInstanceBaseUrl();
		const url = new URL(`${baseUrl}/signup`);
		const token = this.jwtService.sign({ inviterId, inviteeId }, { expiresIn: '7d' });
		url.searchParams.append('token', token);
		return url.toString();
	}

	async validateInvitationToken(token: string) {
		const { inviterId, inviteeId } = this.jwtService.verify<{
			inviterId: string;
			inviteeId: string;
		}>(token);
		const users = await this.userRepository.findManyByIds([inviterId, inviteeId]);
		const invitee = users.find((user) => user.id === inviteeId);
		const inviter = users.find((user) => user.id === inviterId);
		return { invitee, inviter };
	}

	async inviteUsers(inviter: User, attributes: Array<{ email: string; role: AssignableRole }>) {
		const emails = attributes.map(({ email }) => email);

		const existingUsers = await this.userRepository.findManyByEmail(emails);

		const existUsersEmails = existingUsers.map((user) => user.email);

		const toCreateUsers = attributes.filter(({ email }) => !existUsersEmails.includes(email));

		const pendingUsersToInvite = existingUsers.filter((email) => email.isPending);

		const createdUsers = new Map<string, string>();

		this.logger.debug(
			toCreateUsers.length > 1
				? `Creating ${toCreateUsers.length} user shells...`
				: 'Creating 1 user shell...',
		);

		try {
			await this.userRepository.manager.transaction(
				async (transactionManager) =>
					await Promise.all(
						toCreateUsers.map(async ({ email, role }) => {
							const newUser = transactionManager.create(User, { email, role });
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

		const usersInvited = await this.sendEmails(
			inviter,
			Object.fromEntries(createdUsers),
			attributes[0].role, // same role for all invited users
		);

		return { usersInvited, usersCreated: toCreateUsers.map(({ email }) => email) };
	}

	private async sendEmails(
		inviter: User,
		toInviteUsers: { [key: string]: string },
		role: AssignableRole,
	) {
		const domain = this.urlService.getInstanceBaseUrl();

		return await Promise.all(
			Object.entries(toInviteUsers).map(async ([email, id]) => {
				const inviteAcceptUrl = this.generateInvitationUrl(inviter.id, id);
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
						user: inviter,
						target_user_id: Object.values(toInviteUsers),
						public_api: false,
						email_sent: result.emailSent,
						invitee_role: role, // same role for all invited users
					});
				} catch (e) {
					if (e instanceof Error) {
						void Container.get(InternalHooks).onEmailFailed({
							user: inviter,
							message_type: 'New user invite',
							public_api: false,
						});
						this.logger.error('Failed to send email', {
							userId: inviter.id,
							inviteAcceptUrl,
							email,
						});
						invitedUser.error = e.message;
					}
				}

				return invitedUser;
			}),
		);
	}
}
