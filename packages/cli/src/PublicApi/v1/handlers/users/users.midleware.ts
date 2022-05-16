/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import express = require('express');
import config = require('../../../../../config');
import * as UserManagementMailer from '../../../../UserManagement/email/UserManagementMailer';
import { isEmailSetUp } from '../../../../UserManagement/UserManagementHelper';
import { UserRequest } from '../../../types';
import { getGlobalMemberRole } from './users.service';

export const deletingOwnUser = (
	req: UserRequest.Delete,
	res: express.Response,
	next: express.NextFunction,
): any => {
	if (req.user.id === req.params.identifier || req.user.email === req.params.identifier) {
		return res.status(400).json({
			message: `Cannot delete your own user`,
		});
	}
	next();
};

export const transferingToDeletedUser = (
	req: UserRequest.Delete,
	res: express.Response,
	next: express.NextFunction,
): any => {
	if (req.query.transferId === req.params.identifier) {
		return res.status(400).json({
			message: `Request to delete a user failed because the user to delete and the transferee are the same user`,
		});
	}
	next();
};

export const getMailerInstance = async (
	req: UserRequest.Invite,
	res: express.Response,
	next: express.NextFunction,
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

export const globalMemberRoleSetup = async (
	req: UserRequest.Invite,
	res: express.Response,
	next: express.NextFunction,
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

export const userManagmentEnabled = async (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
): Promise<any> => {
	if (
		config.getEnv('userManagement.disabled') ||
		!config.getEnv('userManagement.isInstanceOwnerSetUp')
	) {
		return res.status(500).json({
			message: 'Users endpoints can only be used with UM enabled and an instance owner setup',
		});
	}

	next();
};

export const emailSetup = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
): any => {
	if (!isEmailSetUp()) {
		return res.status(500).json({ message: 'Email is not set up' });
	}
	next();
};
