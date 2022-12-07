import express from 'express';
import { LdapManager } from '../LdapManager.ee';
import { getLdapConfig, getLdapSynchronizations, updateLdapConfig } from '../helpers';
import type { LdapConfiguration } from '../types';
import { InternalHooksManager } from '@/InternalHooksManager';
import pick from 'lodash.pick';
import { NON_SENSIBLE_LDAP_CONFIG_PROPERTIES } from '../constants';

export const ldapController = express.Router();

/**
 * GET /ldap/config
 */
ldapController.get('/config', async (req: express.Request, res: express.Response) => {
	const data = await getLdapConfig();
	return res.status(200).json({ data });
});
/**
 * POST /ldap/test-connection
 */
ldapController.post('/test-connection', async (req: express.Request, res: express.Response) => {
	try {
		await LdapManager.getInstance().service.testConnection();
	} catch (error) {
		const errorObject = error as { message: string };
		return res.status(400).json({ message: errorObject.message });
	}
	return res.status(200).json();
});

/**
 * PUT /ldap/config
 */
ldapController.put('/config', async (req: LdapConfiguration.Update, res: express.Response) => {
	try {
		await updateLdapConfig(req.body);
	} catch (e) {
		if (e instanceof Error) {
			return res.status(400).json({ message: e.message });
		}
	}

	const data = await getLdapConfig();

	void InternalHooksManager.getInstance().onUserUpdatedLdapSettings({
		user_id: req.user.id,
		...pick(data, NON_SENSIBLE_LDAP_CONFIG_PROPERTIES),
	});

	return res.status(200).json({ data });
});

/**
 * POST /ldap/sync
 */
ldapController.post('/sync', async (req: LdapConfiguration.Sync, res: express.Response) => {
	const runType = req.body.type;

	try {
		await LdapManager.getInstance().sync.run(runType);
	} catch (e) {
		if (e instanceof Error) {
			return res.status(400).json({ message: e.message });
		}
	}
	return res.status(200).json({});
});

/**
 * GET /ldap/sync
 */
ldapController.get('/sync', async (req: LdapConfiguration.GetSync, res: express.Response) => {
	const { page = '0', perPage = '20' } = req.query;
	const data = await getLdapSynchronizations(parseInt(page, 10), parseInt(perPage, 10));
	return res.status(200).json({ data });
});
