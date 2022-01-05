/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/no-cycle */

import { genSaltSync, hashSync } from 'bcryptjs';
import express = require('express');
import { Db, ResponseHelper } from '../..';
import { issueJWT } from '../auth/jwt';
import {
	N8nApp,
	PublicUserData,
	UserRequest,
	UpdateUserSettingsRequest,
	UpdateUserPasswordRequest,
	PersonalizationAnswersRequest,
} from '../Interfaces';
import { isValidEmail, sanitizeUser } from '../UserManagementHelper';

export function addMeNamespace(this: N8nApp): void {
	/**
	 * Return the logged-in user.
	 */
	this.app.get(
		`/${this.restEndpoint}/me`,
		ResponseHelper.send(async (req: UserRequest, _): Promise<PublicUserData> => {
			return sanitizeUser(req.user);
		}),
	);

	/**
	 * Update the logged-in user's settings, except password.
	 */
	this.app.patch(
		`/${this.restEndpoint}/me`,
		ResponseHelper.send(
			async (req: UpdateUserSettingsRequest, res: express.Response): Promise<PublicUserData> => {
				if (req.body.email && !isValidEmail(req.body.email)) {
					throw new Error('Invalid email address');
				}

				const user = await Db.collections.User!.save({ id: req.user.id, ...req.body });

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
		ResponseHelper.send(
			async (req: UpdateUserPasswordRequest, res: express.Response): Promise<PublicUserData> => {
				if (!req.body.password) {
					throw new Error('Password is mandatory');
				}

				const hashedPassword = hashSync(req.body.password, genSaltSync(10));

				const user = await Db.collections.User!.save({ id: req.user.id, password: hashedPassword });

				const userData = await issueJWT(user);
				res.cookie('n8n-auth', userData.token, { maxAge: userData.expiresIn, httpOnly: true });

				return sanitizeUser(user);
			},
		),
	);

	/**
	 * Store the logged-in user's personalization answers.
	 */
	this.app.post(
		`/${this.restEndpoint}/me/survey`,
		ResponseHelper.send(async (req: PersonalizationAnswersRequest, res: express.Response) => {
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
