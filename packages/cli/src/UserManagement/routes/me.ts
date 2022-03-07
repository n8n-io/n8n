/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */

import { compare, genSaltSync, hashSync } from 'bcryptjs';
import express = require('express');
import validator from 'validator';
import { LoggerProxy as Logger } from 'n8n-workflow';

import { Db, InternalHooksManager, ResponseHelper } from '../..';
import { issueCookie } from '../auth/jwt';
import { N8nApp, PublicUser } from '../Interfaces';
import { validatePassword, sanitizeUser } from '../UserManagementHelper';
import type { AuthenticatedRequest, MeRequest } from '../../requests';
import { validateEntity } from '../../GenericHelpers';
import { User } from '../../databases/entities/User';

export function meNamespace(this: N8nApp): void {
	/**
	 * Return the logged-in user.
	 */
	this.app.get(
		`/${this.restEndpoint}/me`,
		ResponseHelper.send(async (req: AuthenticatedRequest): Promise<PublicUser> => {
			return sanitizeUser(req.user);
		}),
	);

	/**
	 * Update the logged-in user's settings, except password.
	 */
	this.app.patch(
		`/${this.restEndpoint}/me`,
		ResponseHelper.send(
			async (req: MeRequest.Settings, res: express.Response): Promise<PublicUser> => {
				if (!req.body.email) {
					Logger.debug('Request to update user email failed because of missing email in payload', {
						userId: req.user.id,
						payload: req.body,
					});
					throw new ResponseHelper.ResponseError('Email is mandatory', undefined, 400);
				}

				if (!validator.isEmail(req.body.email)) {
					Logger.debug('Request to update user email failed because of invalid email in payload', {
						userId: req.user.id,
						invalidEmail: req.body.email,
					});
					throw new ResponseHelper.ResponseError('Invalid email address', undefined, 400);
				}

				const newUser = new User();

				Object.assign(newUser, req.user, req.body);

				await validateEntity(newUser);

				const user = await Db.collections.User!.save(newUser);

				Logger.info('User updated successfully', { userId: user.id });

				await issueCookie(res, user);

				const updatedkeys = Object.keys(req.body);
				void InternalHooksManager.getInstance().onUserUpdate({
					user_id: req.user.id,
					fields_changed: updatedkeys,
				});

				return sanitizeUser(user);
			},
		),
	);

	/**
	 * Update the logged-in user's password.
	 */
	this.app.patch(
		`/${this.restEndpoint}/me/password`,
		ResponseHelper.send(async (req: MeRequest.Password, res: express.Response) => {
			const { currentPassword, newPassword } = req.body;

			if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
				throw new ResponseHelper.ResponseError('Invalid payload.', undefined, 400);
			}

			if (!req.user.password) {
				throw new ResponseHelper.ResponseError('Requesting user not set up.');
			}

			const isCurrentPwCorrect = await compare(currentPassword, req.user.password);
			if (!isCurrentPwCorrect) {
				throw new ResponseHelper.ResponseError(
					'Provided current password is incorrect.',
					undefined,
					400,
				);
			}

			const validPassword = validatePassword(newPassword);

			req.user.password = hashSync(validPassword, genSaltSync(10));

			const user = await Db.collections.User!.save(req.user);
			Logger.info('Password updated successfully', { userId: user.id });

			await issueCookie(res, user);

			void InternalHooksManager.getInstance().onUserUpdate({
				user_id: req.user.id,
				fields_changed: ['password'],
			});

			return { success: true };
		}),
	);

	/**
	 * Store the logged-in user's survey answers.
	 */
	this.app.post(
		`/${this.restEndpoint}/me/survey`,
		ResponseHelper.send(async (req: MeRequest.SurveyAnswers) => {
			const { body: personalizationAnswers } = req;

			if (!personalizationAnswers) {
				Logger.debug(
					'Request to store user personalization survey failed because of empty payload',
					{
						userId: req.user.id,
					},
				);
				throw new ResponseHelper.ResponseError(
					'Personalization answers are mandatory',
					undefined,
					400,
				);
			}

			await Db.collections.User!.save({
				id: req.user.id,
				personalizationAnswers,
			});

			Logger.info('User survey updated successfully', { userId: req.user.id });

			void InternalHooksManager.getInstance().onPersonalizationSurveySubmitted(
				req.user.id,
				personalizationAnswers,
			);

			return { success: true };
		}),
	);
}
