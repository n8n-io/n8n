/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */

import express = require('express');
import { v4 as uuid } from 'uuid';
import { URL } from 'url';
import { genSaltSync, hashSync } from 'bcryptjs';

import { Db, ResponseHelper } from '../..';
import { N8nApp } from '../Interfaces';
import { isValidEmail, validatePassword } from '../UserManagementHelper';
import * as UserManagementMailer from '../email';
import type { PasswordResetRequest } from '../Interfaces';
import { issueJWT } from '../auth/jwt';

export function addPasswordResetNamespace(this: N8nApp): void {
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

			if (!isValidEmail(email)) {
				throw new ResponseHelper.ResponseError('Invalid email address', undefined, 400);
			}

			if (!req.headers.host) {
				throw new ResponseHelper.ResponseError('No host found', undefined, 400);
			}

			const user = await Db.collections.User!.findOne({ email });

			if (!user) {
				throw new ResponseHelper.ResponseError('', undefined, 404);
			}

			user.resetPasswordToken = uuid();

			const { id, firstName, lastName, resetPasswordToken } = user;

			await Db.collections.User!.update(id, { resetPasswordToken });

			const baseUrl = `${req.protocol}://${req.headers.host}`;
			const url = new URL(`/${this.restEndpoint}/resolve-password-token`, baseUrl);
			url.searchParams.append('userId', id);
			url.searchParams.append('token', resetPasswordToken);

			void UserManagementMailer.getInstance().passwordReset({
				email,
				firstName,
				lastName,
				passwordResetUrl: url.toString(),
				domain: req.headers.host,
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

			if (!user) {
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

			if (!user) {
				throw new ResponseHelper.ResponseError('', undefined, 404);
			}

			await Db.collections.User!.update(id, {
				password: hashSync(validPassword, genSaltSync(10)),
				resetPasswordToken: null,
			});

			const userData = await issueJWT(req.user);
			res.cookie('n8n-auth', userData.token, { maxAge: userData.expiresIn, httpOnly: true });
		}),
	);
}
