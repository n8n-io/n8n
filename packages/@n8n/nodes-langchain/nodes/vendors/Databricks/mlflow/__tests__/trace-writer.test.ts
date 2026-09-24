import {
	buildTraceInfo,
	defaultExperimentName,
	ensureExperiment,
	writeTrace,
	type MlflowRequest,
	type SignedUpload,
} from '../trace-writer';
import type { CollectedTrace } from '../types';
import { MLFLOW_ATTRIBUTE } from '../types';

const SIGNED_URI =
	'https://germanywestcentral.storage.azuredatabricks.net/api/2.0/fs/files/WorkspaceInternal/x/traces.json?sig=secret';

type Reply = { status: number; body: unknown };

/** Shaped after the real workspace replies captured while probing. */
function workspace(overrides: Record<string, Reply> = {}) {
	const calls: Array<{ method: string; path: string; qs?: unknown; body?: unknown }> = [];
	const request: MlflowRequest = async (options) => {
		calls.push(options);
		if (options.path in overrides) return overrides[options.path];
		if (options.path.endsWith('/credentials-for-data-upload')) {
			return {
				status: 200,
				body: {
					credential_info: {
						run_id: 'tr-1',
						path: 'traces.json',
						signed_uri: SIGNED_URI,
						type: 'AZURE_SAS_URI',
					},
				},
			};
		}
		return { status: 200, body: {} };
	};
	return { request, calls };
}

/** What the workspace really answers for an experiment that is not there. */
const NOT_FOUND: Reply = {
	status: 404,
	body: { error_code: 'RESOURCE_DOES_NOT_EXIST', message: 'Node /Shared/x does not exist.' },
};

function trace(): CollectedTrace {
	return {
		traceId: 'tr-b07508f28da642ada576127a2b1dd62e',
		rootSpanId: 'KCBzaEy5W60=',
		startTimeMs: 1_790_083_042_000,
		endTimeMs: 1_790_083_045_500,
		state: 'OK',
		executionId: '1522',
		workflowId: 'NnRSpllYYU2NtmPT',
		nodeName: 'Databricks AI Agent',
		spans: [
			{
				trace_id: 'sHUI8o2mQq2ldhJ6Kx3WLg==',
				span_id: 'KCBzaEy5W60=',
				name: 'agent',
				start_time_unix_nano: '1790083042000000000',
				end_time_unix_nano: '1790083045500000000',
				status: { code: 'OK' },
				attributes: {
					[MLFLOW_ATTRIBUTE.SpanType]: '"AGENT"',
					[MLFLOW_ATTRIBUTE.SpanInputs]: '{"input":"how many PTO days?"}',
					[MLFLOW_ATTRIBUTE.SpanOutputs]: '{"output":"25 days"}',
				},
			},
		],
	};
}

describe('defaultExperimentName', () => {
	it('is the per-workflow shared path', () => {
		expect(defaultExperimentName('NnRSpllYYU2NtmPT')).toBe(
			'/Shared/n8n-workflows-NnRSpllYYU2NtmPT',
		);
	});
});

describe('ensureExperiment', () => {
	it('reuses an existing experiment', async () => {
		const { request, calls } = workspace({
			'/api/2.0/mlflow/experiments/get-by-name': {
				status: 200,
				body: { experiment: { experiment_id: '822142731468161', name: '/Shared/x' } },
			},
		});

		expect(await ensureExperiment(request, '/Shared/x')).toBe('822142731468161');
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			method: 'GET',
			path: '/api/2.0/mlflow/experiments/get-by-name',
			qs: { experiment_name: '/Shared/x' },
		});
	});

	it('creates it when the lookup reports it does not exist', async () => {
		const { request, calls } = workspace({
			'/api/2.0/mlflow/experiments/get-by-name': NOT_FOUND,
			'/api/2.0/mlflow/experiments/create': { status: 200, body: { experiment_id: '999' } },
		});

		expect(await ensureExperiment(request, '/Shared/x')).toBe('999');
		expect(calls[1]).toMatchObject({
			method: 'POST',
			path: '/api/2.0/mlflow/experiments/create',
			body: { name: '/Shared/x' },
		});
	});

	it('does not treat a permission failure as a missing experiment', async () => {
		const { request, calls } = workspace({
			'/api/2.0/mlflow/experiments/get-by-name': {
				status: 403,
				body: { error_code: 'PERMISSION_DENIED', message: 'no access' },
			},
		});

		await expect(ensureExperiment(request, '/Shared/x')).rejects.toThrow('PERMISSION_DENIED');
		expect(calls).toHaveLength(1);
	});

	it('surfaces the workspace error code when the create fails', async () => {
		const { request } = workspace({
			'/api/2.0/mlflow/experiments/get-by-name': NOT_FOUND,
			'/api/2.0/mlflow/experiments/create': {
				status: 400,
				body: { error_code: 'INVALID_PARAMETER_VALUE', message: 'bad name' },
			},
		});

		await expect(ensureExperiment(request, '/Shared/x')).rejects.toThrow(
			'INVALID_PARAMETER_VALUE: bad name',
		);
	});

	it('fails clearly when no id comes back', async () => {
		const { request } = workspace({
			'/api/2.0/mlflow/experiments/get-by-name': NOT_FOUND,
			'/api/2.0/mlflow/experiments/create': { status: 200, body: {} },
		});

		await expect(ensureExperiment(request, '/Shared/x')).rejects.toThrow('experiment id');
	});
});

describe('buildTraceInfo', () => {
	it('uses the timestamp and duration formats the workspace accepts', () => {
		const info = buildTraceInfo(trace(), '822142731468161');

		expect(info.request_time).toBe('2026-09-22T13:17:22.000Z');
		expect(info.execution_duration).toBe('3.5s');
		expect(info.state).toBe('OK');
	});

	it('points the trace at the experiment', () => {
		expect(buildTraceInfo(trace(), '42').trace_location).toEqual({
			type: 'MLFLOW_EXPERIMENT',
			mlflow_experiment: { experiment_id: '42' },
		});
	});

	it('carries the n8n execution as client_request_id and the workflow as a tag', () => {
		const info = buildTraceInfo(trace(), '42');

		expect(info.client_request_id).toBe('1522');
		expect(info.tags).toMatchObject({
			'n8n.workflowId': 'NnRSpllYYU2NtmPT',
			'n8n.node': 'Databricks AI Agent',
		});
	});

	it('previews the root span inputs and outputs', () => {
		const info = buildTraceInfo(trace(), '42');

		expect(info.request_preview).toContain('how many PTO days?');
		expect(info.response_preview).toContain('25 days');
	});

	it('caps previews', () => {
		const big = trace();
		big.spans[0].attributes[MLFLOW_ATTRIBUTE.SpanInputs] = 'x'.repeat(5_000);

		expect(buildTraceInfo(big, '42').request_preview).toHaveLength(1_000);
	});
});

describe('writeTrace', () => {
	it('creates the trace on 3.0, then uploads the spans to the signed URL', async () => {
		const { request, calls } = workspace();
		const uploads: Array<{ url: string; body: string }> = [];
		const upload: SignedUpload = async (options) => {
			uploads.push(options);
		};

		await writeTrace({ request, upload, experimentId: '822142731468161' }, trace());

		expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
			'POST /api/3.0/mlflow/traces',
			'GET /api/2.0/mlflow/traces/tr-b07508f28da642ada576127a2b1dd62e/credentials-for-data-upload',
		]);
		expect(calls[0].body).toMatchObject({ trace: { trace_info: { trace_id: trace().traceId } } });

		expect(uploads).toHaveLength(1);
		expect(uploads[0].url).toBe(SIGNED_URI);
		expect(JSON.parse(uploads[0].body)).toEqual({ spans: trace().spans });
	});

	it('fails when the workspace returns no upload URL', async () => {
		const { request } = workspace({
			'/api/2.0/mlflow/traces/tr-b07508f28da642ada576127a2b1dd62e/credentials-for-data-upload': {
				status: 200,
				body: { credential_info: {} },
			},
		});

		await expect(
			writeTrace({ request, upload: async () => {}, experimentId: '1' }, trace()),
		).rejects.toThrow('upload URL');
	});

	it('does not upload when trace creation fails', async () => {
		const { request } = workspace({
			'/api/3.0/mlflow/traces': {
				status: 400,
				body: { error_code: 'INVALID_PARAMETER_VALUE', message: 'experiment_id is missing' },
			},
		});
		let uploaded = false;

		await expect(
			writeTrace(
				{
					request,
					upload: async () => {
						uploaded = true;
					},
					experimentId: '1',
				},
				trace(),
			),
		).rejects.toThrow('INVALID_PARAMETER_VALUE');
		expect(uploaded).toBe(false);
	});
});

describe('trace-level token usage', () => {
	it('writes the run total to mlflow.trace.tokenUsage', () => {
		const withUsage = {
			...trace(),
			tokenUsage: { inputTokens: 419, outputTokens: 95, totalTokens: 514 },
		};

		const info = buildTraceInfo(withUsage, '42');

		expect(JSON.parse(info.trace_metadata['mlflow.trace.tokenUsage'])).toEqual({
			input_tokens: 419,
			output_tokens: 95,
			total_tokens: 514,
		});
	});

	it('omits the metadata when no model reported usage', () => {
		expect(buildTraceInfo(trace(), '42').trace_metadata).toEqual({});
	});
});

describe('previews', () => {
	it('prefers the plain-text question and answer over the serialized span', () => {
		const withPreviews = {
			...trace(),
			requestPreview: 'how many PTO days?',
			responsePreview: '25 days',
		};

		const info = buildTraceInfo(withPreviews, '42');

		expect(info.request_preview).toBe('how many PTO days?');
		expect(info.response_preview).toBe('25 days');
	});

	it('falls back to the span attribute when the run produced no answer', () => {
		const info = buildTraceInfo(trace(), '42');

		expect(info.response_preview).toContain('25 days');
	});
});
