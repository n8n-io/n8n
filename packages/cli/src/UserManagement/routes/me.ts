/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */

import { genSaltSync, hashSync } from 'bcryptjs';
import express = require('express');
import { Db, ResponseHelper } from '../..';
import { User } from '../../databases/entities/User';
import { issueJWT } from '../auth/jwt';
import { N8nApp, PublicUserData } from '../Interfaces';
import { isValidEmail, sanitizeUser } from '../UserManagementHelper';
import type { UpdateSelfRequest } from '../Interfaces';

export function addMeNamespace(this: N8nApp): void {
	/**
	 * Return the logged-in user.
	 */
	this.app.get(
		`/${this.restEndpoint}/me`,
		ResponseHelper.send(async (req: express.Request & { user: User }): Promise<PublicUserData> => {
			return sanitizeUser(req.user);
		}),
	);

	/**
	 * Update the logged-in user's settings, except password.
	 */
	this.app.patch(
		`/${this.restEndpoint}/me`,
		ResponseHelper.send(
			async (req: UpdateSelfRequest.Settings, res: express.Response): Promise<PublicUserData> => {
				if (req.body.email && !isValidEmail(req.body.email)) {
					throw new Error('Invalid email address');
				}

				req.user = Object.assign(req.user, req.body);

				const user = await Db.collections.User!.save(req.user);

				const userData = await issueJWT(user);

				res.cookie('n8n-auth', userData.token, { maxAge: userData.expiresIn, httpOnly: true });

				return sanitizeUser(user);
			},
		),
	);

	/**
	 * Update the logged-in user's password.
	 */
	this.app.patch(
		`/${this.restEndpoint}/me/password`,
		ResponseHelper.send(async (req: UpdateSelfRequest.Password, res: express.Response) => {
			if (!req.body.password) {
				throw new Error('Password is mandatory');
			}

			const hashedPassword = hashSync(req.body.password, genSaltSync(10));

			req.user.password = hashedPassword;

			const user = await Db.collections.User!.save(req.user);

			const userData = await issueJWT(user);
			res.cookie('n8n-auth', userData.token, { maxAge: userData.expiresIn, httpOnly: true });

			return { success: true };
		}),
	);

	/**
	 * Store the logged-in user's survey answers.
	 */
	this.app.post(
		`/${this.restEndpoint}/me/survey`,
		ResponseHelper.send(async (req: UpdateSelfRequest.SurveyAnswers) => {
			const { body: personalizationAnswers } = req;

			if (!personalizationAnswers) {
				throw new Error('Personalization answers are mandatory');
			}

			await Db.collections.User!.save({
				id: req.user.id,
				personalizationAnswers,
			});

			return { success: true };
		}),
	);
}
