/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/no-cycle */

import express = require('express');
import { Db, ResponseHelper } from '../..';
import { User } from '../../databases/entities/User';
import { issueJWT } from '../auth/jwt';
import {
	N8nApp,
	PublicUserData,
	UserRequest,
	UpdateUserSettingsRequest,
	UpdateUserPasswordRequest,
	PersonalizationAnswersRequest,
} from '../Interfaces';

/**
 * Remove sensitive properties from user to be returned to client.
 * TODO: Place this elsewhere.
 */
function sanitizeUser(user: User) {
	delete user.password;
	delete user.resetPasswordToken;

	return user;
}

export function addMeNamespace(this: N8nApp): void {
	/**
	 * Sanitize and return currently logged-in user.
	 */
	this.app.get(
		`/${this.restEndpoint}/me`,
		ResponseHelper.send(async (req: UserRequest, _): Promise<PublicUserData> => {
			return sanitizeUser(req.user);
		}),
	);

	/**
	 * Update user settings, except password.
	 */
	this.app.patch(
		`/${this.restEndpoint}/me`,
		ResponseHelper.send(
			async (req: UpdateUserSettingsRequest, res: express.Response): Promise<PublicUserData> => {
				const user = await Db.collections.User!.save({ id: req.user.id, ...req.body });

				const userData = await issueJWT(user);
				res.cookie('n8n-auth', userData.token, { maxAge: userData.expiresIn, httpOnly: true });

				return sanitizeUser(user);
			},
		),
	);

	/**
	 * Update user password.
	 */
	this.app.patch(
		`/${this.restEndpoint}/me/password`,
		ResponseHelper.send(
			async (req: UpdateUserPasswordRequest, res: express.Response): Promise<PublicUserData> => {
				const user = await Db.collections.User!.save({ id: req.user.id, ...req.body });

				const userData = await issueJWT(user);
				res.cookie('n8n-auth', userData.token, { maxAge: userData.expiresIn, httpOnly: true });

				return sanitizeUser(user);
			},
		),
	);

	/**
	 * Store personalization answers from value survey.
	 */
	this.app.post(
		`/${this.restEndpoint}/me/survey`,
		ResponseHelper.send(
			async (
				req: PersonalizationAnswersRequest,
				res: express.Response,
			): Promise<PublicUserData> => {
				const user = await Db.collections.User!.save({ id: req.user.id, ...req.body });

				const userData = await issueJWT(user);
				res.cookie('n8n-auth', userData.token, { maxAge: userData.expiresIn, httpOnly: true });

				return sanitizeUser(user);
			},
		),
	);
}
