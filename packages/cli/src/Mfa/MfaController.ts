/* eslint-disable import/no-cycle */
import express from 'express';
import * as speakeasy from 'speakeasy';
import { Db } from '..';
import { AuthenticatedRequest } from '../requests';
import { MFA } from './types';

export const mfaController = express.Router();

/**
 * GET /mfa/qr
 */
mfaController.get('/qr', async (req: AuthenticatedRequest, res: express.Response) => {
	const secret = speakeasy.generateSecret({
		issuer: `n8n`,
		name: req.user.email,
		otpauth_url: true,
	});

	await Db.collections.User.update(req.user.id, { mfaSecret: secret.base32 });

	return res.status(200).json({ data: { secret: secret.base32, qrCode: secret.otpauth_url } });
});

/**
 * POST /mfa/enable
 */
mfaController.post('/enable', async (req: MFA.activate, res: express.Response) => {
	const { mfaSecret: secret } = req.user;
	const { code: token } = req.body;

	const verified = speakeasy.totp.verify({ secret: secret ?? '', encoding: 'base32', token });
	if (verified) {
		await Db.collections.User.update(req.user.id, { mfaEnabled: true });
	} else {
		res.status(400).json();
	}

	return res.status(200).json();
});

/**
 * POST /mfa/disable
 */
mfaController.delete('/disable', async (req: AuthenticatedRequest, res: express.Response) => {
	await Db.collections.User.update(req.user.id, { mfaEnabled: false, mfaSecret: '' });

	return res.status(200).json();
});
