/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Request, Response } from 'express';
import { In } from 'typeorm';
import { LoggerProxy } from 'n8n-workflow';
import { genSaltSync, hashSync } from 'bcryptjs';
import { Db, GenericHelpers, ICredentialsResponse, ResponseHelper } from '../..';
import { N8nApp, PublicUserData } from '../Interfaces';
import { sanitizeUser, isEmailSetup, isValidEmail } from '../UserManagementHelper';
import { User } from '../../databases/entities/User';
import { getInstance } from '../email/UserManagementMailer';
import { issueJWT } from '../auth/jwt';

export function addUsersMethods(this: N8nApp): void {
	this.app.post(
		`/${this.restEndpoint}/users`,
		ResponseHelper.send(async (req: Request, res: Response) => {
			if (!isEmailSetup()) {
				throw new ResponseHelper.ResponseError(
					'Email sending must be set up in order to invite other users',
					undefined,
					500,
				);
			}

			const invitations = req.body as Array<{ email: string }>;

			if (!Array.isArray(invitations)) {
				throw new ResponseHelper.ResponseError('Invalid payload', undefined, 500);
			}

			// Validate payload
			invitations.forEach((invitation) => {
				if (!isValidEmail(invitation.email)) {
					throw new ResponseHelper.ResponseError(
						`Invalid email address ${invitation.email}`,
						undefined,
						500,
					);
				}
			});

			const existingUsers = await Db.collections.User!.find({
				where: {
					email: In(invitations.map((invitation) => invitation.email)),
				},
			});

			if (existingUsers.length) {
				const existingEmails = existingUsers.map((existingUser) => existingUser.email);
				throw new ResponseHelper.ResponseError(
					`One or more emails already invited: ${existingEmails.join(', ')}`,
					undefined,
					400,
				);
			}

			const role = await Db.collections.Role!.findOne({ scope: 'global', name: 'member' });

			if (!role) {
				throw new ResponseHelper.ResponseError(
					'Members role not found in database - inconsistent state',
					undefined,
					500,
				);
			}

			let successfulBatch = true;
			const createdUsers: PublicUserData[] = [];

			// eslint-disable-next-line no-restricted-syntax
			for (const invited of invitations) {
				const newUserInfo = {
					email: invited.email,
					globalRole: role,
				} as User;
				// eslint-disable-next-line no-await-in-loop
				const newUser = await Db.collections.User!.save(newUserInfo);
				createdUsers.push(sanitizeUser(newUser));

				let inviteAcceptUrl = GenericHelpers.getBaseUrl();
				const domain = inviteAcceptUrl;
				if (!inviteAcceptUrl.endsWith('/')) {
					inviteAcceptUrl += '/';
				}
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
				inviteAcceptUrl += `signup/inviterId=${(req.user as User).id}&inviteeId=${newUser.id}`;

				const mailer = getInstance();
				// eslint-disable-next-line no-await-in-loop
				const result = await mailer.invite({
					email: invited.email,
					inviteAcceptUrl,
					domain,
				});
				if (!result.success) {
					successfulBatch = false;
				}
			}

			if (!successfulBatch) {
				ResponseHelper.sendErrorResponse(res, new Error('One or more emails could not be sent'));
			}
			return { success: true, newUsers: createdUsers };
		}),
	);

	this.app.get(
		`/${this.restEndpoint}/resolve-signup-token`,
		ResponseHelper.send(async (req: Request) => {
			const inviterId = req.query.inviterId as string;
			const inviteeId = req.query.inviteeId as string;

			if (!inviterId || !inviteeId) {
				LoggerProxy.error('Invalid invite URL - did not receive user IDs', {
					inviterId,
					inviteeId,
				});
				throw new ResponseHelper.ResponseError('Invalid payload', undefined, 500);
			}

			const users = await Db.collections.User!.find({ where: { id: In([inviterId, inviteeId]) } });

			if (users.length !== 2) {
				LoggerProxy.error('Invalid invite URL - did not find users', { inviterId, inviteeId });
				throw new ResponseHelper.ResponseError('Invalid invite URL', undefined, 500);
			}

			const inviter = users.find((user) => user.id === inviterId);

			if (!inviter || !inviter.email || !inviter.firstName) {
				LoggerProxy.error('Invalid invite URL - inviter does not have email set', {
					inviterId,
					inviteeId,
				});
				throw new ResponseHelper.ResponseError('Invalid request', undefined, 500);
			}
			const { firstName, lastName } = inviter;

			return { inviter: { firstName, lastName } };
		}),
	);

	this.app.post(
		`/${this.restEndpoint}/user`,
		ResponseHelper.send(async (req: Request, res: Response) => {
			if (req.user) {
				throw new ResponseHelper.ResponseError(
					'Please logout before accepting another invite.',
					undefined,
					500,
				);
			}

			const { inviterUuid, inviteeUuid, firstName, lastName, password } = req.body as {
				inviterUuid: string;
				inviteeUuid: string;
				firstName: string;
				lastName: string;
				password: string;
			};

			if (!inviterUuid || !inviteeUuid || !firstName || !lastName || !password) {
				throw new ResponseHelper.ResponseError('Invalid payload', undefined, 500);
			}

			const users = await Db.collections.User!.find({
				where: { id: In([inviterUuid, inviteeUuid]) },
			});

			if (users.length !== 2) {
				throw new ResponseHelper.ResponseError('Invalid invite URL', undefined, 500);
			}

			const invitee = users.find((user) => user.id === inviteeUuid);

			if (!invitee || invitee.password) {
				throw new ResponseHelper.ResponseError(
					'This invite has been accepted already',
					undefined,
					500,
				);
			}

			invitee.firstName = firstName;
			invitee.lastName = lastName;
			invitee.password = hashSync(password, genSaltSync(10));

			const updatedUser = await Db.collections.User!.save(invitee);

			const userData = await issueJWT(updatedUser);
			res.cookie('n8n-auth', userData.token, { maxAge: userData.expiresIn, httpOnly: true });
			return sanitizeUser(updatedUser);
		}),
	);

	this.app.get(
		`/${this.restEndpoint}/users`,
		ResponseHelper.send(async () => {
			const users = await Db.collections.User!.find();

			return users.map((user) => sanitizeUser(user));
		}),
	);

	this.app.delete(
		`/${this.restEndpoint}/users/:id`,
		ResponseHelper.send(async (req: Request) => {
			if ((req.user as User).id === req.params.id) {
				throw new ResponseHelper.ResponseError('You cannot delete your own user', undefined, 403);
			}

			const transferId = req.query.transferId as string;

			const searchIds = [req.params.id];
			if (transferId) {
				if (transferId === req.params.id) {
					throw new ResponseHelper.ResponseError(
						'Removed user and transferred user cannot be the same',
						undefined,
						400,
					);
				}
				searchIds.push(transferId);
			}

			const users = await Db.collections.User!.find({ where: { id: In(searchIds) } });
			if ((transferId && users.length !== 2) || users.length === 0) {
				throw new ResponseHelper.ResponseError('Could not find user', undefined, 404);
			}

			const deletedUser = users.find((user) => user.id === req.params.id) as User;

			if (transferId) {
				const transferUser = users.find((user) => user.id === transferId) as User;
				await Db.collections.SharedWorkflow!.update({ user: deletedUser }, { user: transferUser });
				await Db.collections.SharedCredentials!.update(
					{ user: deletedUser },
					{ user: transferUser },
				);
			} else {
				const ownedWorkflows = await Db.collections.SharedWorkflow!.find({
					relations: ['workflow'],
					where: { user: deletedUser },
				});
				if (ownedWorkflows.length) {
					await Db.collections.Workflow!.delete({
						id: In(ownedWorkflows.map((ownedWorkflow) => ownedWorkflow.workflow.id)),
					});
					await Db.collections.SharedWorkflow!.delete({ user: deletedUser });
				}

				const ownedCredentials = await Db.collections.SharedCredentials!.find({
					relations: ['credentials'],
					where: { user: deletedUser },
				});
				if (ownedCredentials.length) {
					await Db.collections.Credentials!.delete({
						id: In(ownedCredentials.map((ownedCredential) => ownedCredential.credentials.id)),
					});
					await Db.collections.SharedWorkflow!.delete({ user: deletedUser });
				}

				const queryBuilderCredentials = Db.collections.Credentials!.createQueryBuilder('c');
				queryBuilderCredentials.innerJoin('c.shared', 'shared');
				queryBuilderCredentials.andWhere('shared.userId = :userId', {
					userId: deletedUser.id,
				});

				queryBuilderCredentials.select(['c.id']);

				const credentials =
					(await queryBuilderCredentials.getMany()) as unknown as ICredentialsResponse[];

				if (credentials.length) {
					await Db.collections.Credentials!.remove(credentials);
					await Db.collections.SharedCredentials!.delete({ user: deletedUser });
				}
			}
			await Db.collections.User!.delete({ id: deletedUser.id });
			return { success: true };
		}),
	);

	this.app.post(
		`/${this.restEndpoint}/users/:id/reinvite`,
		ResponseHelper.send(async (req: Request) => {
			if (!isEmailSetup()) {
				throw new ResponseHelper.ResponseError(
					'Email sending must be set up in order to invite other users',
					undefined,
					500,
				);
			}

			const user = await Db.collections.User!.findOne({ id: req.params.id });

			if (!user) {
				throw new ResponseHelper.ResponseError('User not found', undefined, 404);
			}

			if (user.password) {
				throw new ResponseHelper.ResponseError(
					'User has already accepted the invite',
					undefined,
					400,
				);
			}

			let inviteAcceptUrl = GenericHelpers.getBaseUrl();
			const domain = inviteAcceptUrl;
			if (!inviteAcceptUrl.endsWith('/')) {
				inviteAcceptUrl += '/';
			}
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
			inviteAcceptUrl += `signup/inviterId=${(req.user as User).id}&inviteeId${user.id}`;

			const mailer = getInstance();
			// eslint-disable-next-line no-await-in-loop
			const result = await mailer.invite({
				email: user.email,
				inviteAcceptUrl,
				domain,
			});

			if (result.success) {
				return { success: false };
			}
			throw new ResponseHelper.ResponseError('Unable to send email', undefined, 500);
		}),
	);
}
