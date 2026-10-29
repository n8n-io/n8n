import type { BuiltTelemetry } from '../../../types/telemetry';
import { traceModelRequests } from '../model-request-tracing';

function fixture() {
	const spans: Array<{
		name: string;
		attributes: Record<string, unknown>;
		status?: { code: number };
		ended: boolean;
	}> = [];
	const tracer = {
		startSpan(name: string, options: { attributes: Record<string, unknown> }) {
			const record = {
				name,
				attributes: options.attributes,
				ended: false,
				status: undefined as { code: number } | undefined,
			};
			spans.push(record);
			return {
				setAttributes(attributes: Record<string, unknown>) {
					Object.assign(record.attributes, attributes);
				},
				setStatus(status: { code: number }) {
					record.status = status;
				},
				end() {
					record.ended = true;
				},
			};
		},
	};
	const telemetry: BuiltTelemetry = {
		enabled: true,
		traceModelRequests: true,
		recordInputs: false,
		recordOutputs: false,
		integrations: [],
		isLangSmith: true,
		tracer,
		metadata: { thread_id: 'thread', evalRole: 'helper' },
	};
	return { spans, telemetry };
}

it('records each HTTP attempt, with no payload or duplicate usage', async () => {
	const { spans, telemetry } = fixture();
	const delegate = vi
		.fn<typeof fetch>()
		.mockResolvedValueOnce(new Response('private error', { status: 500 }))
		.mockResolvedValueOnce(new Response('private output'));
	const fetcher = traceModelRequests(delegate, telemetry, 'custom', 'test-model');
	const init = {
		method: 'POST',
		headers: { Authorization: 'private key' },
		body: 'private prompt',
	};
	expect((await fetcher('https://private.url', init)).status).toBe(500);
	expect((await fetcher('https://private.url', init)).status).toBe(200);
	expect(delegate).toHaveBeenNthCalledWith(1, 'https://private.url', init);
	expect(spans.map((span) => span.status?.code)).toEqual([2, 1]);
	expect(spans.every((span) => span.ended)).toBe(true);
	expect(spans[0].attributes).toMatchObject({
		'langsmith.traceable': 'true',
		'langsmith.metadata.thread_id': 'thread',
		'langsmith.metadata.evalRole': 'helper',
		'gen_ai.system': 'custom',
		'gen_ai.request.model': 'test-model',
		'http.response.status_code': 500,
	});
	expect(JSON.stringify(spans)).not.toMatch(/private|usage|tokens/);
});

it('preserves a transport exception without recording its message', async () => {
	const { spans, telemetry } = fixture();
	const failure = new Error('private error');
	const delegate = vi.fn<typeof fetch>().mockRejectedValue(failure);
	await expect(traceModelRequests(delegate, telemetry, 'custom', 'model')('url')).rejects.toBe(
		failure,
	);
	expect(spans[0]).toMatchObject({ ended: true, status: { code: 2 } });
	expect(JSON.stringify(spans)).not.toContain('private');
});

it('keeps generic OpenTelemetry spans free of LangSmith attributes', async () => {
	const { spans, telemetry } = fixture();
	const delegate = vi.fn<typeof fetch>().mockResolvedValue(new Response('ok'));
	await traceModelRequests(
		delegate,
		{ ...telemetry, isLangSmith: false },
		'custom',
		'model',
	)('url');
	expect(spans).toEqual([
		{
			name: 'model.provider.request',
			attributes: {
				'gen_ai.system': 'custom',
				'gen_ai.request.model': 'model',
				'http.response.status_code': 200,
			},
			status: { code: 1 },
			ended: true,
		},
	]);
});

it.each([
	['google', 'gcp.gemini'],
	['custom', undefined],
] as const)('sends the spec provider name for the %s provider', async (provider, providerName) => {
	const { spans, telemetry } = fixture();
	const delegate = vi.fn<typeof fetch>().mockResolvedValue(new Response('ok'));
	await traceModelRequests(delegate, telemetry, provider, 'model')('url');
	expect(spans[0].attributes['gen_ai.provider.name']).toBe(providerName);
});

it('records LangSmith request spans without optional metadata', async () => {
	const { spans, telemetry } = fixture();
	const delegate = vi.fn<typeof fetch>().mockResolvedValue(new Response('ok'));
	await traceModelRequests(
		delegate,
		{ ...telemetry, metadata: undefined },
		'custom',
		'model',
	)('url');
	expect(spans[0]).toEqual({
		name: 'model.provider.request',
		attributes: {
			'gen_ai.system': 'custom',
			'gen_ai.request.model': 'model',
			'langsmith.traceable': 'true',
			'langsmith.span.kind': 'chain',
			'http.response.status_code': 200,
		},
		status: { code: 1 },
		ended: true,
	});
});

it('preserves metadata keys that already have the LangSmith prefix', async () => {
	const { spans, telemetry } = fixture();
	const delegate = vi.fn<typeof fetch>().mockResolvedValue(new Response('ok'));
	const metadata = { 'langsmith.metadata.thread_id': 'thread', evalRole: 'helper' };
	await traceModelRequests(delegate, { ...telemetry, metadata }, 'custom', 'model')('url');
	expect(spans[0].attributes).toMatchObject({
		'langsmith.metadata.thread_id': 'thread',
		'langsmith.metadata.evalRole': 'helper',
	});
	expect(Object.keys(spans[0].attributes)).not.toContain(
		'langsmith.metadata.langsmith.metadata.thread_id',
	);
});

it('keeps the delegate when tracing is disabled or not requested', () => {
	const { telemetry } = fixture();
	const delegate = vi.fn<typeof fetch>();
	expect(traceModelRequests(delegate, undefined, 'custom', 'model')).toBe(delegate);
	expect(
		traceModelRequests(delegate, { ...telemetry, traceModelRequests: false }, 'custom', 'model'),
	).toBe(delegate);
	expect(traceModelRequests(delegate, { ...telemetry, enabled: false }, 'custom', 'model')).toBe(
		delegate,
	);
});

it.each([
	{ name: 'missing', tracer: undefined },
	{ name: 'null', tracer: null },
	{ name: 'empty', tracer: {} },
	{ name: 'invalid', tracer: { startSpan: 'not callable' } },
])('keeps the delegate when the tracer is $name', ({ tracer }) => {
	const { telemetry } = fixture();
	const delegate = vi.fn<typeof fetch>();
	expect(traceModelRequests(delegate, { ...telemetry, tracer }, 'custom', 'model')).toBe(delegate);
});

it('does not change provider responses when telemetry fails', async () => {
	const { telemetry } = fixture();
	const response = new Response('ok');
	const delegate = vi.fn<typeof fetch>().mockResolvedValue(response);
	const broken = {
		...telemetry,
		tracer: {
			startSpan() {
				throw new Error('tracer failed');
			},
		},
	};
	await expect(traceModelRequests(delegate, broken, 'custom', 'model')('url')).resolves.toBe(
		response,
	);
	expect(delegate).toHaveBeenCalledTimes(1);
});

it.each(['setAttributes', 'setStatus', 'end'] as const)(
	'preserves the provider response when span.%s throws',
	async (method) => {
		const { telemetry } = fixture();
		const span = { setAttributes: vi.fn(), setStatus: vi.fn(), end: vi.fn() };
		span[method].mockImplementation(() => {
			throw new Error('span failed');
		});
		const tracer = { startSpan: vi.fn().mockReturnValue(span) };
		const response = new Response('private output');
		const delegate = vi.fn<typeof fetch>().mockResolvedValue(response);
		await expect(
			traceModelRequests(delegate, { ...telemetry, tracer }, 'custom', 'model')('url'),
		).resolves.toBe(response);
		expect(span[method]).toHaveBeenCalledOnce();
		expect(span.end).toHaveBeenCalledOnce();
		expect(delegate).toHaveBeenCalledOnce();
	},
);

it.each(['setStatus', 'end'] as const)(
	'preserves the transport error when span.%s throws',
	async (method) => {
		const { telemetry } = fixture();
		const span = { setAttributes: vi.fn(), setStatus: vi.fn(), end: vi.fn() };
		span[method].mockImplementation(() => {
			throw new Error('span failed');
		});
		const tracer = { startSpan: vi.fn().mockReturnValue(span) };
		const failure = new Error('private transport error');
		const delegate = vi.fn<typeof fetch>().mockRejectedValue(failure);
		await expect(
			traceModelRequests(delegate, { ...telemetry, tracer }, 'custom', 'model')('url'),
		).rejects.toBe(failure);
		expect(span[method]).toHaveBeenCalledOnce();
		expect(span.end).toHaveBeenCalledOnce();
		expect(span.setAttributes).not.toHaveBeenCalled();
		expect(delegate).toHaveBeenCalledOnce();
	},
);
