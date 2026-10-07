import { LicenseState } from '@n8n/backend-common';
import { createWorkflow, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, NodeContractVersionRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { LazyPackageDirectoryLoader } from 'n8n-core';
import {
	createRunExecutionData,
	type ICredentialDataDecryptedObject,
	type INode,
	type IWorkflowBase,
} from 'n8n-workflow';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NextNodesInstanceService } from '@/modules/next-nodes-instance/next-nodes-instance.service';
import { FALLBACK_PACKAGE, firstPartyCatalog } from '@/node-contracts-catalog';
import { contractNodeLoadersOf, nodeContractsRuntime } from '@/node-contracts-registry';
import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { WorkflowRunner } from '@/workflow-runner';

import { saveCredential } from './shared/db/credentials';
import { createMember, createOwner } from './shared/db/users';
import * as utils from './shared/utils';

const TYPE = `${FALLBACK_PACKAGE}.acmeGreetingGet`;

const server = { url: '', http: createServer() };
const state = { owner: undefined as unknown as User };

/** A declarative HTTP action: Acme greets a name. Only the path differs between versions. */
const configOf = (path: string) => ({
	contract: {
		id: 'acme.greeting.get',
		version: 1,
		node: 'acme',
		action: 'Get a greeting',
		summary: 'Get a greeting for a name.',
		flow: { effect: 'read', cardinality: 'per-item', idempotent: true, passthrough: 'replace' },
		credentials: [],
		input: {
			type: 'object',
			properties: { name: { type: 'string' } },
			required: ['name'],
			additionalProperties: false,
		},
		output: {
			type: 'object',
			properties: { text: { type: 'string' } },
			required: ['text'],
			additionalProperties: false,
		},
	},
	baseUrl: server.url,
	request: { method: 'GET', path, query: { name: { input: 'name' } } },
});

const fixtures = {
	executions: [
		{
			name: 'Ada',
			params: { name: 'Ada' },
			// Both paths of the action end in /greet, so one route replays either.
			routes: [{ path: '/greet', reply: { json: { text: 'Hello Ada' } } }],
			output: [{ text: 'Hello Ada' }],
		},
	],
};

const service = () => Container.get(NextNodesInstanceService);

const publish = async (path: string) =>
	await service().publish(configOf(path), fixtures, { userId: state.owner.id });

/** An action that extends the shipped GitHub node: lock an issue. */
const githubConfigOf = (id: string) => ({
	extends: 'github',
	contract: {
		id,
		version: 1,
		node: 'github',
		action: 'Lock an issue',
		summary: 'Lock the conversation of an issue.',
		flow: {
			effect: 'write',
			cardinality: 'per-item',
			idempotent: true,
			passthrough: 'replace',
		},
		credentials: [],
		input: {
			type: 'object',
			properties: { issueNumber: { type: 'integer' } },
			required: ['issueNumber'],
		},
		output: { type: 'object' },
	},
	request: { method: 'PUT', path: '/repos/{owner}/{repository}/issues/{issueNumber}/lock' },
});

const publishGithub = async (id: string) =>
	await service().publish(
		githubConfigOf(id),
		{
			executions: [
				{
					name: 'lock #7',
					params: { owner: 'n8n-io', repository: 'n8n', issueNumber: 7 },
					credential: { server: 'https://api.github.com' },
					routes: [{ method: 'PUT', path: '/lock', reply: { json: {} } }],
					output: [{}],
				},
			],
		},
		{ userId: state.owner.id },
	);

const greetNode = (): INode => ({
	id: 'greet',
	name: 'Greet',
	type: TYPE,
	typeVersion: 1,
	position: [0, 0],
	parameters: { name: 'Ada' },
});

/** A workflow whose Greet node pins one version of the action. */
async function pinnedWorkflow(semver: string) {
	const row = await Container.get(NodeContractVersionRepository).findOneByOrFail({
		contractId: 'acme.greeting.get',
		version: semver,
	});
	const node = { ...greetNode(), contract: { version: semver, digest: row.digest } };
	return await createWorkflow({ nodes: [node], connections: {} }, state.owner);
}

async function textOf(workflow: IWorkflowBase) {
	const node = workflow.nodes[0] as INode;
	const executionId = await Container.get(WorkflowRunner).run(
		{
			workflowData: workflow,
			userId: state.owner.id,
			executionMode: 'webhook',
			executionData: createRunExecutionData({
				executionData: {
					nodeExecutionStack: [{ node, data: { main: [[{ json: {} }]] }, source: null }],
				},
			}),
		},
		true,
	);
	const executions = Container.get(ExecutionRepository);
	await vi.waitFor(
		async () => expect((await executions.findOneBy({ id: executionId }))?.finished).toBe(true),
		{ timeout: 10_000, interval: 50 },
	);
	const execution = await executions.findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});
	return execution?.data.resultData.runData.Greet?.[0]?.data?.main[0]?.[0]?.json.text;
}

const integrations = () => {
	const loader = Container.get(LoadNodesAndCredentials).loaders[FALLBACK_PACKAGE];
	if (!loader) throw new Error(`${FALLBACK_PACKAGE} is not loaded`);
	return loader;
};

const descriptionOf = (name = 'acmeGreetingGet') => {
	const { type } = integrations().getNode(name);
	return 'nodeVersions' in type ? type.nodeVersions[1]?.description : undefined;
};

mockInstance(Push);
mockInstance(Publisher);
mockInstance(LicenseState);

beforeAll(async () => {
	server.http.on('request', (request, response) => {
		const { pathname, searchParams } = new URL(request.url ?? '', 'http://localhost');
		response.setHeader('content-type', 'application/json');
		const { method, headers } = request;
		const greeting = pathname === '/v2/greet' ? 'Hi' : 'Hello';
		response.end(
			pathname.startsWith('/repos/')
				? JSON.stringify({ method, pathname, auth: headers.authorization })
				: JSON.stringify({
						text: `${greeting} ${searchParams.get('name') ?? ''}`,
						...(headers['x-key'] ? { key: headers['x-key'] } : {}),
					}),
		);
	});
	server.url = await new Promise<string>((resolve) =>
		server.http.listen(0, '127.0.0.1', () =>
			resolve(`http://127.0.0.1:${(server.http.address() as AddressInfo).port}`),
		),
	);
	Object.assign(Container.get(GlobalConfig).instanceAi, {
		nodeContractsEnabled: true,
		nodeContractsNpmRegistry: '',
		nodeContractsUpdatePolicy: 'strict',
		nodeContractRange: '>=2.0.0 <3.0.0',
	});
	await testModules.loadModules(['next-nodes-instance']);
	await testDb.init();
	state.owner = await createOwner();
	await utils.initBinaryDataService();
	const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
	// The credential types and the legacy nodes that contract nodes stand for, e.g. GitHub.
	const nodesBase = new LazyPackageDirectoryLoader(path.resolve(__dirname, '../../../nodes-base'));
	await nodesBase.loadAll();
	const contracts = contractNodeLoadersOf(await nodeContractsRuntime(), {
		excludeNodes: [],
		includeNodes: [],
		deny: [],
		legacyLoaders: () => loadNodesAndCredentials.loaders,
	});
	loadNodesAndCredentials.loaders = {
		'n8n-nodes-base': nodesBase,
		...Object.fromEntries(contracts.map((loader) => [loader.packageName, loader])),
	};
	await Promise.all(contracts.map(async (loader) => await loader.loadAll()));
	await loadNodesAndCredentials.postProcessLoaders();
});

afterAll(async () => {
	server.http.close();
	await testDb.terminate();
});

describe('next node versions of this instance', () => {
	it('publishes a config as a private version, and a pinned workflow keeps its version', async () => {
		expect((await publish('/v1/greet')).semver).toBe('1.0.0');
		expect(descriptionOf()).toMatchObject({
			version: 1,
			codex: expect.objectContaining({ app: { id: 'acme', displayName: 'acme' } }),
		});
		expect(descriptionOf()?.hidden).toBeUndefined();
		expect(descriptionOf()?.properties[0]).toMatchObject({
			type: 'notice',
			displayName: 'Custom action. It sends requests to 127.0.0.1.',
		});
		const row = await Container.get(NodeContractVersionRepository).findOneByOrFail({
			contractId: 'acme.greeting.get',
		});
		expect(row).toMatchObject({ origin: 'private', createdById: state.owner.id });

		const pinned = await pinnedWorkflow('1.0.0');
		expect(await textOf(pinned)).toBe('Hello Ada');

		expect((await publish('/v2/greet')).semver).toBe('1.0.1');
		expect(await textOf(pinned)).toBe('Hello Ada');
		expect(await textOf(await pinnedWorkflow('1.0.1'))).toBe('Hi Ada');
	});

	describe('the next version of an action', () => {
		const ID = 'acme.greeting.versioned';
		const versioned = (change: (contract: ReturnType<typeof configOf>['contract']) => object) => {
			const config = configOf('/greet');
			return { ...config, contract: { ...config.contract, id: ID, ...change(config.contract) } };
		};
		const publishVersion = async (config: object) =>
			await service().publish(config, fixtures, { userId: state.owner.id });
		const withLang =
			(required: string[]) => (contract: ReturnType<typeof configOf>['contract']) => ({
				input: {
					...contract.input,
					properties: { ...contract.input.properties, lang: { type: 'string' } },
					required,
				},
			});

		it('is a minor for an additive change and a new major for a narrower output', async () => {
			expect((await publishVersion(versioned(() => ({})))).semver).toBe('1.0.0');
			expect((await publishVersion(versioned(withLang(['name'])))).semver).toBe('1.1.0');
			const looser = versioned((contract) => ({
				...withLang(['name'])(contract),
				output: { type: 'object' },
			}));
			expect((await publishVersion(looser)).semver).toBe('2.0.0');
		});

		it('lists what changed in each version', async () => {
			const listed = (await service().list()).filter(({ actionId }) => actionId === ID);

			expect(listed.map(({ semver }) => semver)).toEqual(['2.0.0', '1.1.0', '1.0.0']);
			expect(listed[1]?.changes).toEqual([expect.stringContaining('lang')]);
			expect(listed[0]?.changes.length).toBeGreaterThan(0);
			expect(listed[2]?.changes).toEqual([]);
		});

		it('gives the config of the newest version to edit', async () => {
			const { semver, config } = await service().configOf(ID);

			expect(semver).toBe('2.0.0');
			expect(config).toMatchObject({ version: '2.0.0', contract: { id: ID, version: 2 } });
			await expect(service().configOf('acme.unknown')).rejects.toThrow('has not published');
		});

		it('refuses a change that old input fails', async () => {
			await expect(
				publishVersion(
					versioned((contract) => ({
						...withLang(['name', 'lang'])(contract),
						output: { type: 'object' },
					})),
				),
			).rejects.toThrow('stops the action from running in workflows that use it');
		});
	});

	it('refuses a config that it already published, and an id that n8n ships', async () => {
		await expect(publish('/v2/greet')).rejects.toThrow('already has this config');
		const [shipped] = firstPartyCatalog()
			.entries.map(({ manifest }) => manifest.id)
			.filter((id) => id.startsWith('github.'));
		await expect(publishGithub(shipped ?? 'github.issue.get')).rejects.toThrow(
			`n8n ships ${shipped}, so this instance cannot publish it`,
		);
	});

	it('publishes an action that extends a shipped node with a copy of its settings', async () => {
		const manifest = await publishGithub('github.issue.lock');
		expect(manifest.contract).toMatchObject({
			node: 'github',
			credentials: ['githubApi', 'githubOAuth2Api'],
		});
		expect([...(manifest.contract.input.required ?? [])].sort()).toEqual([
			'issueNumber',
			'owner',
			'repository',
		]);
		const { publishedActions } = await import('@n8n/instance-ai');
		expect(publishedActions().map(({ id }) => id)).toContain('github.issue.lock');
		const description = descriptionOf('githubIssueLock');
		expect(description?.displayName).toBe('GitHub: Lock an issue');
		expect(description?.nodeCreatorItem).toBeUndefined();
		expect(description?.codex?.app).toEqual({
			id: 'github',
			displayName: 'GitHub',
			nodeType: 'n8n-nodes-base.github',
		});
	});

	it('lists the shipped nodes that an action can extend, with their credentials and resources', async () => {
		const parents = service().parents();

		expect(parents.find(({ id }) => id === 'github')).toMatchObject({
			displayName: 'GitHub',
			credentialTypes: ['githubApi', 'githubOAuth2Api'],
			resources: { issue: expect.arrayContaining(['owner', 'repository']) },
		});
		expect(parents.map(({ id }) => id)).not.toContain('minimax');
	});

	it('tests a draft with a credential of the user, and publishes it with the fixture of the run', async () => {
		const credential = await saveCredential(
			{ name: 'GitHub', type: 'githubApi', data: { server: server.url, accessToken: 'abc' } },
			{ user: state.owner, role: 'credential:owner' },
		);
		const config = githubConfigOf('github.issue.lockConversation');
		const params = { owner: 'n8n-io', repository: 'n8n', issueNumber: 7 };

		const result = await service().test(config, params, credential.id, state.owner);

		const answer = {
			method: 'PUT',
			pathname: '/repos/n8n-io/n8n/issues/7/lock',
			auth: 'token abc',
		};
		expect(result).toEqual({
			status: 'success',
			items: [answer],
			fixture: {
				name: 'test',
				params: { ...params, authentication: 'githubApi' },
				credential: { server: server.url },
				routes: [
					{
						method: 'PUT',
						path: '/repos/n8n-io/n8n/issues/7/lock',
						times: 1,
						reply: { json: answer },
					},
				],
				output: [answer],
			},
			outputSchema: {
				type: 'object',
				properties: {
					method: { type: 'string' },
					pathname: { type: 'string' },
					auth: { type: 'string' },
				},
			},
		});
		const fixtures = { executions: [result.fixture] };
		const manifest = await service().publish(config, fixtures, {
			userId: state.owner.id,
		});
		expect(manifest.id).toBe('github.issue.lockConversation');
	});

	it('refuses a test run with a credential that the user cannot read', async () => {
		const credential = await saveCredential(
			{ name: 'GitHub', type: 'githubApi', data: { server: server.url, accessToken: 'abc' } },
			{ user: state.owner, role: 'credential:owner' },
		);
		const member = await createMember();

		await expect(
			service().test(githubConfigOf('github.issue.lockConversation'), {}, credential.id, member),
		).rejects.toThrow('You cannot use this credential');
	});

	describe('a draft with a credential type that it does not extend', () => {
		const draftWith = (type: string) => {
			const config = configOf('/greet');
			return { ...config, contract: { ...config.contract, credentials: [type] } };
		};
		const credentialOf = async (type: string, data: ICredentialDataDecryptedObject) =>
			await saveCredential(
				{ name: type, type, data },
				{ user: state.owner, role: 'credential:owner' },
			);

		it('runs with any n8n type that the credential lets go to the host', async () => {
			const credential = await credentialOf('httpHeaderAuth', { name: 'X-Key', value: 'k' });

			const result = await service().test(
				draftWith('httpHeaderAuth'),
				{ name: 'Ada' },
				credential.id,
				state.owner,
			);

			expect(result).toMatchObject({
				status: 'success',
				items: [{ text: 'Hello Ada', key: 'k' }],
			});
		});

		it("follows the credential's allowed domains", async () => {
			const credential = await credentialOf('httpHeaderAuth', {
				name: 'X-Key',
				value: 'k',
				allowedHttpRequestDomains: 'none',
			});

			const result = await service().test(
				draftWith('httpHeaderAuth'),
				{ name: 'Ada' },
				credential.id,
				state.owner,
			);

			expect(result).toMatchObject({
				status: 'error',
				error: expect.stringContaining('configured to prevent use'),
			});
		});

		it('refuses a host that a type with known hosts does not go to', async () => {
			const credential = await credentialOf('gmailOAuth2', {});

			await expect(
				service().test(draftWith('gmailOAuth2'), { name: 'Ada' }, credential.id, state.owner),
			).rejects.toThrow(/^gmailOAuth2 goes only to .*googleapis\.com, not to 127\.0\.0\.1$/);
			await expect(
				service().publish(draftWith('gmailOAuth2'), fixtures, {
					userId: state.owner.id,
				}),
			).rejects.toThrow('gmailOAuth2 goes only to');
		});
	});

	it('hides an action from the node creator, and its pinned workflows keep running', async () => {
		const pinned = await pinnedWorkflow('1.0.1');
		await service().hide('acme.greeting.get');

		expect(descriptionOf()).toMatchObject({ hidden: true });
		const listed = (await service().list()).filter(
			({ actionId }) => actionId === 'acme.greeting.get',
		);
		expect(listed.map(({ semver, status }) => [semver, status])).toEqual([
			['1.0.1', 'hidden'],
			['1.0.0', 'hidden'],
		]);
		expect(listed[0]?.publishedBy).toEqual({
			name: `${state.owner.firstName} ${state.owner.lastName}`,
			email: state.owner.email,
		});
		expect(await textOf(pinned)).toBe('Hi Ada');
	});
});
