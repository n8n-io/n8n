import { mock } from 'jest-mock-extended';
import {
	BinaryDataService,
	InstanceSettings,
	UnrecognizedNodeTypeError,
	type DirectoryLoader,
} from 'n8n-core';
import { Ftp } from 'n8n-nodes-base/credentials/Ftp.credentials';
import { GithubApi } from 'n8n-nodes-base/credentials/GithubApi.credentials';
import { Cron } from 'n8n-nodes-base/nodes/Cron/Cron.node';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import { Set } from 'n8n-nodes-base/nodes/Set/Set.node';
import { Start } from 'n8n-nodes-base/nodes/Start/Start.node';
import type { INodeTypeData, INode } from 'n8n-workflow';
import type request from 'supertest';
import { Container } from 'typedi';
import { v4 as uuid } from 'uuid';

import config from '@/config';
import { AUTH_COOKIE_NAME } from '@/constants';
import { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { ExecutionService } from '@/executions/execution.service';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Push } from '@/push';

import { mockInstance } from '../../../shared/mocking';

export { setupTestServer } from './test-server';

// ----------------------------------
//          initializers
// ----------------------------------

/**
 * Initialize node types.
 */
export async function initActiveWorkflowManager() {
	mockInstance(InstanceSettings, {
		isMultiMain: false,
	});

	mockInstance(Push);
	mockInstance(ExecutionService);
	const { ActiveWorkflowManager } = await import('@/active-workflow-manager');
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
	ScheduleTrigger.prototype.trigger = async () => ({});
	const nodes: INodeTypeData = {
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
		'n8n-nodes-base.scheduleTrigger': {
			type: new ScheduleTrigger(),
			sourcePath: '',
		},
	};
	const loader = mock<DirectoryLoader>();
	loader.getNode.mockImplementation((nodeType) => {
		const node = nodes[`n8n-nodes-base.${nodeType}`];
		if (!node) throw new UnrecognizedNodeTypeError('n8n-nodes-base', nodeType);
		return node;
	});

	const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
	loadNodesAndCredentials.loaders = { 'n8n-nodes-base': loader };
	loadNodesAndCredentials.loaded.nodes = nodes;
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
	const cookiesHeader = response.headers['set-cookie'];
	if (!cookiesHeader) return undefined;

	const cookies = Array.isArray(cookiesHeader) ? cookiesHeader : [cookiesHeader];

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

export * from './community-nodes';

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
