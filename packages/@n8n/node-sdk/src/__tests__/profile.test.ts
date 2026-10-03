import type { IExecuteFunctions, IHttpRequestOptions, INodeExecutionData } from 'n8n-workflow';

import { compat, credential } from '../entry/credentials';
import { toContract } from '../define';
import { defineNode, t } from '../index';
import {
	runRecorder,
	setRunProfileListener,
	type RunProfile,
	type RunProfileMeta,
} from '../profile';
import {
	loadExecutor,
	setExecutorLoader,
	toVersionedNodeType,
	type FrozenVersion,
} from '../runtime';
import { NODE_CONTRACT_VERSION, sha256 } from '../version';

const query = defineNode({
	id: 'echo',
	displayName: 'Echo',
	credential: credential({ types: [compat('echoApi')] }),
	baseUrl: 'https://echo.test/v1',
})
	.resource('row')
	.action('query', {
		action: 'Query rows',
		summary: 'Query the rows of a table.',
		flow: { effect: 'read', cardinality: '1:N', idempotent: true },
		input: { table: t.str() },
		output: t.obj({ id: t.str() }),
		list: {
			method: 'POST',
			path: '/tables/{table}/query',
			body: {},
			response: t.obj({
				results: t.arr(t.obj({ id: t.str() })),
				next_cursor: t.str().optional(),
			}),
			items: (page) => page.results,
			pages: { style: 'cursor', next: (page) => page.next_cursor, send: { body: 'start_cursor' } },
		},
	});

// The bundle gives the contract of this file, so `loadExecutor` runs it as a frozen version.
const bundle = 'module.exports = { default: globalThis.profileQuery };';

const frozen: FrozenVersion = {
	manifest: {
		kind: 'action',
		id: query.id,
		semver: '1.0.0',
		nodeContract: NODE_CONTRACT_VERSION,
		contractHash: 'contract-hash',
		bundleHash: sha256(bundle),
		contract: toContract(query),
	},
	readBundle: async () => bundle,
};

const unavailable = Object.assign(new Error('Service Unavailable'), {
	response: { status: 503, headers: { 'retry-after': '0' }, data: {} },
});
const pages = [
	{ results: [{ id: 'a' }, { id: 'b' }], next_cursor: 'c2' },
	{ results: [{ id: 'c' }] },
];

const contextOf = (replies: unknown[]) => {
	const requests: IHttpRequestOptions[] = [];
	const context = {
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: 'Query', credentials: { echoApi: { id: '1', name: 'Echo' } } }),
		getNodeParameter: (name: string) => (name === 'table' ? 'tasks' : undefined),
		getCredentials: async () => ({ token: 'secret-token' }),
		getExecutionId: () => 'execution-1',
		getExecutionCancelSignal: () => undefined,
		continueOnFail: () => false,
		setMetadata: () => {},
		addExecutionHints: () => {},
		logger: { warn: vi.fn() },
		helpers: {
			httpRequestWithAuthentication: async (_type: string, options: IHttpRequestOptions) => {
				requests.push(options);
				const reply = replies.shift();
				if (reply instanceof Error) throw reply;
				return reply;
			},
		},
	} as unknown as IExecuteFunctions;
	return { context, requests };
};

const execute = async (context: IExecuteFunctions) => {
	const NodeType = toVersionedNodeType([frozen]);
	const result = await new NodeType().getNodeType(1).execute?.call(context);
	return Array.isArray(result) ? (result as INodeExecutionData[][]) : [];
};

describe('run profile', () => {
	const profiles: Array<[RunProfileMeta, RunProfile]> = [];

	beforeAll(() => {
		Reflect.set(globalThis, 'profileQuery', query);
	});

	beforeEach(() => {
		profiles.length = 0;
		setExecutorLoader(loadExecutor);
		setRunProfileListener((meta, profile) => profiles.push([meta, profile]));
	});

	afterAll(() => {
		setRunProfileListener(undefined);
		Reflect.deleteProperty(globalThis, 'profileQuery');
	});

	it('records the load, the credential, each page with its retry, and the item sums', async () => {
		const { context, requests } = contextOf([unavailable, ...pages]);

		const [outputs = []] = await execute(context);

		expect(outputs.map(({ json }) => json.id)).toEqual(['a', 'b', 'c']);
		expect(requests).toHaveLength(3);
		const [[meta, profile]] = profiles as [[RunProfileMeta, RunProfile]];
		expect(meta).toEqual({ executionId: 'execution-1', nodeName: 'Query' });
		expect(profile).toMatchObject({
			action: 'echo.row.query',
			version: '1.0.0',
			bundleHash: sha256(bundle),
			nodeContract: NODE_CONTRACT_VERSION,
			path: 'in_process',
			phases: [
				{ name: 'load', cached: false },
				{ name: 'credential', credentialType: 'echoApi', scheme: 'compat' },
			],
			requestCount: 3,
			rpcs: [],
			rpcCount: 0,
			retryCount: 1,
			pageCount: 2,
			inputItems: 1,
			outputItems: 3,
			driftIssues: 0,
		});
		expect(profile.errorType).toBeUndefined();
		const request = {
			itemIndex: 0,
			method: 'POST',
			scheme: 'https',
			host: 'echo.test',
			port: 443,
			template: '/tables/{table}/query',
		};
		expect(profile.requests).toEqual([
			{
				...request,
				page: 1,
				resendCount: 0,
				status: 503,
				errorType: '503',
				requestBytes: 2,
				startMs: expect.any(Number),
				endMs: expect.any(Number),
			},
			{
				...request,
				page: 1,
				resendCount: 1,
				requestBytes: 2,
				startMs: expect.any(Number),
				endMs: expect.any(Number),
			},
			{
				...request,
				page: 2,
				resendCount: 0,
				requestBytes: JSON.stringify({ start_cursor: 'c2' }).length,
				startMs: expect.any(Number),
				endMs: expect.any(Number),
			},
		]);
		const times = [
			profile.startMs,
			...profile.phases.flatMap(({ startMs, endMs }) => [startMs, endMs]),
			...profile.requests.flatMap(({ startMs, endMs }) => [startMs, endMs]),
			profile.endMs,
		];
		expect(times).toEqual([...times].sort((a, b) => a - b));
		expect(profile.inputMs).toBeGreaterThan(0);
		expect(profile.outputValidateMs).toBeGreaterThan(0);

		await execute(contextOf([...pages]).context);
		expect(profiles[1]?.[1].phases[0]).toMatchObject({ name: 'load', cached: true });
	});

	it('records a failed run with its error and keeps the error of the run', async () => {
		const { context } = contextOf([
			Object.assign(new Error('Not Found'), { response: { status: 404, headers: {}, data: {} } }),
		]);

		await expect(execute(context)).rejects.toThrow('Not Found');

		const [[, profile]] = profiles as [[RunProfileMeta, RunProfile]];
		expect(profile).toMatchObject({ errorType: 'Error', requestCount: 1, outputItems: 0 });
		expect(profile.requests[0]).toMatchObject({ status: 404, errorType: '404', resendCount: 0 });
	});

	it('keeps the first 200 attempts and JSON-RPC messages and counts all of them', () => {
		const { recorder, profile } = runRecorder(1);
		const attempt = { startMs: 0, endMs: 1, itemIndex: 0, method: 'GET', scheme: 'https' };
		Array.from({ length: 201 }, (_, index) => {
			recorder.request({ ...attempt, host: 'echo.test', port: 443, resendCount: 0 });
			recorder.rpc({
				id: index + 1,
				method: 'log.log',
				direction: 'guest_to_host',
				startMs: 0,
				endMs: 1,
				requestBytes: 2,
			});
		});
		const identity = {
			action: 'a',
			version: '1.0.0',
			bundleHash: 'b',
			nodeContract: NODE_CONTRACT_VERSION,
		};

		const { requests, requestCount, rpcs, rpcCount } = profile(identity, { outputItems: 0 });

		expect({ requests: requests.length, requestCount, rpcs: rpcs.length, rpcCount }).toEqual({
			requests: 200,
			requestCount: 201,
			rpcs: 200,
			rpcCount: 201,
		});
	});

	it('logs a listener failure and keeps the outputs', async () => {
		setRunProfileListener(() => {
			throw new Error('listener down');
		});
		const { context } = contextOf([...pages]);

		const [outputs = []] = await execute(context);

		expect(outputs).toHaveLength(3);
		expect(context.logger.warn).toHaveBeenCalledWith(
			'The run profile of echo.row.query was not recorded: listener down',
		);
	});
});
