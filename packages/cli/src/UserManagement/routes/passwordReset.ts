/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */

import express = require('express');
import { v4 as uuid } from 'uuid';
import { URL } from 'url';
import { genSaltSync, hashSync } from 'bcryptjs';
import validator from 'validator';

import { Db, ResponseHelper } from '../..';
import { N8nApp } from '../Interfaces';
import { validatePassword } from '../UserManagementHelper';
import * as UserManagementMailer from '../email';
import type { PasswordResetRequest } from '../../requests';
import { issueJWT } from '../auth/jwt';
import { getBaseUrl } from '../../GenericHelpers';

export function passwordResetNamespace(this: N8nApp): void {
	/**
	 * Send a password reset email.
	 */
	this.app.post(
		`/${this.restEndpoint}/forgot-password`,
		ResponseHelper.send(async (req: PasswordResetRequest.Email) => {
			const { email } = req.body;

			if (!email) {
				throw new ResponseHelper.ResponseError('Email is mandatory', undefined, 400);
			}

			if (!validator.isEmail(email)) {
				throw new ResponseHelper.ResponseError('Invalid email address', undefined, 400);
			}

			const user = await Db.collections.User!.findOne({ email });

			if (!user || !user.password) {
				throw new ResponseHelper.ResponseError('', undefined, 404);
			}

			user.resetPasswordToken = uuid();

			const { id, firstName, lastName, resetPasswordToken } = user;

			const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) + 7200;

			await Db.collections.User!.update(id, { resetPasswordToken, resetPasswordTokenExpiration });

			const baseUrl = getBaseUrl();
			const url = new URL('/change-password', baseUrl);
			url.searchParams.append('userId', id);
			url.searchParams.append('token', resetPasswordToken);

			void UserManagementMailer.getInstance().passwordReset({
				email,
				firstName,
				lastName,
				passwordResetUrl: url.toString(),
				domain: baseUrl,
			});
		}),
	);

	/**
	 * Verify password reset token and user ID.
	 */
	this.app.get(
		`/${this.restEndpoint}/resolve-password-token`,
		ResponseHelper.send(async (req: PasswordResetRequest.Credentials) => {
			const { token: resetPasswordToken, userId: id } = req.query;

			if (!resetPasswordToken || !id) {
				throw new ResponseHelper.ResponseError('', undefined, 400);
			}

			const user = await Db.collections.User!.findOne({ resetPasswordToken, id });

			if (!user || !user.resetPasswordTokenExpiration) {
				throw new ResponseHelper.ResponseError('', undefined, 404);
			}

			// Timestamp is saved in seconds
			const currentTimestamp = Math.floor(Date.now() / 1000);
			if (currentTimestamp > user.resetPasswordTokenExpiration) {
				throw new ResponseHelper.ResponseError('', undefined, 404);
			}
		}),
	);

	/**
	 * Verify password reset token and user ID and update password.
	 */
	this.app.post(
		`/${this.restEndpoint}/change-password`,
		ResponseHelper.send(async (req: PasswordResetRequest.NewPassword, res: express.Response) => {
			const { token: resetPasswordToken, id, password } = req.body;

			if (!resetPasswordToken || !id || !password) {
				throw new ResponseHelper.ResponseError('Parameter missing', undefined, 400);
			}

			const validPassword = validatePassword(password);

			const user = await Db.collections.User!.findOne({ resetPasswordToken, id });

			if (!user || !user.resetPasswordTokenExpiration) {
				throw new ResponseHelper.ResponseError('', undefined, 404);
			}

			// Timestamp is saved in seconds
			const currentTimestamp = Math.floor(Date.now() / 1000);
			if (currentTimestamp > user.resetPasswordTokenExpiration) {
				throw new ResponseHelper.ResponseError('', undefined, 404);
			}

			await Db.collections.User!.update(id, {
				password: hashSync(validPassword, genSaltSync(10)),
				resetPasswordToken: null,
				resetPasswordTokenExpiration: null,
			});

			const userData = await issueJWT(user);
			res.cookie('n8n-auth', userData.token, { maxAge: userData.expiresIn, httpOnly: true });
		}),
	);
}
