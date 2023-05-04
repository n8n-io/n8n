/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
import { Router } from 'express';
import type { Request } from 'express';
import bodyParser from 'body-parser';
import { v4 as uuid } from 'uuid';
import { Container } from 'typedi';
import config from '@/config';
import * as Db from '@/Db';
import type { Role } from '@db/entities/Role';
import { RoleRepository } from '@db/repositories';
import { hashPassword } from '@/UserManagement/UserManagementHelper';
import { eventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { License } from '../License';
import { LICENSE_FEATURES } from '@/constants';

if (process.env.E2E_TESTS !== 'true') {
	console.error('E2E endpoints only allowed during E2E tests');
	process.exit(1);
}

const enabledFeatures = {
	[LICENSE_FEATURES.SHARING]: true, //default to true here instead of setting it in config/index.ts for e2e
	[LICENSE_FEATURES.LDAP]: false,
	[LICENSE_FEATURES.SAML]: false,
	[LICENSE_FEATURES.LOG_STREAMING]: false,
	[LICENSE_FEATURES.ADVANCED_EXECUTION_FILTERS]: false,
	[LICENSE_FEATURES.VERSION_CONTROL]: false,
};

type Feature = keyof typeof enabledFeatures;

Container.get(License).isFeatureEnabled = (feature: Feature) => enabledFeatures[feature] ?? false;

const tablesNotToTruncate = ['sqlite_sequence'];

const truncateAll = async () => {
	const connection = Db.getConnection();
	const allTables: Array<{ name: string }> = await connection.query(
		"SELECT name FROM sqlite_master WHERE type='table';",
	);

	// Disable foreign key constraint checks
	await connection.query('PRAGMA foreign_keys = OFF;');

	for (const { name: table } of allTables) {
		try {
			if (tablesNotToTruncate.includes(table)) continue;
			await connection.query(
				`DELETE FROM ${table}; DELETE FROM sqlite_sequence WHERE name=${table};`,
			);
		} catch (error) {
			console.warn('Dropping Table for E2E Reset error: ', error);
		}
	}

	// Re-enable foreign key constraint checks
	await connection.query('PRAGMA foreign_keys = ON;');
};

const setupUserManagement = async () => {
	const connection = Db.getConnection();
	await connection.query('INSERT INTO role (name, scope) VALUES ("owner", "global");');
	const instanceOwnerRole = (await connection.query(
		'SELECT last_insert_rowid() as insertId',
	)) as Array<{ insertId: number }>;

	const roles: Array<[Role['name'], Role['scope']]> = [
		['member', 'global'],
		['owner', 'workflow'],
		['owner', 'credential'],
		['user', 'credential'],
		['editor', 'workflow'],
	];

	await Promise.all(
		roles.map(async ([name, scope]) =>
			connection.query(`INSERT INTO role (name, scope) VALUES ("${name}", "${scope}");`),
		),
	);
	await connection.query(
		`INSERT INTO user (id, globalRoleId) values ("${uuid()}", ${instanceOwnerRole[0].insertId})`,
	);
	await connection.query(
		"INSERT INTO \"settings\" (key, value, loadOnStartup) values ('userManagement.isInstanceOwnerSetUp', 'false', true), ('userManagement.skipInstanceOwnerSetup', 'false', true)",
	);

	config.set('userManagement.isInstanceOwnerSetUp', false);
};

const resetLogStreaming = async () => {
	enabledFeatures[LICENSE_FEATURES.LOG_STREAMING] = false;
	for (const id in eventBus.destinations) {
		await eventBus.removeDestination(id);
	}
};

export const e2eController = Router();

e2eController.post('/db/reset', async (req, res) => {
	await resetLogStreaming();
	await truncateAll();
	await setupUserManagement();

	res.writeHead(204).end();
});

e2eController.post('/db/setup-owner', bodyParser.json(), async (req, res) => {
	if (config.get('userManagement.isInstanceOwnerSetUp')) {
		res.writeHead(500).send({ error: 'Owner already setup' });
		return;
	}

	const globalRole = await Container.get(RoleRepository).findGlobalOwnerRoleOrFail();

	const owner = await Db.collections.User.findOneByOrFail({ globalRoleId: globalRole.id });

	await Db.collections.User.update(owner.id, {
		email: req.body.email,
		password: await hashPassword(req.body.password),
		firstName: req.body.firstName,
		lastName: req.body.lastName,
	});

	await Db.collections.Settings.update(
		{ key: 'userManagement.isInstanceOwnerSetUp' },
		{ value: 'true' },
	);

	config.set('userManagement.isInstanceOwnerSetUp', true);

	res.writeHead(204).end();
});

e2eController.patch(
	'/feature/:feature',
	bodyParser.json(),
	async (req: Request<{ feature: Feature }>, res) => {
		const { feature } = req.params;
		const { enabled } = req.body;

		enabledFeatures[feature] = enabled === undefined || enabled === true;
		res.writeHead(204).end();
	},
);
