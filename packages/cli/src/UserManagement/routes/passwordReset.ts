/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */

import express = require('express');
import { v4 as uuid } from 'uuid';
import { URL } from 'url';
import { genSaltSync, hashSync } from 'bcryptjs';
import validator from 'validator';
import { LoggerProxy } from 'n8n-workflow';

import { Db, ResponseHelper } from '../..';
import { N8nApp } from '../Interfaces';
import { validatePassword } from '../UserManagementHelper';
import * as UserManagementMailer from '../email';
import type { PasswordResetRequest } from '../../requests';
import { issueCookie } from '../auth/jwt';
import { getBaseUrl } from '../../GenericHelpers';
import { getLogger } from '../../Logger';

LoggerProxy.init(getLogger());

export function passwordResetNamespace(this: N8nApp): void {
	/**
	 * Send a password reset email.
	 */
	this.app.post(
		`/${this.restEndpoint}/forgot-password`,
		ResponseHelper.send(async (req: PasswordResetRequest.Email) => {
			const { email } = req.body;

			if (!email) {
				LoggerProxy.error('Missing email in payload at POST /forgot-password');
				throw new ResponseHelper.ResponseError('Email is mandatory', undefined, 400);
			}

			if (!validator.isEmail(email)) {
				LoggerProxy.error('Invalid email in payload at POST /forgot-password');
				throw new ResponseHelper.ResponseError('Invalid email address', undefined, 400);
			}

			const user = await Db.collections.User!.findOne({ email });

			if (!user) {
				throw new ResponseHelper.ResponseError('', undefined, 404);
			}

			user.resetPasswordToken = uuid();

			const { id, firstName, lastName, resetPasswordToken } = user;

			await Db.collections.User!.update(id, { resetPasswordToken });

			const baseUrl = getBaseUrl();
			const url = new URL('/change-password', baseUrl);
			url.searchParams.append('userId', id);
			url.searchParams.append('token', resetPasswordToken);

			await UserManagementMailer.getInstance().passwordReset({
				email,
				firstName,
				lastName,
				passwordResetUrl: url.toString(),
				domain: baseUrl,
			});

			LoggerProxy.debug('Sent password reset email successfully at POST /forgot-password');
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
				LoggerProxy.error('Missing password reset token or user ID at GET /resolve-password-token');
				throw new ResponseHelper.ResponseError('', undefined, 400);
			}

			const user = await Db.collections.User!.findOne({ resetPasswordToken, id });

			if (!user) {
				LoggerProxy.error('User not found at GET /resolve-password-token');
				throw new ResponseHelper.ResponseError('', undefined, 404);
			}

			LoggerProxy.debug('Password token resolved successfully at GET /resolve-password-token', {
				resetPasswordToken,
				userId: id,
			});
		}),
	);

	/**
	 * Verify password reset token and user ID and update password.
	 */
	this.app.post(
		`/${this.restEndpoint}/change-password`,
		ResponseHelper.send(async (req: PasswordResetRequest.NewPassword, res: express.Response) => {
			const { token: resetPasswordToken, userId, password } = req.body;

			if (!resetPasswordToken || !userId || !password) {
				throw new ResponseHelper.ResponseError('Parameter missing', undefined, 400);
			}

			const validPassword = validatePassword(password);

			const user = await Db.collections.User!.findOne({ id: userId, resetPasswordToken });

			if (!user) {
				LoggerProxy.error('Missing password reset token or user ID at POST /change-password');
				throw new ResponseHelper.ResponseError('', undefined, 404);
			}

			await Db.collections.User!.update(userId, {
				password: hashSync(validPassword, genSaltSync(10)),
				resetPasswordToken: null,
			});

			LoggerProxy.debug('User password updated successfully at POST /change-password', {
				userId,
			});

			await issueCookie(res, req.user);
		}),
	);
}
