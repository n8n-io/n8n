/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import express = require('express');
import config = require('../../config');
import type { UserRequest } from '../requests';
import type { CredentialRequest } from './publicApiRequest';
import * as UserManagementMailer from '../UserManagement/email/UserManagementMailer';

import { decodeCursor, getGlobalMemberRole } from './helpers';
import { Role, PaginatatedRequest } from './publicApiRequest';
import { validateCredentialsProperties } from './v1/Credentials/credentials.service';

export const instanceOwnerSetup = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
): any => {
	if (!config.getEnv('userManagement.isInstanceOwnerSetUp')) {
		return res.status(500).json({ message: 'Instance owner is not set up' });
	}
	next();
};

const emailSetup = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
): any => {
	if (!config.getEnv('userManagement.emails.mode')) {
		return res.status(500).json({ message: 'Email is not set up' });
	}
	next();
};

export const authorize =
	(role: Role[]) =>
	(req: express.Request, res: express.Response, next: express.NextFunction): any => {
		const {
			globalRole: { name: userRole },
		} = req.user as { globalRole: { name: Role } };
		if (role.includes(userRole)) {
			return next();
		}
		return res.status(403).json({
			message: 'Unauthorized',
		});
	};

const deletingOwnUser = (
	req: UserRequest.Delete,
	res: express.Response,
	next: express.NextFunction,
): any => {
	if (req.user.id === req.params.identifier) {
		return res.status(400).json({
			message: `Cannot delete your own user`,
		});
	}
	next();
};

const transferingToDeletedUser = (
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

export const validCursor = (
	req: PaginatatedRequest,
	res: express.Response,
	next: express.NextFunction,
): any => {
	if (req.query.cursor) {
		const { cursor } = req.query;
		try {
			const paginationData = decodeCursor(cursor);
			if ('offset' in paginationData) {
				req.query.offset = paginationData.offset;
				req.query.limit = paginationData.limit;
			} else {
				req.query.lastId = paginationData.lastId;
				req.query.limit = paginationData.limit;
			}
		} catch (error) {
			return res.status(400).json({
				message: 'An invalid cursor was used',
			});
		}
	}
	next();
};

const getMailerInstance = async (
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

const globalMemberRoleSetup = async (
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

export const validCredentialsProperties = async (
	req: CredentialRequest.Create,
	res: express.Response,
	next: express.NextFunction,
): Promise<any> => {
	const { type, data } = req.body;
	const formatError = (propertyName: string) => {
		return `request.body.data should have required property '${propertyName}'`;
	};
	const missingProperties = validateCredentialsProperties(type, data);
	if (missingProperties.length) {
		return res.status(400).json({
			message: missingProperties.map(formatError).join(','),
		});
	}
	next();
};

export const middlewares = {
	createUsers: [
		instanceOwnerSetup,
		emailSetup,
		authorize(['owner']),
		getMailerInstance,
		globalMemberRoleSetup,
	],
	deleteUsers: [
		instanceOwnerSetup,
		deletingOwnUser,
		transferingToDeletedUser,
		authorize(['owner']),
	],
	getUsers: [instanceOwnerSetup, validCursor, authorize(['owner'])],
	getUser: [instanceOwnerSetup, authorize(['owner'])],
};
