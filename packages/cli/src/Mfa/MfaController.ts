/* eslint-disable import/no-cycle */
import express from 'express';
import * as speakeasy from 'speakeasy';
import { Db } from '..';
import type { AuthenticatedRequest } from '../requests';
import type { MFA } from './types';
import { v4 as uuid } from 'uuid';

export const mfaController = express.Router();

/**
 * GET /mfa/qr
 */
mfaController.get('/qr', async (req: AuthenticatedRequest, res: express.Response) => {
	const secret = speakeasy.generateSecret({
		issuer: 'n8n',
		name: req.user.email,
		otpauth_url: true,
	});

	const codes = Array.from(Array(5)).map(() => uuid());

	await Db.collections.User.update(req.user.id, {
		mfaSecret: secret.base32,
		mfaRecoveryCodes: codes.join('|'),
	});

	return res
		.status(200)
		.json({ data: { secret: secret.base32, qrCode: secret.otpauth_url, recoveryCodes: codes } });
});

/**
 * POST /mfa/enable
 */
mfaController.post('/enable', async (req: MFA.activate, res: express.Response) => {
	const { id } = req.user;

	await Db.collections.User.update(id, { mfaEnabled: true });

	return res.status(200).json();
});

/**
 * POST /mfa/disable
 */
mfaController.delete('/disable', async (req: AuthenticatedRequest, res: express.Response) => {
	await Db.collections.User.update(req.user.id, { mfaEnabled: false, mfaSecret: '' });

	return res.status(200).json();
});

/**
 * POST /mfa/verify
 */
mfaController.post('/verify', async (req: MFA.verify, res: express.Response) => {
	const { mfaSecret: secret, id } = req.user;
	const { token } = req.body;

	const user = await Db.collections.User.findOneBy({ id });

	if (!user) return res.status(400).json();

	const verified = speakeasy.totp.verify({
		secret: secret ?? '',
		encoding: 'base32',
		token,
	});

	if (!verified) return res.status(400).json();

	return res.status(200).json();
});
