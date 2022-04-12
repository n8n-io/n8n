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
import { decodeCursor } from './helpers';

type Role = 'owner' | 'member';

const instanceOwnerSetup = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
): any => {
	if (!config.getEnv('userManagement.isInstanceOwnerSetUp')) {
		return res.status(404).json({ message: 'asasas' });
	}
	next();
};

const emailSetup = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
): any => {
	if (!config.getEnv('userManagement.emails.mode')) {
		return res.status(500).json({ message: 'asasas' });
	}
	next();
};

const authorize =
	(role: [Role]) =>
	(req: express.Request, res: express.Response, next: express.NextFunction): any => {
		const {
			globalRole: { name: userRole },
		} = req.user as { globalRole: { name: Role } };
		if (role.includes(userRole)) {
			return next();
		}
		return res.status(403).json({
			message: 'asasas',
		});
	};

// move this to open api validator
// const validEmail = (
// 	req: UserRequest.Invite,
// 	res: express.Response,
// 	next: express.NextFunction,
// ): any => {
// 	// eslint-disable-next-line no-restricted-syntax
// 	for (const { email } of req.body) {
// 		if (!validator.isEmail(email)) {
// 			return res.status(400).json({
// 				message: `Request to send email invite(s) to user(s) failed because of an invalid email address: ${email}`,
// 			});
// 		}
// 	}
// 	next();
// };

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

const validCursor = (
	req: UserRequest.Get,
	res: express.Response,
	next: express.NextFunction,
): any => {
	let offset = 0;
	let limit = 10;
	if (req.query.cursor) {
		const { cursor } = req.query;
		try {
			({ offset, limit } = decodeCursor(cursor));
		} catch (error) {
			return res.status(400).json({
				message: `invalid cursor`,
			});
		}
	}
	// @ts-ignore
	req.query.offset = offset;
	// @ts-ignore
	req.query.limit = limit;
	next();
};

export const middlewares = {
	createUsers: [instanceOwnerSetup, emailSetup, authorize(['owner'])],
	deleteUsers: [
		instanceOwnerSetup,
		deletingOwnUser,
		transferingToDeletedUser,
		authorize(['owner']),
	],
	getUsers: [instanceOwnerSetup, validCursor, authorize(['owner'])],
	getUser: [instanceOwnerSetup, authorize(['owner'])],
};
