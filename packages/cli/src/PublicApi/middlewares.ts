/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import express = require('express');
import validator from 'validator';
import config = require('../../config');
import type { UserRequest } from '../requests';
import { decodeCursor } from './helpers';

type Role = 'owner' | 'member';

const instanceOwnerSetup = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
): any => {
	if (config.get('userManagement.isInstanceOwnerSetUp')) {
		return next();
	}
	return res.status(400).json({ message: 'asasas' });
};

const emailSetup = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
): any => {
	if (config.get('userManagement.emails.mode')) {
		return next();
	}
	return res.status(400).json({ message: 'asasas' });
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
		return res.status(400).json({
			message: 'asasas',
		});
	};

const validEmail = (
	req: UserRequest.Invite,
	res: express.Response,
	next: express.NextFunction,
): any => {
	req.body.forEach((invite) => {
		if (!validator.isEmail(invite.email)) {
			return res.status(400).json({
				message: `Request to send email invite(s) to user(s) failed because of an invalid email address: ${invite.email}`,
			});
		}
	});
	next();
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

const validCursor = (
	req: UserRequest.Get,
	res: express.Response,
	next: express.NextFunction,
): any => {
	let offset = 0;
	let limit = 10;
	if (req.query?.limit) {
		limit = parseInt(req.query?.limit, 10) || 10;
	}
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
	req.limit = limit;
	req.offset = offset;
	next();
};

const parseIncludeRole = (
	req: UserRequest.Get,
	res: express.Response,
	next: express.NextFunction,
): any => {
	req.includeRole = false;
	if (req.query?.includeRole) {
		req.includeRole = req.query.includeRole === 'true';
	}
	next();
};

export const middlewares = {
	createUsers: [instanceOwnerSetup, emailSetup, validEmail, authorize(['owner'])],
	deleteUsers: [
		instanceOwnerSetup,
		deletingOwnUser,
		transferingToDeletedUser,
		authorize(['owner']),
	],
	getUsers: [instanceOwnerSetup, parseIncludeRole, validCursor, authorize(['owner'])],
	getUser: [instanceOwnerSetup, parseIncludeRole, authorize(['owner'])],
};
