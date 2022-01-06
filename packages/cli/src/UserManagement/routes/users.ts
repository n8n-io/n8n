/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Request, Response } from 'express';
import { In } from 'typeorm';
import { LoggerProxy } from 'n8n-workflow';
import { genSaltSync, hashSync } from 'bcryptjs';
import { Db, GenericHelpers, ResponseHelper } from '../..';
import { N8nApp, PublicUser } from '../Interfaces';
import { generatePublicUserData, isEmailSetup, isValidEmail } from '../UserManagementHelper';
import { User } from '../../databases/entities/User';
import { getInstance } from '../email/UserManagementMailer';
import { issueJWT } from '../auth/jwt';

export function addUsersMethods(this: N8nApp): void {
	this.app.post(
		`/${this.restEndpoint}/users`,
		ResponseHelper.send(async (req: Request, res: Response) => {
			if ((req.user as User).globalRole.name !== 'owner') {
				throw new ResponseHelper.ResponseError(
					'Current user cannot perform this operation',
					undefined,
					403,
				);
			}

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
			const createdUsers: PublicUser[] = [];

			// eslint-disable-next-line no-restricted-syntax
			for (const invited of invitations) {
				const newUserInfo = {
					email: invited.email,
					globalRole: role,
				} as User;
				// eslint-disable-next-line no-await-in-loop
				const newUser = await Db.collections.User!.save(newUserInfo);
				createdUsers.push(generatePublicUserData(newUser));

				let inviteAcceptUrl = GenericHelpers.getBaseUrl();
				const domain = inviteAcceptUrl;
				if (!inviteAcceptUrl.endsWith('/')) {
					inviteAcceptUrl += '/';
				}
				// TODO UM: decide if this URL will be final.
				// TODO UM: user id below needs to be changed
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
				inviteAcceptUrl += `accept-invite/${(req.user as User).id}/${newUser.id}`;

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
			return generatePublicUserData(updatedUser);
		}),
	);
}
