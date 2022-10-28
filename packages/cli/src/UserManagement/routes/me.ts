/* eslint-disable @typescript-eslint/no-unused-vars */

import express from 'express';
import validator from 'validator';
import { randomBytes } from 'crypto';
import { LoggerProxy as Logger } from 'n8n-workflow';

import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import { InternalHooksManager } from '@/InternalHooksManager';
import { issueCookie } from '../auth/jwt';
import { N8nApp, PublicUser } from '../Interfaces';
import { sanitizeUser, compareHash } from '../UserManagementHelper';
import type { AuthenticatedRequest, MeRequest } from '@/requests';
import { User } from '@db/entities/User';

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
				const { email } = req.body;
				const userId = req.user.id;
				if (!email) {
					Logger.debug('Request to update user email failed because of missing email in payload', {
						userId,
						payload: req.body,
					});
					throw new ResponseHelper.ResponseError('Email is mandatory', undefined, 400);
				}

				if (!validator.isEmail(email)) {
					Logger.debug('Request to update user email failed because of invalid email in payload', {
						userId,
						invalidEmail: email,
					});
					throw new ResponseHelper.ResponseError('Invalid email address', undefined, 400);
				}

				const { email: currentEmail } = req.user;

				const updatedUser = new User();
				Object.assign(updatedUser, req.user, req.body);
				const user = await Db.repositories.User.validateAndUpdate(updatedUser);

				Logger.info('User updated successfully', { userId });

				await issueCookie(res, user);

				const updatedKeys = Object.keys(req.body);
				void InternalHooksManager.getInstance().onUserUpdate({
					user_id: userId,
					fields_changed: updatedKeys,
				});

				const sanitizedUser = sanitizeUser(user);
				await this.externalHooks.run('user.profile.update', [currentEmail, sanitizedUser]);

				return sanitizedUser;
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

			const user = req.user;

			if (!user.password) {
				throw new ResponseHelper.ResponseError('Requesting user not set up.');
			}

			const isCurrentPwCorrect = await compareHash(currentPassword, user.password);
			if (!isCurrentPwCorrect) {
				throw new ResponseHelper.ResponseError(
					'Provided current password is incorrect.',
					undefined,
					400,
				);
			}

			await Db.repositories.User.updatePassword(user, newPassword);
			Logger.info('Password updated successfully', { userId: user.id });

			await issueCookie(res, user);

			void InternalHooksManager.getInstance().onUserUpdate({
				user_id: user.id,
				fields_changed: ['password'],
			});

			await this.externalHooks.run('user.password.update', [user.email, user.password]);

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

			await Db.repositories.User.update(req.user, { personalizationAnswers });

			Logger.info('User survey updated successfully', { userId: req.user.id });

			void InternalHooksManager.getInstance().onPersonalizationSurveySubmitted(
				req.user.id,
				personalizationAnswers,
			);

			return { success: true };
		}),
	);

	/**
	 * Creates an API Key
	 */
	this.app.post(
		`/${this.restEndpoint}/me/api-key`,
		ResponseHelper.send(async (req: AuthenticatedRequest) => {
			const apiKey = `n8n_api_${randomBytes(40).toString('hex')}`;

			await Db.repositories.User.update(req.user, { apiKey });

			const telemetryData = {
				user_id: req.user.id,
				public_api: false,
			};

			void InternalHooksManager.getInstance().onApiKeyCreated(telemetryData);

			return { apiKey };
		}),
	);

	/**
	 * Deletes an API Key
	 */
	this.app.delete(
		`/${this.restEndpoint}/me/api-key`,
		ResponseHelper.send(async (req: AuthenticatedRequest) => {
			await Db.repositories.User.update(req.user, { apiKey: null });

			const telemetryData = {
				user_id: req.user.id,
				public_api: false,
			};

			void InternalHooksManager.getInstance().onApiKeyDeleted(telemetryData);

			return { success: true };
		}),
	);

	/**
	 * Get an API Key
	 */
	this.app.get(
		`/${this.restEndpoint}/me/api-key`,
		ResponseHelper.send(async (req: AuthenticatedRequest) => {
			return { apiKey: req.user.apiKey };
		}),
	);
}
