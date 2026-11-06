import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { mockLogger } from '@n8n/backend-test-utils';
import { createHash } from 'node:crypto';
import type {
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
	IRun,
	IRunData,
	ITaskData,
	IWorkflowBase,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { N8N_VERSION } from '@/constants';
import type { CredentialsHelper } from '@/credentials-helper';
import type { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import {
	LangfuseExperimentReporter,
	type ChildSpanParent,
	type OtlpSpan,
	type ReporterRun,
} from '../langfuse-experiment-reporter.ee';

vi.mock('@/workflow-execute-additional-data');

const HOST = 'https://langfuse.example.com';
const AUTHORIZATION = `Basic ${Buffer.from('pk-lf-1:sk-lf-1').toString('base64')}`;
const PROJECT_ID = 'proj-1';
const DATASET_ID = 'ds-1';
const TEST_RUN_ID = 'run-1';
const WORKFLOW_NAME = 'Eval Workflow';

const sha256Hex = (value: string) => createHash('sha256').update(value).digest('hex');

type HttpReply = { statusCode: number; body: unknown };
type HttpCall = { url: string; init: IHttpRequestOptions; body: any };

const jsonResponse = (body: unknown, { status = 200 } = {}): HttpReply => ({
	statusCode: status,
	body,
});

describe('LangfuseExperimentReporter', () => {
	const logger = mockLogger();
	const credentialsHelper = mock<CredentialsHelper>();
	const credentialsPermissionChecker = mock<CredentialsPermissionChecker>();
	const outboundHttp = mock<OutboundHttp>();
	const requestMock = vi.fn<(options: IHttpRequestOptions) => Promise<HttpReply>>();
	let reporter: LangfuseExperimentReporter;

	const workflow = {
		id: 'wf-1',
		name: WORKFLOW_NAME,
		versionId: 'ver-1',
		nodes: [],
		connections: {},
	} as unknown as IWorkflowBase;

	const buildTriggerNode = (parameters: Record<string, unknown> = {}): INode => ({
		id: 'trigger',
		name: 'Evaluation Trigger',
		type: 'n8n-nodes-base.evaluationTrigger',
		typeVersion: 4.7,
		position: [0, 0],
		parameters: { source: 'langfuse', ...parameters },
		credentials: { langfuseApi: { id: 'cred-1', name: 'Langfuse account' } },
	});

	const buildRow = (
		itemId: string,
		extra: Record<string, unknown> = {},
		langfuse: Record<string, unknown> = {},
	): INodeExecutionData => ({
		json: {
			input: { question: `q ${itemId}` },
			question: `q ${itemId}`,
			expectedOutput: { answer: `a ${itemId}` },
			row_number: 0,
			_langfuse: {
				datasetId: DATASET_ID,
				datasetName: 'my-dataset',
				itemId,
				datasetVersion: null,
				fetchedAt: '2026-11-03T10:00:00.000Z',
				expectedOutput: { answer: `a ${itemId}` },
				...langfuse,
			},
			...extra,
		},
	});

	const calls = (): HttpCall[] =>
		requestMock.mock.calls.map(([init]) => ({
			url: init.url,
			init,
			body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
		}));

	const callsTo = (path: string) => calls().filter((call) => call.url === `${HOST}${path}`);

	const attributesOf = (span: OtlpSpan) =>
		Object.fromEntries(span.attributes.map(({ key, value }) => [key, value.stringValue]));

	const startRun = async (parameters: Record<string, unknown> = {}) =>
		await reporter.startRun({
			testRun: { id: TEST_RUN_ID },
			workflow,
			triggerNode: buildTriggerNode(parameters),
			testCases: [buildRow('item-1')],
			userId: 'user-1',
		});

	const startedRun = async (parameters: Record<string, unknown> = {}) => {
		const run = await startRun(parameters);
		assert(run, 'expected a reporter run');
		return run;
	};

	const settle = async (run: ReporterRun) => await Promise.allSettled([...run.pending]);

	beforeEach(() => {
		outboundHttp.requests.mockReturnValue({ request: requestMock } as unknown as HttpRequestClient);
		requestMock.mockImplementation(async ({ url }) => {
			if (url.endsWith('/api/public/projects')) {
				return jsonResponse({ data: [{ id: PROJECT_ID }] });
			}
			if (url.endsWith('/api/public/scores')) {
				return jsonResponse({ message: 'Accepted' }, { status: 202 });
			}
			return jsonResponse({}, { status: 200 });
		});
		credentialsHelper.getDecrypted.mockResolvedValue({
			host: `${HOST}/`,
			publicKey: 'pk-lf-1',
			secretKey: 'sk-lf-1',
		});
		credentialsPermissionChecker.findInaccessible.mockResolvedValue({
			homeProject: {} as never,
			inaccessibleIds: [],
			unusableForActingUser: [],
		});
		vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue({} as never);
		reporter = new LangfuseExperimentReporter(
			logger,
			credentialsHelper,
			credentialsPermissionChecker,
			outboundHttp,
		);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('startRun', () => {
		test('derives the experiment id exactly like langfuse createStableExperimentId', async () => {
			const runName = `${WORKFLOW_NAME} - ${TEST_RUN_ID}`;
			const expected = createHash('sha256')
				.update(JSON.stringify(['langfuse-experiment-v1', PROJECT_ID, DATASET_ID, runName]))
				.digest('hex')
				.slice(0, 16);

			const run = await startedRun();

			expect(expected).toBe('430a5d53b4156d59');
			expect(run.experimentId).toBe(expected);
			expect(run.runName).toBe(runName);
		});

		test('changes the experiment id with the run name', async () => {
			const run = await startedRun({ langfuseReporting: { runName: 'nightly' } });

			expect(run.runName).toBe('nightly');
			expect(run.experimentId).toBe(
				sha256Hex(
					JSON.stringify(['langfuse-experiment-v1', PROJECT_ID, DATASET_ID, 'nightly']),
				).slice(0, 16),
			);
		});

		test('uses the run name verbatim, without trimming, when it has content', async () => {
			const run = await startedRun({ langfuseReporting: { runName: '  nightly  ' } });

			expect(run.runName).toBe('  nightly  ');
			expect(run.experimentId).toBe(
				sha256Hex(
					JSON.stringify(['langfuse-experiment-v1', PROJECT_ID, DATASET_ID, '  nightly  ']),
				).slice(0, 16),
			);
		});

		test('falls back to the default run name when the run name is only whitespace', async () => {
			const run = await startedRun({ langfuseReporting: { runName: '   ' } });

			expect(run.runName).toBe(`${WORKFLOW_NAME} - ${TEST_RUN_ID}`);
		});

		test('returns undefined without calling anything for a non-langfuse source', async () => {
			const run = await startRun({ source: 'dataTable' });

			expect(run).toBeUndefined();
			expect(requestMock).not.toHaveBeenCalled();
			expect(credentialsHelper.getDecrypted).not.toHaveBeenCalled();
		});

		test('returns undefined when reportToLangfuse is false', async () => {
			const run = await startRun({ reportToLangfuse: false });

			expect(run).toBeUndefined();
			expect(requestMock).not.toHaveBeenCalled();
		});

		test('reports by default when reportToLangfuse and langfuseReporting are absent', async () => {
			expect(await startRun()).toBeDefined();
		});

		test('checks access by credential id, then decrypts with the workflow scope', async () => {
			await startRun();

			expect(credentialsPermissionChecker.findInaccessible).toHaveBeenCalledWith(
				'wf-1',
				['cred-1'],
				'user-1',
			);
			expect(WorkflowExecuteAdditionalData.getBase).toHaveBeenCalledWith({
				userId: 'user-1',
				workflowId: 'wf-1',
			});
			expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
				expect.anything(),
				{ id: 'cred-1', name: 'Langfuse account' },
				'langfuseApi',
				'internal',
			);
			expect(
				credentialsPermissionChecker.findInaccessible.mock.invocationCallOrder[0] <
					credentialsHelper.getDecrypted.mock.invocationCallOrder[0],
			).toBe(true);
		});

		test('uses the default SSRF policy, a 10 s timeout and a bounded response for every request', async () => {
			const run = await startedRun();
			reporter.reportCase(run, { testCase: buildRow('item-1'), status: 'success' });
			await settle(run);

			expect(outboundHttp.requests).toHaveBeenCalledWith({ timeout: 10_000 });
			expect(outboundHttp.requests.mock.calls[0][0]).not.toHaveProperty('useDefaultSsrfPolicy');
			expect(requestMock.mock.calls.length).toBeGreaterThan(1);
			for (const [options] of requestMock.mock.calls) {
				expect(options).toMatchObject({
					timeout: 10_000,
					returnFullResponse: true,
					maxResponseBodyBytes: 1024 * 1024,
					disableFollowRedirect: true,
				});
				expect(options.abortSignal).toBeInstanceOf(AbortSignal);
			}
		});

		test.each([
			['not a url'],
			['ftp://langfuse.example.com'],
			['javascript:alert(1)'],
			['file:///etc/passwd'],
		])('rejects the host %s before any request', async (host) => {
			credentialsHelper.getDecrypted.mockResolvedValue({
				host,
				publicKey: 'pk-lf-1',
				secretKey: 'sk-lf-1',
			});

			expect(await startRun()).toBeUndefined();
			expect(requestMock).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalled();
		});

		test('rejects a host that embeds credentials', async () => {
			credentialsHelper.getDecrypted.mockResolvedValue({
				host: 'https://user:pass@langfuse.example.com',
				publicKey: 'pk-lf-1',
				secretKey: 'sk-lf-1',
			});

			expect(await startRun()).toBeUndefined();
			expect(requestMock).not.toHaveBeenCalled();
		});

		test('keeps a base path in the host', async () => {
			credentialsHelper.getDecrypted.mockResolvedValue({
				host: 'https://example.com/langfuse/',
				publicKey: 'pk-lf-1',
				secretKey: 'sk-lf-1',
			});

			await startRun();

			expect(requestMock.mock.calls[0][0].url).toBe(
				'https://example.com/langfuse/api/public/projects',
			);
		});

		test('never logs the secret key or the authorization header', async () => {
			requestMock.mockRejectedValue(new Error('boom'));

			await startRun();

			expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toMatch(/sk-lf-1|Basic /);
		});

		test('trims the trailing slash of the host and looks the project up with basic auth', async () => {
			await startRun();

			const [lookup] = callsTo('/api/public/projects');
			expect(lookup.init.method).toBe('GET');
			expect(lookup.init.headers).toMatchObject({ Authorization: AUTHORIZATION });
		});

		test('falls back to Langfuse Cloud when the credential has no host', async () => {
			credentialsHelper.getDecrypted.mockResolvedValue({
				publicKey: 'pk-lf-1',
				secretKey: 'sk-lf-1',
			});

			await startRun();

			expect(requestMock.mock.calls[0][0].url).toBe(
				'https://cloud.langfuse.com/api/public/projects',
			);
		});

		test('merges parsed run metadata with the n8n ids', async () => {
			const run = await startedRun({
				langfuseReporting: { runMetadata: '{"git_sha":"abc","n8n_test_run_id":"spoofed"}' },
			});

			expect(run.metadata).toEqual({
				git_sha: 'abc',
				n8n_workflow_id: 'wf-1',
				n8n_workflow_version_id: 'ver-1',
				n8n_test_run_id: TEST_RUN_ID,
				n8n_version: N8N_VERSION,
			});
		});

		test('ignores invalid run metadata JSON with a warning', async () => {
			const run = await startedRun({ langfuseReporting: { runMetadata: '{nope' } });

			expect(run.metadata).toEqual({
				n8n_workflow_id: 'wf-1',
				n8n_workflow_version_id: 'ver-1',
				n8n_test_run_id: TEST_RUN_ID,
				n8n_version: N8N_VERSION,
			});
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('run metadata'),
				expect.anything(),
			);
		});

		test.each([['Staging'], ['langfuse-internal'], ['has space'], ['a'.repeat(41)]])(
			'omits the invalid environment %s with a warning',
			async (environment) => {
				const run = await startedRun({ langfuseReporting: { environment } });

				expect(run.environment).toBeUndefined();
				expect(logger.warn).toHaveBeenCalledWith(
					expect.stringContaining('environment'),
					expect.anything(),
				);
			},
		);

		test.each([['staging'], ['n8n-eval_1'], ['a'.repeat(40)]])(
			'keeps the valid environment %s',
			async (environment) => {
				const run = await startedRun({ langfuseReporting: { environment } });

				expect(run.environment).toBe(environment);
			},
		);

		test('returns undefined and warns when the first row carries no dataset id', async () => {
			const run = await reporter.startRun({
				testRun: { id: TEST_RUN_ID },
				workflow,
				triggerNode: buildTriggerNode(),
				testCases: [{ json: { question: 'no langfuse context' } }],
			});

			expect(run).toBeUndefined();
			expect(logger.warn).toHaveBeenCalled();
		});

		test('returns undefined and warns when the project lookup fails', async () => {
			requestMock.mockResolvedValue(jsonResponse('nope', { status: 401 }));

			expect(await startRun()).toBeUndefined();
			expect(logger.warn).toHaveBeenCalled();
		});

		test('returns undefined and warns when decryption fails', async () => {
			credentialsHelper.getDecrypted.mockRejectedValue(new Error('policy denied'));

			expect(await startRun()).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ error: 'policy denied' }),
			);
		});

		test('fails closed when the credential id is not accessible to the workflow or user', async () => {
			credentialsPermissionChecker.findInaccessible.mockResolvedValue({
				homeProject: {} as never,
				inaccessibleIds: ['cred-1'],
				unusableForActingUser: [],
			});

			expect(await startRun()).toBeUndefined();
			expect(credentialsHelper.getDecrypted).not.toHaveBeenCalled();
			expect(WorkflowExecuteAdditionalData.getBase).not.toHaveBeenCalled();
			expect(requestMock).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalled();
		});

		test('fails closed when the access check itself fails', async () => {
			credentialsPermissionChecker.findInaccessible.mockRejectedValue(new Error('db down'));

			expect(await startRun()).toBeUndefined();
			expect(credentialsHelper.getDecrypted).not.toHaveBeenCalled();
		});

		test.each([
			['an allowed-domain list without the host', 'domains', 'other.example.com'],
			['a credential that allows no domain', 'none', undefined],
		])(
			'disables reporting without any request for %s',
			async (_label, allowedHttpRequestDomains, allowedDomains) => {
				credentialsHelper.getDecrypted.mockResolvedValue({
					host: HOST,
					publicKey: 'pk-lf-1',
					secretKey: 'sk-lf-1',
					allowedHttpRequestDomains,
					...(allowedDomains ? { allowedDomains } : {}),
				});

				expect(await startRun()).toBeUndefined();
				expect(requestMock).not.toHaveBeenCalled();
				expect(logger.warn).toHaveBeenCalledTimes(1);
			},
		);

		test('reports when the host matches the allowed domains', async () => {
			credentialsHelper.getDecrypted.mockResolvedValue({
				host: HOST,
				publicKey: 'pk-lf-1',
				secretKey: 'sk-lf-1',
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'langfuse.example.com',
			});

			expect(await startRun()).toBeDefined();
			expect(callsTo('/api/public/projects')).toHaveLength(1);
		});

		test('returns undefined when the trigger has no langfuse credential', async () => {
			const triggerNode = { ...buildTriggerNode(), credentials: undefined };

			const run = await reporter.startRun({
				testRun: { id: TEST_RUN_ID },
				workflow,
				triggerNode,
				testCases: [buildRow('item-1')],
			});

			expect(run).toBeUndefined();
			expect(credentialsHelper.getDecrypted).not.toHaveBeenCalled();
		});
	});

	describe('reportCase', () => {
		const runAt = new Date('2026-11-03T10:00:00.000Z');
		const completedAt = new Date('2026-11-03T10:00:02.500Z');

		const reportSuccess = async (run: ReporterRun, overrides = {}) => {
			reporter.reportCase(run, {
				testCase: buildRow('item-1'),
				status: 'success',
				inputs: { question: 'q item-1' },
				outputs: { answer: 'a item-1' },
				metrics: { correctness: 4, executionTime: 2500 },
				runAt,
				completedAt,
				executionId: 'exec-1',
				testCaseExecutionId: 'tce-1',
				...overrides,
			});
			await settle(run);
		};

		const exportedSpans = () =>
			callsTo('/api/public/otel/v1/traces').flatMap(
				(call) => call.body.resourceSpans[0].scopeSpans[0].spans as OtlpSpan[],
			);

		test('posts one OTLP/JSON trace with the experiment attributes on a parentless root span', async () => {
			const run = await startedRun({
				langfuseReporting: {
					runName: 'nightly',
					runDescription: 'nightly regression',
					runMetadata: '{"git_sha":"abc"}',
					environment: 'staging',
				},
			});

			await reportSuccess(run);

			const [call] = callsTo('/api/public/otel/v1/traces');
			expect(call.init.method).toBe('POST');
			expect(call.init.headers).toEqual({
				Authorization: AUTHORIZATION,
				'Content-Type': 'application/json',
				'x-langfuse-ingestion-version': '4',
				'x-langfuse-sdk-name': 'n8n',
				'x-langfuse-sdk-version': N8N_VERSION,
			});
			expect(call.init.timeout).toBe(10_000);

			const [resourceSpans] = call.body.resourceSpans;
			expect(resourceSpans.resource.attributes).toEqual([
				{ key: 'service.name', value: { stringValue: 'n8n' } },
				{ key: 'service.version', value: { stringValue: N8N_VERSION } },
			]);
			expect(resourceSpans.scopeSpans).toHaveLength(1);
			expect(resourceSpans.scopeSpans[0].scope).toEqual({ name: 'n8n-evaluation' });
			expect(resourceSpans.scopeSpans[0].spans).toHaveLength(1);

			const [span] = exportedSpans();
			expect(span.traceId).toMatch(/^[0-9a-f]{32}$/);
			expect(span.spanId).toMatch(/^[0-9a-f]{16}$/);
			expect(span).not.toHaveProperty('parentSpanId');
			expect(span.name).toBe('n8n-evaluation-item');
			expect(span.kind).toBe(1);
			expect(span.startTimeUnixNano).toBe('1793700000000000000');
			expect(span.endTimeUnixNano).toBe('1793700002500000000');
			expect(span.status).toEqual({ code: 1 });

			const attributes = attributesOf(span);
			expect(attributes).toEqual({
				'langfuse.experiment.id': run.experimentId,
				'langfuse.experiment.name': 'nightly',
				'langfuse.experiment.dataset.id': DATASET_ID,
				'langfuse.experiment.item.id': 'item-1',
				'langfuse.experiment.item.root_observation_id': span.spanId,
				'langfuse.experiment.item.version': '2026-11-03T10:00:00.000Z',
				'langfuse.experiment.item.expected_output': '{"answer":"a item-1"}',
				'langfuse.experiment.metadata': JSON.stringify({
					git_sha: 'abc',
					n8n_workflow_id: 'wf-1',
					n8n_workflow_version_id: 'ver-1',
					n8n_test_run_id: TEST_RUN_ID,
					n8n_version: N8N_VERSION,
				}),
				'langfuse.experiment.description': 'nightly regression',
				'langfuse.observation.input': '{"question":"q item-1"}',
				'langfuse.observation.output': '{"answer":"a item-1"}',
				'langfuse.trace.name': WORKFLOW_NAME,
				'langfuse.observation.metadata': JSON.stringify({
					n8n_execution_id: 'exec-1',
					n8n_test_case_execution_id: 'tce-1',
					status: 'success',
				}),
				'langfuse.environment': 'staging',
			});
		});

		test('uses the pinned dataset version over the fetch time when present', async () => {
			const run = await startedRun();

			await reportSuccess(run, {
				testCase: buildRow('item-1', {}, { datasetVersion: '2026-01-21T14:35:42Z' }),
			});

			expect(attributesOf(exportedSpans()[0])['langfuse.experiment.item.version']).toBe(
				'2026-01-21T14:35:42Z',
			);
		});

		test('omits optional attributes when they have no value', async () => {
			const run = await startedRun();

			await reportSuccess(run, {
				testCase: buildRow('item-1', {}, { expectedOutput: undefined, fetchedAt: null }),
			});

			const attributes = attributesOf(exportedSpans()[0]);
			expect(attributes).not.toHaveProperty('langfuse.experiment.item.expected_output');
			expect(attributes).not.toHaveProperty('langfuse.experiment.item.version');
			expect(attributes).not.toHaveProperty('langfuse.experiment.description');
			expect(attributes).not.toHaveProperty('langfuse.environment');
			expect(attributes).not.toHaveProperty('langfuse.observation.level');
		});

		test('marks an errored case with level, status message and error status', async () => {
			const run = await startedRun();

			await reportSuccess(run, {
				status: 'error',
				errorCode: 'NO_METRICS_COLLECTED',
				metrics: {},
			});

			const [span] = exportedSpans();
			expect(span.status).toEqual({ code: 2, message: 'NO_METRICS_COLLECTED' });
			const attributes = attributesOf(span);
			expect(attributes['langfuse.observation.level']).toBe('ERROR');
			expect(attributes['langfuse.observation.status_message']).toBe('NO_METRICS_COLLECTED');
			expect(JSON.parse(attributes['langfuse.observation.metadata'])).toEqual({
				n8n_execution_id: 'exec-1',
				n8n_test_case_execution_id: 'tce-1',
				status: 'error',
				error_code: 'NO_METRICS_COLLECTED',
			});
			expect(callsTo('/api/public/scores')).toHaveLength(0);
		});

		test('strips _langfuse from the serialised input', async () => {
			const run = await startedRun();

			await reportSuccess(run, {
				inputs: { question: 'q', _langfuse: { itemId: 'item-1', datasetId: DATASET_ID } },
			});

			const attributes = attributesOf(exportedSpans()[0]);
			expect(attributes['langfuse.observation.input']).toBe('{"question":"q"}');
			expect(JSON.stringify(exportedSpans())).not.toContain('datasetName');
		});

		test('strips _langfuse from the serialised output', async () => {
			const run = await startedRun();

			await reportSuccess(run, {
				outputs: { answer: 'a', _langfuse: { itemId: 'item-1', datasetId: DATASET_ID } },
			});

			const output = attributesOf(exportedSpans()[0])['langfuse.observation.output'];
			expect(JSON.parse(output)).toEqual({ answer: 'a' });
			expect(output).not.toContain('_langfuse');
		});

		test('falls back to the dataset row, without _langfuse, when there are no inputs', async () => {
			const run = await startedRun();

			await reportSuccess(run, { inputs: {} });

			const input = JSON.parse(attributesOf(exportedSpans()[0])['langfuse.observation.input']);
			expect(input).toEqual({
				input: { question: 'q item-1' },
				question: 'q item-1',
				expectedOutput: { answer: 'a item-1' },
				row_number: 0,
			});
		});

		test('truncates attribute values above 100 kB with a marker', async () => {
			const run = await startedRun();

			await reportSuccess(run, { outputs: { answer: 'x'.repeat(150 * 1024) } });

			const output = attributesOf(exportedSpans()[0])['langfuse.observation.output'];
			expect(Buffer.byteLength(output)).toBeLessThanOrEqual(100 * 1024);
			expect(output.endsWith('[truncated by n8n]')).toBe(true);
			expect(output.startsWith('{"answer":"xxx')).toBe(true);
		});

		test.each([
			['2-byte characters', 'é'],
			['3-byte characters', '€'],
			['surrogate pairs', '😀'],
		])('truncates %s by bytes without splitting a character', async (_label, char) => {
			const run = await startedRun();

			await reportSuccess(run, { outputs: { answer: char.repeat(200_000) } });

			const output = attributesOf(exportedSpans()[0])['langfuse.observation.output'];
			const marker = '... [truncated by n8n]';
			const kept = output.slice(0, -marker.length);
			expect(output.endsWith(marker)).toBe(true);
			expect(Buffer.byteLength(output)).toBeLessThanOrEqual(100 * 1024);
			expect(Buffer.byteLength(kept)).toBeGreaterThan(100 * 1024 - Buffer.byteLength(marker) - 4);
			expect(output).not.toContain('\uFFFD');
			expect(output).not.toMatch(
				/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/,
			);
		});

		test('does not truncate below the byte limit even for multibyte text', async () => {
			const run = await startedRun();

			await reportSuccess(run, { outputs: { answer: 'é'.repeat(40_000) } });

			const output = attributesOf(exportedSpans()[0])['langfuse.observation.output'];
			expect(output.endsWith('[truncated by n8n]')).toBe(false);
		});

		test('never truncates the metadata attributes, keeping them valid JSON', async () => {
			const run = await startedRun({
				langfuseReporting: { runMetadata: JSON.stringify({ note: 'y'.repeat(7 * 1024) }) },
			});

			await reportSuccess(run);

			const attributes = attributesOf(exportedSpans()[0]);
			const metadata = JSON.parse(attributes['langfuse.experiment.metadata']);
			expect(metadata.note).toHaveLength(7 * 1024);
			expect(metadata.n8n_test_run_id).toBe(TEST_RUN_ID);
			expect(() => JSON.parse(attributes['langfuse.observation.metadata'])).not.toThrow();
		});

		test('keeps run metadata whose JSON is within 8 KiB', async () => {
			const run = await startedRun({
				langfuseReporting: { runMetadata: JSON.stringify({ note: 'y'.repeat(7 * 1024) }) },
			});

			expect(run.metadata.note).toHaveLength(7 * 1024);
			expect(logger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('run metadata'),
				expect.anything(),
			);
		});

		test('keeps only the n8n metadata keys, with a warning, when run metadata exceeds 8 KiB', async () => {
			const run = await startedRun({
				langfuseReporting: { runMetadata: JSON.stringify({ note: 'y'.repeat(9 * 1024) }) },
			});

			expect(run.metadata).toEqual({
				n8n_workflow_id: 'wf-1',
				n8n_workflow_version_id: 'ver-1',
				n8n_test_run_id: TEST_RUN_ID,
				n8n_version: N8N_VERSION,
			});
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('run metadata'),
				expect.anything(),
			);

			await reportSuccess(run);
			expect(JSON.parse(attributesOf(exportedSpans()[0])['langfuse.experiment.metadata'])).toEqual(
				run.metadata,
			);
		});

		test('falls back to the current time when timings are missing and never ends before it starts', async () => {
			const run = await startedRun();
			const before = BigInt(Date.now()) * BigInt(1_000_000);

			await reportSuccess(run, { runAt: undefined, completedAt: undefined });
			const [span] = exportedSpans();

			expect(BigInt(span.startTimeUnixNano) >= before).toBe(true);
			expect(BigInt(span.endTimeUnixNano) >= BigInt(span.startTimeUnixNano)).toBe(true);

			requestMock.mockClear();
			await reportSuccess(run, { runAt: completedAt, completedAt: runAt });
			const [reversed] = exportedSpans();
			expect(reversed.endTimeUnixNano).toBe(reversed.startTimeUnixNano);
		});

		test('uses a fresh trace and span id per case', async () => {
			const run = await startedRun();

			await reportSuccess(run);
			await reportSuccess(run, { testCase: buildRow('item-2') });

			const [first, second] = exportedSpans();
			expect(first.traceId).not.toBe(second.traceId);
			expect(first.spanId).not.toBe(second.spanId);
		});

		test('skips and warns when the row has no dataset item id', async () => {
			const run = await startedRun();

			await reportSuccess(run, {
				testCase: { json: { question: 'plain row' } },
			});
			await reportSuccess(run, { testCase: buildRow('', {}, { itemId: undefined }) });

			expect(callsTo('/api/public/otel/v1/traces')).toHaveLength(0);
			expect(callsTo('/api/public/scores')).toHaveLength(0);
			expect(logger.warn).toHaveBeenCalledTimes(2);
		});

		test('posts one stable-id numeric score per metric on the root observation', async () => {
			const run = await startedRun({ langfuseReporting: { environment: 'staging' } });

			await reportSuccess(run);
			const [span] = exportedSpans();

			const [scoresCall] = callsTo('/api/public/scores');
			expect(scoresCall.init.headers).toMatchObject({ Authorization: AUTHORIZATION });
			expect(scoresCall.body).toEqual([
				{
					id: sha256Hex(`${run.experimentId}${TEST_RUN_ID}item-1correctness`).slice(0, 32),
					traceId: span.traceId,
					observationId: span.spanId,
					name: 'correctness',
					value: 4,
					dataType: 'NUMERIC',
					environment: 'staging',
					timestamp: '2026-11-03T10:00:02.500Z',
					metadata: { n8n_test_run_id: TEST_RUN_ID },
				},
				{
					id: sha256Hex(`${run.experimentId}${TEST_RUN_ID}item-1executionTime`).slice(0, 32),
					traceId: span.traceId,
					observationId: span.spanId,
					name: 'executionTime',
					value: 2500,
					dataType: 'NUMERIC',
					environment: 'staging',
					timestamp: '2026-11-03T10:00:02.500Z',
					metadata: { n8n_test_run_id: TEST_RUN_ID },
				},
			]);

			requestMock.mockClear();
			await reportSuccess(run);
			expect(
				callsTo('/api/public/scores')[0].body.map((score: { id: string }) => score.id),
			).toEqual(scoresCall.body.map((score: { id: string }) => score.id));
		});

		test('gives item scores of two test runs sharing a run name different ids', async () => {
			const first = await startedRun({ langfuseReporting: { runName: 'static' } });
			const second = await reporter.startRun({
				testRun: { id: 'run-2' },
				workflow,
				triggerNode: buildTriggerNode({ langfuseReporting: { runName: 'static' } }),
				testCases: [buildRow('item-1')],
				userId: 'user-1',
			});
			assert(second);
			expect(second.experimentId).toBe(first.experimentId);

			await reportSuccess(first);
			await reportSuccess(second);

			const [firstIds, secondIds] = callsTo('/api/public/scores').map((call) =>
				call.body.map((score: { id: string }) => score.id),
			);
			expect(firstIds).toHaveLength(2);
			for (const id of firstIds) expect(secondIds).not.toContain(id);
		});

		test('sends at most 4 case reports at a time', async () => {
			const run = await startedRun();
			const releases: Array<() => void> = [];
			requestMock.mockImplementation(async ({ url }) => {
				if (url.endsWith('/otel/v1/traces')) {
					await new Promise<void>((resolve) => releases.push(resolve));
				}
				return jsonResponse({}, { status: 202 });
			});

			for (let i = 0; i < 10; i++) {
				reporter.reportCase(run, { testCase: buildRow(`item-${i}`), status: 'success' });
			}
			await vi.waitFor(() => expect(releases).toHaveLength(4));
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(callsTo('/api/public/otel/v1/traces')).toHaveLength(4);

			while (run.pending.size > 0) {
				releases.splice(0).forEach((release) => release());
				await new Promise((resolve) => setTimeout(resolve, 5));
			}
			expect(callsTo('/api/public/otel/v1/traces')).toHaveLength(10);
		});

		test('drops case reports beyond 1000 queued ones and warns once', async () => {
			const run = await startedRun();
			const releases: Array<() => void> = [];
			requestMock.mockImplementation(async ({ url }) => {
				if (url.endsWith('/otel/v1/traces')) {
					await new Promise<void>((resolve) => releases.push(resolve));
				}
				return jsonResponse({}, { status: 202 });
			});

			for (let i = 0; i < 1005; i++) {
				reporter.reportCase(run, { testCase: buildRow(`item-${i}`), status: 'success' });
			}

			expect(run.pending.size).toBe(1000);
			expect(run.droppedCases).toBe(5);
			expect(
				vi
					.mocked(logger.warn)
					.mock.calls.filter(([message]) => String(message).includes('backlog')),
			).toHaveLength(1);

			while (run.pending.size > 0) {
				releases.splice(0).forEach((release) => release());
				await new Promise((resolve) => setTimeout(resolve, 1));
			}
			expect(callsTo('/api/public/otel/v1/traces')).toHaveLength(1000);
		});

		test('exports the trace before posting its scores and skips scores without metrics', async () => {
			const run = await startedRun();

			await reportSuccess(run);
			expect(calls().map((call) => call.url)).toEqual([
				`${HOST}/api/public/projects`,
				`${HOST}/api/public/otel/v1/traces`,
				`${HOST}/api/public/scores`,
			]);

			requestMock.mockClear();
			await reportSuccess(run, { metrics: {} });
			expect(callsTo('/api/public/scores')).toHaveLength(0);
		});

		test('drops non-finite metric values', async () => {
			const run = await startedRun();

			await reportSuccess(run, { metrics: { ok: 1, bad: Number.NaN, worse: Infinity } });

			expect(callsTo('/api/public/scores')[0].body.map((s: { name: string }) => s.name)).toEqual([
				'ok',
			]);
		});

		test('does not post scores when Langfuse rejects the trace', async () => {
			const run = await startedRun();
			requestMock.mockImplementation(async ({ url }) =>
				url.endsWith('/otel/v1/traces')
					? jsonResponse('bad', { status: 400 })
					: jsonResponse({ message: 'Accepted' }, { status: 202 }),
			);

			await reportSuccess(run);

			expect(callsTo('/api/public/scores')).toHaveLength(0);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('trace'),
				expect.objectContaining({ status: 400 }),
			);
		});

		test('logs the rejected scores of a 207 once and does not retry', async () => {
			const run = await startedRun();
			requestMock.mockImplementation(async ({ url }) =>
				url.endsWith('/scores')
					? jsonResponse(
							{ accepted: 1, rejected: 1, errors: [{ message: 'value out of range' }] },
							{ status: 207 },
						)
					: jsonResponse({}),
			);

			await reportSuccess(run);

			expect(callsTo('/api/public/scores')).toHaveLength(1);
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('scores'),
				expect.objectContaining({ rejected: 1, errors: ['value out of range'] }),
			);
		});

		test('does not warn for a fully accepted 207', async () => {
			const run = await startedRun();
			requestMock.mockImplementation(async ({ url }) =>
				url.endsWith('/scores')
					? jsonResponse({ accepted: 2, rejected: 0, errors: [] }, { status: 207 })
					: jsonResponse({}),
			);

			await reportSuccess(run);

			expect(logger.warn).not.toHaveBeenCalled();
		});

		test('warns without throwing when the network fails', async () => {
			const run = await startedRun();
			requestMock.mockRejectedValue(new Error('ECONNREFUSED'));

			expect(() =>
				reporter.reportCase(run, {
					testCase: buildRow('item-1'),
					status: 'success',
					metrics: { correctness: 4 },
				}),
			).not.toThrow();
			await settle(run);

			expect(logger.warn).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ error: 'ECONNREFUSED' }),
			);
			await expect(
				reporter.finishRun(run, {
					status: 'success',
					aggregatedMetrics: {},
					totalCases: 1,
					successCases: 1,
				}),
			).resolves.toBeUndefined();
		});

		test('does not throw when a payload cannot be built', async () => {
			const run = await startedRun();
			const circular: Record<string, unknown> = {};
			circular.self = circular;

			expect(() =>
				reporter.reportCase(run, {
					testCase: buildRow('item-1'),
					status: 'success',
					outputs: circular as never,
				}),
			).not.toThrow();
			expect(logger.warn).toHaveBeenCalled();
		});

		test('tracks the in-flight promise without blocking the caller', async () => {
			const run = await startedRun();
			let release: (response: HttpReply) => void = () => {};
			requestMock.mockImplementation(
				async () => await new Promise<HttpReply>((resolve) => (release = resolve)),
			);

			reporter.reportCase(run, { testCase: buildRow('item-1'), status: 'success' });

			expect(run.pending.size).toBe(1);
			await vi.waitFor(() => expect(requestMock).toHaveBeenCalled());
			release(jsonResponse({}));
			await settle(run);
			await Promise.resolve();
			expect(run.pending.size).toBe(0);
		});

		test('appends the spans returned by the child span seam to the same trace', async () => {
			class WithChildSpans extends LangfuseExperimentReporter {
				protected override buildChildSpans(
					_run: ReporterRun,
					_data: unknown,
					parent: ChildSpanParent,
				): OtlpSpan[] {
					return [
						{
							traceId: parent.traceId,
							spanId: 'aaaaaaaaaaaaaaaa',
							parentSpanId: parent.spanId,
							name: 'child',
							kind: 1,
							startTimeUnixNano: parent.startTimeUnixNano,
							endTimeUnixNano: parent.endTimeUnixNano,
							attributes: parent.sharedAttributes,
							status: { code: 1 },
						},
					];
				}
			}
			reporter = new WithChildSpans(
				logger,
				credentialsHelper,
				credentialsPermissionChecker,
				outboundHttp,
			);
			const run = await startedRun();

			await reportSuccess(run);

			const [root, child] = exportedSpans();
			expect(exportedSpans()).toHaveLength(2);
			expect(child.parentSpanId).toBe(root.spanId);
			expect(child.traceId).toBe(root.traceId);
			expect(attributesOf(child)['langfuse.experiment.item.root_observation_id']).toBe(root.spanId);
			expect(attributesOf(child)['langfuse.experiment.item.id']).toBe('item-1');
		});

		test('exposes no child spans by default', async () => {
			const run = await startedRun();

			await reportSuccess(run);

			expect(exportedSpans()).toHaveLength(1);
		});

		describe('node spans', () => {
			const START = Date.parse('2026-11-03T10:00:00.000Z');

			const nodes: INode[] = [
				{
					id: 'trigger',
					name: 'Evaluation Trigger',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 4.7,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'agent',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'llm',
					name: 'OpenAI Chat Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
					position: [0, 0],
					parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o' } },
				},
				{
					id: 'llm2',
					name: 'Dynamic Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
					position: [0, 0],
					parameters: { model: '={{ $json.model }}' },
				},
			];

			const task = (offsetMs: number, executionTime: number, extra: Partial<ITaskData> = {}) =>
				({
					startTime: START + offsetMs,
					executionTime,
					executionIndex: offsetMs,
					source: [],
					executionStatus: 'success',
					data: { main: [[{ json: { ok: true } }]] },
					...extra,
				}) as ITaskData;

			const modelTask = (offsetMs: number, tokenUsage?: Record<string, number>) =>
				task(offsetMs, 300, {
					data: {
						ai_languageModel: [
							[{ json: { response: { text: 'hi' }, ...(tokenUsage && { tokenUsage }) } }],
						],
					},
				});

			const withOutputs = { langfuseReporting: { includeNodeOutputs: true } };

			const execution = (runData: IRunData) =>
				({ data: { resultData: { runData } } }) as unknown as IRun;

			const reportWith = async (runData: IRunData, parameters: Record<string, unknown> = {}) => {
				const run = await reporter.startRun({
					testRun: { id: TEST_RUN_ID },
					workflow: { ...workflow, nodes },
					triggerNode: buildTriggerNode(parameters),
					testCases: [buildRow('item-1')],
					userId: 'user-1',
				});
				assert(run, 'expected a reporter run');
				await reportSuccess(run, { executionData: execution(runData) });
				const [root, ...children] = exportedSpans();
				return { run, root, children };
			};

			test('adds one child span per node run, parented to the root in the same trace', async () => {
				const { root, children } = await reportWith(
					{
						'AI Agent': [task(500, 800), task(1500, 100)],
						'Evaluation Trigger': [
							task(0, 5, {
								data: { main: [[{ json: { question: 'q', _langfuse: { itemId: 'item-1' } } }]] },
							}),
						],
					},
					withOutputs,
				);

				expect(children.map((span) => span.name)).toEqual([
					'Evaluation Trigger',
					'AI Agent',
					'AI Agent',
				]);
				for (const span of children) {
					expect(span.traceId).toBe(root.traceId);
					expect(span.parentSpanId).toBe(root.spanId);
					expect(span.spanId).toMatch(/^[0-9a-f]{16}$/);
					expect(span.kind).toBe(1);
					expect(span.status).toEqual({ code: 1 });
				}
				expect(new Set(children.map((span) => span.spanId)).size).toBe(3);

				const [trigger, firstAgent, secondAgent] = children;
				expect(trigger.startTimeUnixNano).toBe(String(BigInt(START) * 1_000_000n));
				expect(trigger.endTimeUnixNano).toBe(String(BigInt(START + 5) * 1_000_000n));
				expect(firstAgent.endTimeUnixNano).toBe(String(BigInt(START + 1300) * 1_000_000n));

				expect(JSON.parse(attributesOf(firstAgent)['langfuse.observation.metadata'])).toEqual({
					node_type: '@n8n/n8n-nodes-langchain.agent',
					node_type_version: 2,
					run_index: 0,
				});
				expect(
					JSON.parse(attributesOf(secondAgent)['langfuse.observation.metadata']).run_index,
				).toBe(1);
				expect(JSON.parse(attributesOf(firstAgent)['langfuse.observation.output'])).toEqual({
					ok: true,
				});
			});

			test('serialises no inputs and strips the reserved _langfuse key from node outputs', async () => {
				const { children } = await reportWith(
					{
						'Evaluation Trigger': [
							task(0, 5, {
								inputOverride: { main: [[{ json: { secret: 'input' } }]] },
								data: { main: [[{ json: { question: 'q', _langfuse: { itemId: 'item-1' } } }]] },
							}),
						],
					},
					withOutputs,
				);

				const attributes = attributesOf(children[0]);
				expect(attributes).not.toHaveProperty('langfuse.observation.input');
				expect(JSON.parse(attributes['langfuse.observation.output'])).toEqual({ question: 'q' });
				expect(JSON.stringify(children)).not.toContain('"secret"');
			});

			test('truncates a child output above the attribute limit on a utf-8 boundary', async () => {
				const { children } = await reportWith(
					{
						'AI Agent': [
							task(0, 5, { data: { main: [[{ json: { text: 'é'.repeat(80 * 1024) } }]] } }),
						],
					},
					withOutputs,
				);

				const output = attributesOf(children[0])['langfuse.observation.output'];
				expect(output.endsWith('... [truncated by n8n]')).toBe(true);
				expect(Buffer.byteLength(output)).toBeLessThanOrEqual(100 * 1024 + 32);
				expect(output).not.toContain('�');
			});

			test('maps a node run with token usage to a generation with model and usage details', async () => {
				const { children } = await reportWith(
					{
						'AI Agent': [task(0, 900)],
						'OpenAI Chat Model': [
							modelTask(100, { promptTokens: 12, completionTokens: 5, totalTokens: 17 }),
							modelTask(500),
						],
					},
					withOutputs,
				);

				const [agent, generation, plain] = children;
				expect(attributesOf(agent)).not.toHaveProperty('langfuse.observation.type');
				expect(attributesOf(generation)).toMatchObject({
					'langfuse.observation.type': 'generation',
					'langfuse.observation.model.name': 'gpt-4o',
				});
				expect(JSON.parse(attributesOf(generation)['langfuse.observation.usage_details'])).toEqual({
					input: 12,
					output: 5,
					total: 17,
				});
				expect(JSON.parse(attributesOf(generation)['langfuse.observation.output'])).toMatchObject({
					response: { text: 'hi' },
				});
				expect(attributesOf(plain)).not.toHaveProperty('langfuse.observation.type');
				expect(attributesOf(plain)).not.toHaveProperty('langfuse.observation.usage_details');
			});

			test('reads the token usage estimate and omits a model name that is an expression or unknown', async () => {
				const { children } = await reportWith({
					'Dynamic Model': [
						task(0, 10, {
							data: {
								ai_languageModel: [
									[
										{
											json: {
												tokenUsageEstimate: {
													promptTokens: 1,
													completionTokens: 2,
													totalTokens: 3,
												},
											},
										},
									],
								],
							},
						}),
					],
					'Not In Workflow': [
						modelTask(20, { promptTokens: 4, completionTokens: 5, totalTokens: 9 }),
					],
				});

				for (const span of children) {
					const attributes = attributesOf(span);
					expect(attributes['langfuse.observation.type']).toBe('generation');
					expect(attributes).not.toHaveProperty('langfuse.observation.model.name');
				}
				expect(JSON.parse(attributesOf(children[0])['langfuse.observation.usage_details'])).toEqual(
					{
						input: 1,
						output: 2,
						total: 3,
					},
				);
				expect(JSON.parse(attributesOf(children[1])['langfuse.observation.metadata'])).toEqual({
					run_index: 0,
				});
			});

			test('marks an errored node run with ERROR status and level', async () => {
				const { children } = await reportWith({
					'AI Agent': [
						task(0, 50, {
							executionStatus: 'error',
							error: { message: 'model exploded' } as never,
							data: undefined,
						}),
						task(100, 50),
					],
				});

				const [errored, healthy] = children;
				expect(errored.status).toEqual({ code: 2, message: 'Node execution failed' });
				expect(attributesOf(errored)).toMatchObject({
					'langfuse.observation.level': 'ERROR',
				});
				expect(attributesOf(errored)).not.toHaveProperty('langfuse.observation.status_message');
				expect(attributesOf(errored)).not.toHaveProperty('langfuse.observation.output');
				expect(healthy.status).toEqual({ code: 1 });
				expect(attributesOf(healthy)).not.toHaveProperty('langfuse.observation.level');
			});

			test('repeats the experiment attributes on every child span', async () => {
				const { run, root, children } = await reportWith(
					{
						'AI Agent': [task(0, 10)],
						'OpenAI Chat Model': [
							modelTask(5, { promptTokens: 1, completionTokens: 1, totalTokens: 2 }),
						],
					},
					{
						langfuseReporting: {
							runName: 'nightly',
							runMetadata: '{"git_sha":"abc"}',
							environment: 'staging',
						},
					},
				);

				expect(children).toHaveLength(2);
				expect(JSON.parse(attributesOf(root)['langfuse.experiment.metadata'])).toMatchObject({
					git_sha: 'abc',
					n8n_test_run_id: TEST_RUN_ID,
				});
				for (const span of children) {
					const attributes = attributesOf(span);
					expect(attributes).toMatchObject({
						'langfuse.experiment.id': run.experimentId,
						'langfuse.experiment.name': 'nightly',
						'langfuse.experiment.dataset.id': DATASET_ID,
						'langfuse.experiment.item.id': 'item-1',
						'langfuse.experiment.item.root_observation_id': root.spanId,
						'langfuse.environment': 'staging',
					});
					expect(attributes['langfuse.experiment.metadata']).toBe(
						attributesOf(root)['langfuse.experiment.metadata'],
					);
					expect(attributes).not.toHaveProperty('langfuse.experiment.description');
				}
			});

			test('caps child spans at 200 per case, keeps the earliest node runs and warns once per run', async () => {
				const manyRuns = (): IRunData => ({
					'AI Agent': Array.from({ length: 205 }, (_, index) => task(index, 1)),
				});
				const { run, children } = await reportWith(manyRuns());

				expect(children).toHaveLength(200);
				const runIndexes = children.map(
					(span) => JSON.parse(attributesOf(span)['langfuse.observation.metadata']).run_index,
				);
				expect(Math.max(...runIndexes)).toBe(199);

				await reportSuccess(run, { executionData: execution(manyRuns()) });

				expect(
					vi
						.mocked(logger.warn)
						.mock.calls.filter(([message]) => String(message).includes('capped')),
				).toHaveLength(1);
			});

			test('adds no child spans when includeNodeSpans is false', async () => {
				const { children } = await reportWith(
					{ 'AI Agent': [task(0, 10)] },
					{ langfuseReporting: { includeNodeSpans: false } },
				);

				expect(children).toHaveLength(0);
			});

			test('omits node outputs by default but keeps name, timings, metadata, model and usage', async () => {
				const { children } = await reportWith({
					'AI Agent': [task(0, 40)],
					'OpenAI Chat Model': [
						modelTask(100, { promptTokens: 12, completionTokens: 5, totalTokens: 17 }),
					],
				});

				expect(children.map((span) => span.name)).toEqual(['AI Agent', 'OpenAI Chat Model']);
				for (const span of children) {
					expect(attributesOf(span)).not.toHaveProperty('langfuse.observation.output');
					expect(attributesOf(span)).toHaveProperty('langfuse.observation.metadata');
				}
				expect(children[0].endTimeUnixNano).toBe(String(BigInt(START + 40) * 1_000_000n));
				expect(attributesOf(children[1])).toMatchObject({
					'langfuse.observation.type': 'generation',
					'langfuse.observation.model.name': 'gpt-4o',
				});
				expect(JSON.stringify(children)).not.toContain('"ok":true');
				expect(JSON.stringify(children)).not.toContain('"text":"hi"');
			});

			test.each([[undefined], [false], ['true'], [1]])(
				'omits node outputs when includeNodeOutputs is %s',
				async (includeNodeOutputs) => {
					const { run, children } = await reportWith(
						{ 'AI Agent': [task(0, 10)] },
						{ langfuseReporting: { includeNodeOutputs } },
					);

					expect(run.includeNodeOutputs).toBe(false);
					expect(attributesOf(children[0])).not.toHaveProperty('langfuse.observation.output');
				},
			);

			test('includes the first output item of each node when includeNodeOutputs is true', async () => {
				const { run, children } = await reportWith({ 'AI Agent': [task(0, 10)] }, withOutputs);

				expect(run.includeNodeOutputs).toBe(true);
				expect(JSON.parse(attributesOf(children[0])['langfuse.observation.output'])).toEqual({
					ok: true,
				});
			});

			describe('trace size budget', () => {
				const MIB = 1024 * 1024;
				const bigText = 'y'.repeat(90 * 1024);
				const usage = { promptTokens: 3, completionTokens: 4, totalTokens: 7 };

				const bigGenerations = (count: number): IRunData => ({
					'OpenAI Chat Model': Array.from({ length: count }, (_, index) =>
						task(index, 7, {
							data: {
								ai_languageModel: [[{ json: { response: { text: bigText }, tokenUsage: usage } }]],
							},
						}),
					),
				});

				const budgetWarnings = () =>
					vi
						.mocked(logger.warn)
						.mock.calls.filter(([message]) => String(message).includes('size budget'));

				test('keeps every child up to the cap but drops outputs after 4 MiB, keeping timings and usage', async () => {
					const { children } = await reportWith(bigGenerations(210), withOutputs);

					expect(children).toHaveLength(200);

					const hasOutput = children.map((span) =>
						Object.hasOwn(attributesOf(span), 'langfuse.observation.output'),
					);
					const kept = hasOutput.filter(Boolean).length;
					expect(kept).toBeGreaterThan(10);
					expect(kept).toBeLessThan(100);
					expect(hasOutput.slice(0, kept).every(Boolean)).toBe(true);
					expect(hasOutput.slice(kept).some(Boolean)).toBe(false);

					children.forEach((span, index) => {
						const attributes = attributesOf(span);
						expect(span.startTimeUnixNano).toBe(String(BigInt(START + index) * 1_000_000n));
						expect(span.endTimeUnixNano).toBe(String(BigInt(START + index + 7) * 1_000_000n));
						expect(attributes['langfuse.observation.type']).toBe('generation');
						expect(JSON.parse(attributes['langfuse.observation.usage_details'])).toEqual({
							input: 3,
							output: 4,
							total: 7,
						});
						expect(JSON.parse(attributes['langfuse.observation.metadata']).run_index).toBe(index);
					});

					const [traceCall] = callsTo('/api/public/otel/v1/traces');
					expect(Buffer.byteLength(traceCall.init.body as string)).toBeLessThanOrEqual(
						4 * MIB + 200 * 1024,
					);
				});

				test('warns once per run however many cases exceed the budget', async () => {
					const { run } = await reportWith(bigGenerations(100), withOutputs);
					await reportSuccess(run, { executionData: execution(bigGenerations(100)) });

					expect(callsTo('/api/public/otel/v1/traces')).toHaveLength(2);
					expect(run.budgetExceededCases).toBe(2);
					expect(budgetWarnings()).toHaveLength(1);
				});

				test('keeps every output and does not warn below the budget', async () => {
					const { children } = await reportWith(bigGenerations(10), withOutputs);

					expect(children).toHaveLength(10);
					for (const span of children) {
						expect(attributesOf(span)).toHaveProperty('langfuse.observation.output');
					}
					expect(budgetWarnings()).toHaveLength(0);
				});

				test('never drops outputs when node outputs are not requested, even with a huge run', async () => {
					const { children } = await reportWith(bigGenerations(200));

					expect(children).toHaveLength(200);
					expect(budgetWarnings()).toHaveLength(0);
					const [traceCall] = callsTo('/api/public/otel/v1/traces');
					expect(Buffer.byteLength(traceCall.init.body as string)).toBeLessThan(MIB);
				});

				const attributeBytesOf = (spans: OtlpSpan[]) =>
					spans.reduce(
						(total, span) =>
							total +
							span.attributes.reduce(
								(sum, entry) => sum + Buffer.byteLength(JSON.stringify(entry)),
								0,
							),
						0,
					);

				test.each([
					['90 KiB', 90],
					['30 KiB', 30],
				])(
					'bounds the whole trace when every child carries a %s fixed attribute',
					async (_label, runNameKiB) => {
						const { run, children } = await reportWith(bigGenerations(150), {
							langfuseReporting: {
								includeNodeOutputs: true,
								runName: 'n'.repeat(runNameKiB * 1024),
							},
						});

						const spans = exportedSpans();
						expect(spans).toHaveLength(children.length + 1);
						expect(children.length).toBeGreaterThan(0);
						expect(attributeBytesOf(spans)).toBeLessThanOrEqual(4 * MIB);
						expect(run.budgetExceededCases).toBe(1);
						expect(budgetWarnings()).toHaveLength(1);
					},
				);

				test('reserves the fixed attributes of every child before granting any output', async () => {
					const { children } = await reportWith(bigGenerations(100), {
						langfuseReporting: { includeNodeOutputs: true, runName: 'n'.repeat(30 * 1024) },
					});

					expect(children).toHaveLength(100);
					const withOutput = children.filter((span) =>
						Object.hasOwn(attributesOf(span), 'langfuse.observation.output'),
					).length;
					expect(withOutput).toBeGreaterThan(0);
					expect(withOutput).toBeLessThan(100);
					expect(attributeBytesOf(exportedSpans())).toBeLessThanOrEqual(4 * MIB);
				});

				test('counts the root span attributes against the budget', async () => {
					const run = await reporter.startRun({
						testRun: { id: TEST_RUN_ID },
						workflow: { ...workflow, nodes },
						triggerNode: buildTriggerNode(withOutputs),
						testCases: [buildRow('item-1')],
						userId: 'user-1',
					});
					assert(run, 'expected a reporter run');
					await reportSuccess(run, {
						outputs: { answer: 'z'.repeat(99 * 1024) },
						executionData: execution(bigGenerations(100)),
					});

					const [root, ...children] = exportedSpans();
					const kept = children.filter((span) =>
						Object.hasOwn(attributesOf(span), 'langfuse.observation.output'),
					).length;
					const [traceCall] = callsTo('/api/public/otel/v1/traces');
					expect(root.parentSpanId).toBeUndefined();
					expect(kept).toBeLessThan(100);
					expect(Buffer.byteLength(traceCall.init.body as string)).toBeLessThanOrEqual(
						4 * MIB + 100 * 1024,
					);
				});
			});

			test('gives every child span the linking keys and the same experiment metadata as the root', async () => {
				const { run, root, children } = await reportWith(
					{ 'AI Agent': [task(0, 10), task(20, 10)] },
					{ langfuseReporting: { runMetadata: '{"git_sha":"abc"}', environment: 'staging' } },
				);

				const rootMetadata = attributesOf(root)['langfuse.experiment.metadata'];
				expect(JSON.parse(rootMetadata)).toMatchObject({ git_sha: 'abc' });
				expect(children).toHaveLength(2);
				for (const child of children) {
					expect(attributesOf(child)['langfuse.experiment.metadata']).toBe(rootMetadata);
					expect(Object.keys(attributesOf(child)).sort()).toEqual(
						[
							'langfuse.environment',
							'langfuse.experiment.dataset.id',
							'langfuse.experiment.id',
							'langfuse.experiment.item.id',
							'langfuse.experiment.item.root_observation_id',
							'langfuse.experiment.metadata',
							'langfuse.experiment.name',
							'langfuse.observation.metadata',
						].sort(),
					);
					expect(attributesOf(child)['langfuse.experiment.id']).toBe(run.experimentId);
				}
			});

			test('puts the experiment metadata on the root exactly once', async () => {
				const { root } = await reportWith({ 'AI Agent': [task(0, 10)] });

				expect(
					root.attributes.filter(({ key }) => key === 'langfuse.experiment.metadata'),
				).toHaveLength(1);
			});

			describe('node errors', () => {
				const failing = (message: string) =>
					task(0, 5, {
						executionStatus: 'error',
						error: { message } as never,
						data: undefined,
					});

				test('truncates a long error to 4 KiB and sends it once, with a short status message', async () => {
					const message = `BOOM${'é'.repeat(20_000)}`;
					const { children } = await reportWith({ 'AI Agent': [failing(message)] }, withOutputs);

					const [span] = children;
					const text = attributesOf(span)['langfuse.observation.status_message'];
					expect(Buffer.byteLength(text)).toBeLessThanOrEqual(4096);
					expect(text.startsWith('BOOMéé')).toBe(true);
					expect(text.endsWith('... [truncated by n8n]')).toBe(true);
					expect(text).not.toContain('�');
					expect(span.status).toEqual({ code: 2, message: 'Node execution failed' });
					expect(JSON.stringify(span).split('BOOMéé')).toHaveLength(2);
				});

				test('keeps an error of at most 4 KiB intact', async () => {
					const message = `BOOM${'x'.repeat(4096 - 4)}`;
					const { children } = await reportWith({ 'AI Agent': [failing(message)] }, withOutputs);

					expect(attributesOf(children[0])['langfuse.observation.status_message']).toBe(message);
				});

				const apiFailure = () =>
					task(0, 5, {
						executionStatus: 'error',
						error: {
							name: 'NodeApiError',
							httpCode: '503',
							message: 'customer jane@example.com rejected',
						} as never,
						data: undefined,
					});

				test('sends only the error class and HTTP code unless node outputs are included', async () => {
					const { children } = await reportWith({ 'AI Agent': [apiFailure()] });

					const [span] = children;
					expect(attributesOf(span)).toMatchObject({
						'langfuse.observation.level': 'ERROR',
						'langfuse.observation.status_message': 'NodeApiError HTTP 503',
					});
					expect(span.status).toEqual({ code: 2, message: 'Node execution failed' });
					expect(JSON.stringify(span)).not.toContain('jane@example.com');
				});

				test('sends the error message when node outputs are included', async () => {
					const { children } = await reportWith({ 'AI Agent': [apiFailure()] }, withOutputs);

					expect(attributesOf(children[0])['langfuse.observation.status_message']).toBe(
						'customer jane@example.com rejected',
					);
					expect(children[0].status).toEqual({ code: 2, message: 'Node execution failed' });
				});

				test.each([
					[
						'a name without a code',
						{ name: 'NodeOperationError', message: 'x' },
						'NodeOperationError',
					],
					['a code without a name', { httpCode: 429, message: 'x' }, 'HTTP 429'],
					[
						'a code that is not three digits',
						{ name: 'Error', httpCode: 'secret', message: 'x' },
						'Error',
					],
				])('sends %s by default', async (_label, error, expected) => {
					const { children } = await reportWith({
						'AI Agent': [
							task(0, 5, { executionStatus: 'error', error: error as never, data: undefined }),
						],
					});

					expect(attributesOf(children[0])['langfuse.observation.status_message']).toBe(expected);
				});

				test('sends no status message for an error without text', async () => {
					const { children } = await reportWith({
						'AI Agent': [
							task(0, 5, { executionStatus: 'error', error: {} as never, data: undefined }),
						],
					});

					expect(attributesOf(children[0])['langfuse.observation.level']).toBe('ERROR');
					expect(attributesOf(children[0])).not.toHaveProperty(
						'langfuse.observation.status_message',
					);
					expect(children[0].status.code).toBe(2);
				});
			});

			describe('estimated token usage', () => {
				const estimateTask = (offsetMs: number) =>
					task(offsetMs, 10, {
						data: {
							ai_languageModel: [
								[
									{
										json: {
											tokenUsageEstimate: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
										},
									},
								],
							],
						},
					});

				test('flags usage_estimated in the observation metadata when the usage is an estimate', async () => {
					const { children } = await reportWith({ 'Dynamic Model': [estimateTask(0)] });

					expect(JSON.parse(attributesOf(children[0])['langfuse.observation.metadata'])).toEqual({
						node_type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						node_type_version: 1.2,
						run_index: 0,
						usage_estimated: true,
					});
				});

				test('does not flag measured usage, a node without usage or an estimate shadowed by real usage', async () => {
					const { children } = await reportWith({
						'AI Agent': [task(0, 10)],
						'OpenAI Chat Model': [
							modelTask(100, { promptTokens: 12, completionTokens: 5, totalTokens: 17 }),
							task(200, 10, {
								data: {
									ai_languageModel: [
										[
											{
												json: {
													tokenUsage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
													tokenUsageEstimate: {
														promptTokens: 9,
														completionTokens: 9,
														totalTokens: 18,
													},
												},
											},
										],
									],
								},
							}),
						],
					});

					expect(children).toHaveLength(3);
					for (const span of children) {
						expect(
							JSON.parse(attributesOf(span)['langfuse.observation.metadata']),
						).not.toHaveProperty('usage_estimated');
					}
				});
			});

			describe('unusable start times', () => {
				const rootStart = String(BigInt(START) * 1_000_000n);

				const orderOf = (children: OtlpSpan[]) =>
					children.map((span) => {
						const { run_index } = JSON.parse(attributesOf(span)['langfuse.observation.metadata']);
						return `${span.name}#${run_index}`;
					});

				test.each([
					[0],
					[Number.NaN],
					[undefined],
					[-5],
					[Infinity],
					['soon' as unknown as number],
				])(
					'falls back to the root start when startTime is %s, keeping the duration',
					async (startTime) => {
						const { children } = await reportWith({
							'AI Agent': [task(900, 40, { startTime: startTime as number })],
						});

						expect(children[0].startTimeUnixNano).toBe(rootStart);
						expect(children[0].endTimeUnixNano).toBe(String(BigInt(START + 40) * 1_000_000n));
					},
				);

				test('sorts NaN-safely and deterministically whatever the key order of the run data', async () => {
					const entries = (): Array<[string, ITaskData[]]> => [
						[
							'AI Agent',
							[task(500, 10), task(0, 10, { startTime: Number.NaN, executionIndex: 3 })],
						],
						[
							'Evaluation Trigger',
							[
								task(0, 10, { startTime: 0, executionIndex: 1 }),
								task(200, 10, { executionIndex: 2 }),
							],
						],
						[
							'OpenAI Chat Model',
							[task(0, 10, { startTime: undefined as never, executionIndex: Number.NaN })],
						],
						['Dynamic Model', [task(100, 10)]],
					];

					const forward = await reportWith(Object.fromEntries(entries()));
					requestMock.mockClear();
					const reversed = await reportWith(Object.fromEntries(entries().reverse()));

					expect(orderOf(reversed.children)).toEqual(orderOf(forward.children));
					expect(orderOf(forward.children)).toEqual([
						'Evaluation Trigger#0',
						'AI Agent#1',
						'OpenAI Chat Model#0',
						'Dynamic Model#0',
						'Evaluation Trigger#1',
						'AI Agent#0',
					]);
					expect(forward.children[0].startTimeUnixNano).toBe(rootStart);
				});

				test('keeps the earliest usable runs when the cap applies and invalid times sort first', async () => {
					const { children } = await reportWith({
						'AI Agent': [
							...Array.from({ length: 200 }, (_, index) => task(index + 1, 1)),
							task(0, 1, { startTime: Number.NaN, executionIndex: 0 }),
						],
					});

					expect(children).toHaveLength(200);
					expect(children[0].startTimeUnixNano).toBe(rootStart);
					expect(orderOf(children)[0]).toBe('AI Agent#200');
				});
			});

			test('adds no child spans when the case has no execution data or run data', async () => {
				const run = await startedRun();

				await reportSuccess(run);
				await reportSuccess(run, { executionData: { data: { resultData: {} } } });

				expect(exportedSpans()).toHaveLength(2);
			});
		});

		test('checks the pending cap before building spans', async () => {
			const run = await startedRun();
			for (let i = 0; i < 1000; i++) run.pending.add(new Promise<void>(() => {}));
			const buildSpans = vi.spyOn(reporter as never, 'buildChildSpans');

			reporter.reportCase(run, { testCase: buildRow('item-1'), status: 'success' });

			expect(buildSpans).not.toHaveBeenCalled();
			expect(run.droppedCases).toBe(1);
			expect(run.pending.size).toBe(1000);
		});
	});

	describe('finishRun', () => {
		test('awaits in-flight case reports before posting run-level scores', async () => {
			const run = await startedRun();
			let release: (response: HttpReply) => void = () => {};
			requestMock.mockImplementation(async ({ url }) => {
				if (url.endsWith('/otel/v1/traces')) {
					return await new Promise<HttpReply>((resolve) => (release = resolve));
				}
				return jsonResponse({ message: 'Accepted' }, { status: 202 });
			});
			reporter.reportCase(run, {
				testCase: buildRow('item-1'),
				status: 'success',
				metrics: { correctness: 4 },
			});

			const finished = reporter.finishRun(run, {
				status: 'success',
				aggregatedMetrics: { correctness: 4 },
				totalCases: 1,
				successCases: 1,
			});
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(callsTo('/api/public/scores')).toHaveLength(0);

			release(jsonResponse({}));
			await finished;

			const urls = calls().map((call) => call.url);
			expect(urls.indexOf(`${HOST}/api/public/otel/v1/traces`)).toBeLessThan(
				urls.lastIndexOf(`${HOST}/api/public/scores`),
			);
			expect(callsTo('/api/public/scores')).toHaveLength(2);
		});

		test('also awaits cases reported while it is already waiting', async () => {
			const run = await startedRun();
			const events: string[] = [];
			const gates: Array<() => void> = [];
			let tracesSeen = 0;
			requestMock.mockImplementation(async ({ url, body }) => {
				if (url.endsWith('/otel/v1/traces')) {
					const index = tracesSeen++;
					await new Promise<void>((resolve) => (gates[index] = resolve));
					events.push(`trace-${index}-done`);
				}
				if (url.endsWith('/scores') && JSON.parse(body as string)[0].datasetRunId) {
					events.push('run-scores');
				}
				return jsonResponse({}, { status: 202 });
			});
			reporter.reportCase(run, { testCase: buildRow('item-1'), status: 'success' });
			await vi.waitFor(() => expect(tracesSeen).toBe(1));

			const finished = reporter.finishRun(run, {
				status: 'success',
				aggregatedMetrics: { correctness: 4 },
				totalCases: 2,
				successCases: 2,
			});
			reporter.reportCase(run, { testCase: buildRow('item-2'), status: 'success' });
			await vi.waitFor(() => expect(tracesSeen).toBe(2));

			gates[0]();
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(events).not.toContain('run-scores');

			gates[1]();
			await finished;

			expect(events).toEqual(['trace-0-done', 'trace-1-done', 'run-scores']);
		});

		test('posts mean metrics and the success rate scoped to the experiment only', async () => {
			const run = await startedRun({ langfuseReporting: { environment: 'staging' } });
			const before = Date.now();

			await reporter.finishRun(run, {
				status: 'success',
				aggregatedMetrics: { correctness: 3.5, executionTime: 1200 },
				totalCases: 4,
				successCases: 3,
			});

			const [call] = callsTo('/api/public/scores');
			const timestamp = call.body[0].timestamp as string;
			expect(Date.parse(timestamp)).toBeGreaterThanOrEqual(before);
			expect(Date.parse(timestamp)).toBeLessThanOrEqual(Date.now());
			expect(call.body).toEqual([
				{
					id: sha256Hex(`${run.experimentId}correctness`).slice(0, 32),
					datasetRunId: run.experimentId,
					name: 'correctness',
					value: 3.5,
					dataType: 'NUMERIC',
					environment: 'staging',
					timestamp,
					metadata: { n8n_test_run_id: TEST_RUN_ID },
				},
				{
					id: sha256Hex(`${run.experimentId}executionTime`).slice(0, 32),
					datasetRunId: run.experimentId,
					name: 'executionTime',
					value: 1200,
					dataType: 'NUMERIC',
					environment: 'staging',
					timestamp,
					metadata: { n8n_test_run_id: TEST_RUN_ID },
				},
				{
					id: sha256Hex(`${run.experimentId}n8n_success_rate`).slice(0, 32),
					datasetRunId: run.experimentId,
					name: 'n8n_success_rate',
					value: 0.75,
					dataType: 'NUMERIC',
					environment: 'staging',
					timestamp,
					metadata: { n8n_test_run_id: TEST_RUN_ID },
				},
			]);
			for (const score of call.body) {
				expect(score).not.toHaveProperty('traceId');
				expect(score).not.toHaveProperty('observationId');
			}
		});

		test('omits the success rate when no case ran', async () => {
			const run = await startedRun();

			await reporter.finishRun(run, {
				status: 'cancelled',
				aggregatedMetrics: {},
				totalCases: 0,
				successCases: 0,
			});

			expect(callsTo('/api/public/scores')).toHaveLength(0);
		});

		test('warns without throwing when the score request fails', async () => {
			const run = await startedRun();
			requestMock.mockRejectedValue(new Error('timeout'));

			await expect(
				reporter.finishRun(run, {
					status: 'success',
					aggregatedMetrics: { correctness: 4 },
					totalCases: 1,
					successCases: 1,
				}),
			).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalled();
		});

		test('logs rejected run-level scores of a 207', async () => {
			const run = await startedRun();
			requestMock.mockResolvedValue(
				jsonResponse({ accepted: 0, rejected: 1, errors: [{ message: 'bad' }] }, { status: 207 }),
			);

			await reporter.finishRun(run, {
				status: 'success',
				aggregatedMetrics: { correctness: 4 },
				totalCases: 1,
				successCases: 1,
			});

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('scores'),
				expect.objectContaining({ scope: 'run', rejected: 1 }),
			);
		});
	});

	test('never calls the legacy dataset-run-items endpoint', async () => {
		const run = await startedRun();

		reporter.reportCase(run, {
			testCase: buildRow('item-1'),
			status: 'success',
			metrics: { correctness: 4 },
		});
		await reporter.finishRun(run, {
			status: 'success',
			aggregatedMetrics: { correctness: 4 },
			totalCases: 1,
			successCases: 1,
		});

		expect(requestMock.mock.calls.length).toBeGreaterThan(2);
		for (const [options] of requestMock.mock.calls) {
			expect(options.url).not.toContain('dataset-run-items');
		}
	});
});
