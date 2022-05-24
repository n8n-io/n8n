/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestHandler } from 'express';
import * as UserManagementMailer from '../../../../UserManagement/email/UserManagementMailer';
import {
	isEmailSetUp,
	isUserManagementDisabled,
} from '../../../../UserManagement/UserManagementHelper';
import { UserRequest } from '../../../types';
import { getGlobalMemberRole } from './users.service';

// @ts-ignore
export const deletingOwnUser: RequestHandler = (req: UserRequest.Delete, res, next): any => {
	if (req.user.id === req.params.id || req.user.email === req.params.id) {
		return res.status(400).json({
			message: `Cannot delete your own user`,
		});
	}
	next();
};

// @ts-ignore
export const transferingToDeletedUser: RequestHandler = (
	req: UserRequest.Delete,
	res,
	next,
): any => {
	if (req.query.transferId === req.params.id) {
		return res.status(400).json({
			message: `Request to delete a user failed because the user to delete and the transferee are the same user`,
		});
	}
	next();
};

export const getMailerInstance: RequestHandler = async (
	req: UserRequest.Invite,
	res,
	next,
): Promise<any> => {
	let mailer: UserManagementMailer.UserManagementMailer | undefined;
	try {
		mailer = await UserManagementMailer.getInstance();
		req.mailer = mailer;
	} catch (error) {
		if (error instanceof Error) {
			return res.status(500).json({
				message: 'There is a problem with your SMTP setup',
			});
		}
	}
	next();
};

export const globalMemberRoleSetup: RequestHandler = async (
	req: UserRequest.Invite,
	res,
	next,
): Promise<any> => {
	try {
		const role = await getGlobalMemberRole();
		req.globalMemberRole = role;
	} catch (error) {
		return res.status(500).json({
			message: 'Members role not found in database - inconsistent state',
		});
	}
	next();
};

export const userManagmentEnabled: RequestHandler = async (req, res, next): Promise<any> => {
	if (isUserManagementDisabled()) {
		return res.status(500).json({
			message: 'Users endpoints can only be used with UM enabled and an instance owner setup',
		});
	}

	next();
};

export const emailSetup: RequestHandler = (req, res, next): any => {
	if (!isEmailSetUp()) {
		return res.status(500).json({ message: 'Email is not set up' });
	}
	next();
};
