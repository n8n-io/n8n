import { Container } from 'typedi';
import { BinaryDataService } from 'n8n-core';
import { type INode } from 'n8n-workflow';
import { GithubApi } from 'n8n-nodes-base/credentials/GithubApi.credentials';
import { Ftp } from 'n8n-nodes-base/credentials/Ftp.credentials';
import { Cron } from 'n8n-nodes-base/nodes/Cron/Cron.node';
import { Set } from 'n8n-nodes-base/nodes/Set/Set.node';
import { Start } from 'n8n-nodes-base/nodes/Start/Start.node';
import type request from 'supertest';
import { v4 as uuid } from 'uuid';

import config from '@/config';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { SettingsRepository } from '@db/repositories/settings.repository';
import { AUTH_COOKIE_NAME } from '@/constants';
import { ExecutionService } from '@/executions/execution.service';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { Push } from '@/push';
import { OrchestrationService } from '@/services/orchestration.service';

import { mockInstance } from '../../../shared/mocking';

export { setupTestServer } from './testServer';

// ----------------------------------
//          initializers
// ----------------------------------

/**
 * Initialize node types.
 */
export async function initActiveWorkflowManager() {
	mockInstance(OrchestrationService, {
		isMultiMainSetupEnabled: false,
		shouldAddWebhooks: jest.fn().mockReturnValue(true),
	});

	mockInstance(Push);
	mockInstance(ExecutionService);
	const { ActiveWorkflowManager } = await import('@/ActiveWorkflowManager');
	const activeWorkflowManager = Container.get(ActiveWorkflowManager);
	await activeWorkflowManager.init();
	return activeWorkflowManager;
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
export async function initBinaryDataService(mode: 'default' | 'filesystem' = 'default') {
	const binaryDataService = new BinaryDataService();
	await binaryDataService.init({
		mode,
		availableModes: [mode],
		localStoragePath: '',
	});
	Container.set(BinaryDataService, binaryDataService);
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
	const { value } = await Container.get(SettingsRepository).findOneByOrFail({
		key: 'userManagement.isInstanceOwnerSetUp',
	});

	return Boolean(value);
}

export const setInstanceOwnerSetUp = async (value: boolean) => {
	config.set('userManagement.isInstanceOwnerSetUp', value);

	await Container.get(SettingsRepository).update(
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
