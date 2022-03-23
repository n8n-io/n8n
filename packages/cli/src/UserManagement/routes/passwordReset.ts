/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */

import express = require('express');
import { v4 as uuid } from 'uuid';
import { URL } from 'url';
import { genSaltSync, hashSync } from 'bcryptjs';
import validator from 'validator';
import { IsNull, MoreThanOrEqual, Not } from 'typeorm';
import { LoggerProxy as Logger } from 'n8n-workflow';

import { Db, InternalHooksManager, ResponseHelper } from '../..';
import { N8nApp } from '../Interfaces';
import { getInstanceBaseUrl, validatePassword } from '../UserManagementHelper';
import * as UserManagementMailer from '../email';
import type { PasswordResetRequest } from '../../requests';
import { issueCookie } from '../auth/jwt';
import config = require('../../../config');

export function passwordResetNamespace(this: N8nApp): void {
	/**
	 * Send a password reset email.
	 *
	 * Authless endpoint.
	 */
	this.app.post(
		`/${this.restEndpoint}/forgot-password`,
		ResponseHelper.send(async (req: PasswordResetRequest.Email) => {
			if (config.get('userManagement.emails.mode') === '') {
				Logger.debug('Request to send password reset email failed because emailing was not set up');
				throw new ResponseHelper.ResponseError(
					'Email sending must be set up in order to request a password reset email',
					undefined,
					500,
				);
			}

			const { email } = req.body;

			if (!email) {
				Logger.debug(
					'Request to send password reset email failed because of missing email in payload',
					{ payload: req.body },
				);
				throw new ResponseHelper.ResponseError('Email is mandatory', undefined, 400);
			}

			if (!validator.isEmail(email)) {
				Logger.debug(
					'Request to send password reset email failed because of invalid email in payload',
					{ invalidEmail: email },
				);
				throw new ResponseHelper.ResponseError('Invalid email address', undefined, 400);
			}

			// User should just be able to reset password if one is already present
			const user = await Db.collections.User!.findOne({ email, password: Not(IsNull()) });

			if (!user || !user.password) {
				Logger.debug(
					'Request to send password reset email failed because no user was found for the provided email',
					{ invalidEmail: email },
				);
				return;
			}

			user.resetPasswordToken = uuid();

			const { id, firstName, lastName, resetPasswordToken } = user;

			const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) + 7200;

			await Db.collections.User!.update(id, { resetPasswordToken, resetPasswordTokenExpiration });

			const baseUrl = getInstanceBaseUrl();
			const url = new URL(`${baseUrl}/change-password`);
			url.searchParams.append('userId', id);
			url.searchParams.append('token', resetPasswordToken);

			try {
				const mailer = await UserManagementMailer.getInstance();
				await mailer.passwordReset({
					email,
					firstName,
					lastName,
					passwordResetUrl: url.toString(),
					domain: baseUrl,
				});
			} catch (error) {
				void InternalHooksManager.getInstance().onEmailFailed({
					user_id: user.id,
					message_type: 'Reset password',
				});
				if (error instanceof Error) {
					throw new ResponseHelper.ResponseError(
						`Please contact your administrator: ${error.message}`,
						undefined,
						500,
					);
				}
			}

			Logger.info('Sent password reset email successfully', { userId: user.id, email });
			void InternalHooksManager.getInstance().onUserTransactionalEmail({
				user_id: id,
				message_type: 'Reset password',
			});

			void InternalHooksManager.getInstance().onUserPasswordResetRequestClick({
				user_id: id,
			});
		}),
	);

	/**
	 * Verify password reset token and user ID.
	 *
	 * Authless endpoint.
	 */
	this.app.get(
		`/${this.restEndpoint}/resolve-password-token`,
		ResponseHelper.send(async (req: PasswordResetRequest.Credentials) => {
			const { token: resetPasswordToken, userId: id } = req.query;

			if (!resetPasswordToken || !id) {
				Logger.debug(
					'Request to resolve password token failed because of missing password reset token or user ID in query string',
					{
						queryString: req.query,
					},
				);
				throw new ResponseHelper.ResponseError('', undefined, 400);
			}

			// Timestamp is saved in seconds
			const currentTimestamp = Math.floor(Date.now() / 1000);

			const user = await Db.collections.User!.findOne({
				id,
				resetPasswordToken,
				resetPasswordTokenExpiration: MoreThanOrEqual(currentTimestamp),
			});

			if (!user) {
				Logger.debug(
					'Request to resolve password token failed because no user was found for the provided user ID and reset password token',
					{
						userId: id,
						resetPasswordToken,
					},
				);
				throw new ResponseHelper.ResponseError('', undefined, 404);
			}

			Logger.info('Reset-password token resolved successfully', { userId: id });
			void InternalHooksManager.getInstance().onUserPasswordResetEmailClick({
				user_id: id,
			});
		}),
	);

	/**
	 * Verify password reset token and user ID and update password.
	 *
	 * Authless endpoint.
	 */
	this.app.post(
		`/${this.restEndpoint}/change-password`,
		ResponseHelper.send(async (req: PasswordResetRequest.NewPassword, res: express.Response) => {
			const { token: resetPasswordToken, userId, password } = req.body;

			if (!resetPasswordToken || !userId || !password) {
				Logger.debug(
					'Request to change password failed because of missing user ID or password or reset password token in payload',
					{
						payload: req.body,
					},
				);
				throw new ResponseHelper.ResponseError(
					'Missing user ID or password or reset password token',
					undefined,
					400,
				);
			}

			const validPassword = validatePassword(password);

			// Timestamp is saved in seconds
			const currentTimestamp = Math.floor(Date.now() / 1000);

			const user = await Db.collections.User!.findOne({
				id: userId,
				resetPasswordToken,
				resetPasswordTokenExpiration: MoreThanOrEqual(currentTimestamp),
			});

			if (!user) {
				Logger.debug(
					'Request to resolve password token failed because no user was found for the provided user ID and reset password token',
					{
						userId,
						resetPasswordToken,
					},
				);
				throw new ResponseHelper.ResponseError('', undefined, 404);
			}

			await Db.collections.User!.update(userId, {
				password: hashSync(validPassword, genSaltSync(10)),
				resetPasswordToken: null,
				resetPasswordTokenExpiration: null,
			});

			Logger.info('User password updated successfully', { userId });

			await issueCookie(res, user);
		}),
	);
}
