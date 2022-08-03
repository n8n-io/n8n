/* eslint-disable import/no-cycle */
import type { Response } from 'express';
import validator from 'validator';
import { LoggerProxy as Logger } from 'n8n-workflow';
import { randomBytes } from 'crypto';
import { Delete, Get, Patch, Post, RestController } from '../decorators';
import type { AuthenticatedRequest, MeRequest } from '../../requests';
import type { PublicUser } from '../Interfaces';
import { compareHash, hashPassword, sanitizeUser, validatePassword } from '../UserManagementHelper';
import { Db, InternalHooksManager, ResponseHelper } from '../..';
import { User } from '../../databases/entities/User';
import { validateEntity } from '../../GenericHelpers';
import { issueCookie } from '../auth/jwt';

@RestController('/me')
export class MeController {
	/**
	 * Return the logged-in user.
	 */
	@Get()
	async getCurrentUser(req: AuthenticatedRequest): Promise<PublicUser> {
		return sanitizeUser(req.user);
	}

	/**
	 * Update the logged-in user's settings, except password.
	 */
	@Patch()
	async updateCurrentUser(req: MeRequest.Settings, res: Response): Promise<PublicUser> {
		const { email } = req.body;
		if (!email) {
			Logger.debug('Request to update user email failed because of missing email in payload', {
				userId: req.user.id,
				payload: req.body,
			});
			throw new ResponseHelper.ResponseError('Email is mandatory', undefined, 400);
		}

		if (!validator.isEmail(email)) {
			Logger.debug('Request to update user email failed because of invalid email in payload', {
				userId: req.user.id,
				invalidEmail: email,
			});
			throw new ResponseHelper.ResponseError('Invalid email address', undefined, 400);
		}

		const newUser = new User();

		Object.assign(newUser, req.user, req.body);

		await validateEntity(newUser);

		const user = await Db.collections.User.save(newUser);

		Logger.info('User updated successfully', { userId: user.id });

		await issueCookie(res, user);

		const updatedkeys = Object.keys(req.body);
		void InternalHooksManager.getInstance().onUserUpdate({
			user_id: req.user.id,
			fields_changed: updatedkeys,
		});

		return sanitizeUser(user);
	}

	/**
	 * Update the logged-in user's password.
	 */
	@Patch('/password')
	async updatePassword(req: MeRequest.Password, res: Response) {
		const { currentPassword, newPassword } = req.body;

		if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
			throw new ResponseHelper.ResponseError('Invalid payload.', undefined, 400);
		}

		if (!req.user.password) {
			throw new ResponseHelper.ResponseError('Requesting user not set up.');
		}

		const isCurrentPwCorrect = await compareHash(currentPassword, req.user.password);
		if (!isCurrentPwCorrect) {
			throw new ResponseHelper.ResponseError(
				'Provided current password is incorrect.',
				undefined,
				400,
			);
		}

		const validPassword = validatePassword(newPassword);

		req.user.password = await hashPassword(validPassword);

		const user = await Db.collections.User.save(req.user);
		Logger.info('Password updated successfully', { userId: user.id });

		await issueCookie(res, user);

		void InternalHooksManager.getInstance().onUserUpdate({
			user_id: req.user.id,
			fields_changed: ['password'],
		});

		return { success: true };
	}

	/**
	 * Store the logged-in user's survey answers.
	 */
	@Post('/survey')
	async storeSurveyAnswers(req: MeRequest.SurveyAnswers) {
		const { body: personalizationAnswers } = req;

		if (!personalizationAnswers) {
			Logger.debug('Request to store user personalization survey failed because of empty payload', {
				userId: req.user.id,
			});
			throw new ResponseHelper.ResponseError(
				'Personalization answers are mandatory',
				undefined,
				400,
			);
		}

		await Db.collections.User.save({
			id: req.user.id,
			personalizationAnswers,
		});

		Logger.info('User survey updated successfully', { userId: req.user.id });

		void InternalHooksManager.getInstance().onPersonalizationSurveySubmitted(
			req.user.id,
			personalizationAnswers,
		);

		return { success: true };
	}

	/**
	 * Creates an API Key
	 */
	@Post('/api-key')
	async createAPIKey(req: AuthenticatedRequest) {
		const apiKey = `n8n_api_${randomBytes(40).toString('hex')}`;

		await Db.collections.User.update(req.user.id, { apiKey });

		const telemetryData = {
			user_id: req.user.id,
			public_api: false,
		};

		void InternalHooksManager.getInstance().onApiKeyCreated(telemetryData);

		return { apiKey };
	}

	/**
	 * Get an API Key
	 */
	@Get('/api-key')
	async getAPIKey(req: AuthenticatedRequest) {
		return { apiKey: req.user.apiKey };
	}

	/**
	 * Deletes an API Key
	 */
	@Delete('/api-key')
	async deleteAPIKey(req: AuthenticatedRequest) {
		await Db.collections.User.update(req.user.id, { apiKey: null });

		const telemetryData = {
			user_id: req.user.id,
			public_api: false,
		};

		void InternalHooksManager.getInstance().onApiKeyDeleted(telemetryData);

		return { success: true };
	}
}
