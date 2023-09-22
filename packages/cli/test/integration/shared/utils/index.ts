import { Container } from 'typedi';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { BinaryDataService, UserSettings } from 'n8n-core';
import type { INode } from 'n8n-workflow';
import { GithubApi } from 'n8n-nodes-base/credentials/GithubApi.credentials';
import { Ftp } from 'n8n-nodes-base/credentials/Ftp.credentials';
import { Cron } from 'n8n-nodes-base/nodes/Cron/Cron.node';
import { Set } from 'n8n-nodes-base/nodes/Set/Set.node';
import { Start } from 'n8n-nodes-base/nodes/Start/Start.node';
import type request from 'supertest';
import { v4 as uuid } from 'uuid';

import config from '@/config';
import * as Db from '@/Db';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { AUTH_COOKIE_NAME } from '@/constants';

import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';

export { mockInstance } from './mocking';
export { setupTestServer } from './testServer';

// ----------------------------------
//          initializers
// ----------------------------------

/**
 * Initialize node types.
 */
export async function initActiveWorkflowRunner(): Promise<ActiveWorkflowRunner> {
	const workflowRunner = Container.get(ActiveWorkflowRunner);
	await workflowRunner.init();
	return workflowRunner;
}

/**
 * Initialize node types.
 */
export async function initCredentialsTypes(): Promise<void> {
	Container.get(LoadNodesAndCredentials).loaded.credentials = {
		githubApi: {
			type: new GithubApi(),
			sourcePath: '',
		},
		ftp: {
			type: new Ftp(),
			sourcePath: '',
		},
	};
}

/**
 * Initialize node types.
 */
export async function initNodeTypes() {
	Container.get(LoadNodesAndCredentials).loaded.nodes = {
		'n8n-nodes-base.start': {
			type: new Start(),
			sourcePath: '',
		},
		'n8n-nodes-base.cron': {
			type: new Cron(),
			sourcePath: '',
		},
		'n8n-nodes-base.set': {
			type: new Set(),
			sourcePath: '',
		},
	};
}

/**
 * Initialize a BinaryDataService for test runs.
 */
export async function initBinaryDataService() {
	const binaryDataService = new BinaryDataService();

	await binaryDataService.init(config.getEnv('binaryDataManager'));

	Container.set(BinaryDataService, binaryDataService);
}

/**
 * Initialize a user settings config file if non-existent.
 */
// TODO: this should be mocked
export async function initEncryptionKey() {
	const settingsPath = UserSettings.getUserSettingsPath();

	if (!existsSync(settingsPath)) {
		const userSettings = { encryptionKey: randomBytes(24).toString('base64') };
		await UserSettings.writeUserSettings(userSettings, settingsPath);
	}
}

/**
 * Extract the value (token) of the auth cookie in a response.
 */
export function getAuthToken(response: request.Response, authCookieName = AUTH_COOKIE_NAME) {
	const cookies: string[] = response.headers['set-cookie'];

	if (!cookies) return undefined;

	const authCookie = cookies.find((c) => c.startsWith(`${authCookieName}=`));

	if (!authCookie) return undefined;

	const match = authCookie.match(new RegExp(`(^| )${authCookieName}=(?<token>[^;]+)`));

	if (!match || !match.groups) return undefined;

	return match.groups.token;
}

// ----------------------------------
//            settings
// ----------------------------------

export async function isInstanceOwnerSetUp() {
	const { value } = await Db.collections.Settings.findOneByOrFail({
		key: 'userManagement.isInstanceOwnerSetUp',
	});

	return Boolean(value);
}

export const setInstanceOwnerSetUp = async (value: boolean) => {
	config.set('userManagement.isInstanceOwnerSetUp', value);

	await Db.collections.Settings.update(
		{ key: 'userManagement.isInstanceOwnerSetUp' },
		{ value: JSON.stringify(value) },
	);
};

// ----------------------------------
//           community nodes
// ----------------------------------

export * from './communityNodes';

// ----------------------------------
//           workflow
// ----------------------------------

export function makeWorkflow(options?: {
	withPinData: boolean;
	withCredential?: { id: string; name: string };
}) {
	const workflow = new WorkflowEntity();

	const node: INode = {
		id: uuid(),
		name: 'Cron',
		type: 'n8n-nodes-base.cron',
		parameters: {},
		typeVersion: 1,
		position: [740, 240],
	};

	if (options?.withCredential) {
		node.credentials = {
			spotifyApi: options.withCredential,
		};
	}

	workflow.name = 'My Workflow';
	workflow.active = false;
	workflow.connections = {};
	workflow.nodes = [node];

	if (options?.withPinData) {
		workflow.pinData = MOCK_PINDATA;
	}

	return workflow;
}

export const MOCK_PINDATA = { Spotify: [{ json: { myKey: 'myValue' } }] };
