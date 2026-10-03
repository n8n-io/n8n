import type { IExecuteFunctions, IHttpRequestOptions, INodeExecutionData } from 'n8n-workflow';

import { compat, credential } from '../entry/credentials';
import { toContract } from '../define';
import { defineNode, t } from '../index';
import {
	MAX_PAYLOAD_LENGTH,
	MAX_PAYLOADS,
	payloadOf,
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
	origin: 'first-party',
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

	describe('with payload capture', () => {
		const CANARY = 'canary-5d1e9b7f3a2c4086';
		// The request layer signs with the stored token, and the API echoes the header back.
		const canaryContext = () => {
			const { context } = contextOf([]);
			const signed: string[] = [];
			const replies = [
				(authorization: string) => ({ results: [{ id: authorization }], next_cursor: CANARY }),
				() => ({ results: [{ id: 'c' }] }),
			];
			return {
				signed,
				context: {
					...context,
					getCredentials: async () => ({ token: CANARY }),
					helpers: {
						httpRequestWithAuthentication: async (_type: string, options: IHttpRequestOptions) => {
							const authorization = `Bearer ${CANARY}`;
							signed.push(String({ ...options.headers, authorization }.authorization));
							return replies.shift()?.(authorization);
						},
					},
				} as unknown as IExecuteFunctions,
			};
		};

		it('records shapes and no secret in shape mode', async () => {
			setRunProfileListener((meta, profile) => profiles.push([meta, profile]), 'shape');
			const { context, signed } = canaryContext();

			const [outputs = []] = await execute(context);

			expect(signed).toEqual([`Bearer ${CANARY}`, `Bearer ${CANARY}`]);
			expect(outputs.map(({ json }) => json.id)).toEqual([`Bearer ${CANARY}`, 'c']);
			const [[, profile]] = profiles as [[RunProfileMeta, RunProfile]];
			expect(JSON.stringify(profile)).not.toContain(CANARY);
			expect(profile.payloads).toEqual({
				capture: 'shape',
				inputs: ['{"table":string(5),"paging":{"mode":string(5),"max":number}}'],
				outputs: ['{"id":string(30)}', '{"id":string(1)}'],
			});
			expect(
				profile.requests.map(({ requestBody, responseBody }) => [requestBody, responseBody]),
			).toEqual([
				['{}', '{"results":array(1)<{"id":string(30)}>,"next_cursor":string(23)}'],
				['{"start_cursor":string(23)}', '{"results":array(1)<{"id":string(1)}>}'],
			]);
		});

		it('records values without the secret in redacted mode', async () => {
			setRunProfileListener((meta, profile) => profiles.push([meta, profile]), 'redacted');
			const { context } = canaryContext();

			await execute(context);

			const [[, profile]] = profiles as [[RunProfileMeta, RunProfile]];
			expect(JSON.stringify(profile)).not.toContain(CANARY);
			expect(profile.payloads).toEqual({
				capture: 'redacted',
				inputs: ['{"table":"tasks","paging":{"mode":"limit","max":50}}'],
				outputs: [expect.stringContaining('[REDACTED]'), '{"id":"c"}'],
			});
			expect(
				profile.requests.map(({ requestBody, responseBody }) => [requestBody, responseBody]),
			).toEqual([
				[
					'{}',
					expect.stringMatching(
						/^\{"results":\[\{"id":".*\[REDACTED\].*"\}\],"next_cursor":"\[REDACTED\]"\}$/,
					),
				],
				['{"start_cursor":"[REDACTED]"}', '{"results":[{"id":"c"}]}'],
			]);
		});

		it('redacts a token that n8n stores during the run', async () => {
			setRunProfileListener((meta, profile) => profiles.push([meta, profile]), 'redacted');
			const REFRESHED = 'refreshed-8c2e4a6b0d1f3579';
			const stored = new Map([['token', CANARY]]);
			const { context } = canaryContext();
			const replies = [{ results: [{ id: 'a' }], next_cursor: REFRESHED }, { results: [] }];

			await execute({
				...context,
				getCredentials: async () => Object.fromEntries(stored),
				helpers: {
					httpRequestWithAuthentication: async () => {
						stored.set('token', REFRESHED);
						return replies.shift();
					},
				},
			} as unknown as IExecuteFunctions);

			const [[, profile]] = profiles as [[RunProfileMeta, RunProfile]];
			expect(profile.requests[0]?.responseBody).toContain('[REDACTED]');
			expect(JSON.stringify(profile)).not.toContain(REFRESHED);
		});

		it('records no payload without a capture mode', async () => {
			const { context } = canaryContext();

			await execute(context);

			const [[, profile]] = profiles as [[RunProfileMeta, RunProfile]];
			expect(profile.payloads).toBeUndefined();
			expect(
				profile.requests.every(
					(request) => !('requestBody' in request || 'responseBody' in request),
				),
			).toBe(true);
		});

		it('cuts a payload at its limit and keeps the first inputs and outputs only', () => {
			const { recorder, profile } = runRecorder(1, 'redacted');
			const made = vi.fn(() =>
				payloadOf({ text: 'x'.repeat(MAX_PAYLOAD_LENGTH * 2) }, 'redacted', String),
			);
			Array.from({ length: MAX_PAYLOADS + 1 }, () => {
				recorder.input(1, made);
				recorder.output(1, made);
			});

			const { payloads } = profile(
				{ action: 'a', version: '1.0.0', bundleHash: 'b', nodeContract: NODE_CONTRACT_VERSION },
				{ outputItems: 0 },
			);

			expect(payloads?.inputs).toHaveLength(MAX_PAYLOADS);
			expect(payloads?.outputs).toHaveLength(MAX_PAYLOADS);
			expect(payloads?.inputs[0]).toHaveLength(MAX_PAYLOAD_LENGTH + 1);
			expect(payloads?.inputs[0]?.endsWith('…')).toBe(true);
			expect(made).toHaveBeenCalledTimes(MAX_PAYLOADS * 2);
		});

		it('describes each kind of value, and stops at the depth limit on a cycle', () => {
			const cycle: Record<string, unknown> = {};
			cycle.self = cycle;
			const value = {
				s: 'abc',
				n: 1.5,
				b: true,
				none: null,
				list: [],
				bytes: new Uint8Array(3),
				run: () => undefined,
				when: new Date(0),
			};
			const redact = (text: string) => text.replace('abc', '[REDACTED]');

			expect(payloadOf(value, 'shape', redact)).toBe(
				'{"s":string(3),"n":number,"b":boolean,"none":null,"list":array(0),"bytes":bytes(3),"run":function,"when":Date}',
			);
			expect(payloadOf(value, 'redacted', redact)).toBe(
				'{"s":"[REDACTED]","n":1.5,"b":true,"none":null,"list":[],"bytes":bytes(3),"run":function,"when":Date}',
			);
			expect(payloadOf({ abc: 1 }, 'shape', redact)).toBe('{"[REDACTED]":number}');
			expect(payloadOf(cycle, 'shape', redact)).toBe(`${'{"self":'.repeat(64)}…${'}'.repeat(64)}`);
			const loop: unknown[] = [];
			loop.push(loop);
			expect(payloadOf(loop, 'shape', redact)).toBe(`${'array(1)<'.repeat(64)}…${'>'.repeat(64)}`);
			expect(payloadOf(loop, 'redacted', redact)).toBe(`${'['.repeat(64)}…${']'.repeat(64)}`);
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
