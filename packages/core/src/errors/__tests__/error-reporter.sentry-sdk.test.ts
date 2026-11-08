import type { ContextManager, TextMapPropagator, TracerProvider } from '@opentelemetry/api';
import { context, propagation, trace } from '@opentelemetry/api';
import type { Breadcrumb, TransactionEvent } from '@sentry/core';
import { close, continueTrace, flush, getClient, startSpan } from '@sentry/node';
import { createServer, get, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mock } from 'vitest-mock-extended';

import { ErrorReporter } from '../error-reporter';

vi.mock('@n8n/backend-common', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/backend-common')>()),
	inTest: false,
}));

async function initSentry(
	tracesSampleRate: number,
	options: Partial<Parameters<ErrorReporter['init']>[0]> = {},
) {
	await new ErrorReporter(mock(), mock()).init({
		serverType: 'main',
		dsn: 'http://public@127.0.0.1:9/1',
		release: 'n8n@test',
		environment: 'test',
		serverName: 'test-server',
		withEventLoopBlockDetection: false,
		tracesSampleRate,
		profilingEnabled: false,
		...options,
	});
}

function collectTransactions() {
	const transactions: TransactionEvent[] = [];
	getClient()?.on('beforeEnvelope', ([, items]) => {
		for (const [header, item] of items) {
			if (header.type === 'transaction') transactions.push(item as TransactionEvent);
		}
	});
	return transactions;
}

async function sendRequest(): Promise<IncomingHttpHeaders> {
	let headers: IncomingHttpHeaders = {};
	const server = createServer((req, res) => {
		headers = req.headers;
		res.end();
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	try {
		const { port } = server.address() as AddressInfo;
		await new Promise<void>((resolve, reject) => {
			get(`http://127.0.0.1:${port}/`, (res) => res.resume().on('end', resolve)).on(
				'error',
				reject,
			);
		});
	} finally {
		server.closeAllConnections();
		await new Promise((resolve) => server.close(resolve));
	}
	return headers;
}

describe('ErrorReporter with the real Sentry SDK', () => {
	afterEach(async () => {
		await close(0);
		trace.disable();
		context.disable();
		propagation.disable();
	});

	it('leaves the global OpenTelemetry setup to n8n', async () => {
		await initSentry(1);

		expect(trace.setGlobalTracerProvider(mock<TracerProvider>())).toBe(true);
		expect(context.setGlobalContextManager(mock<ContextManager>())).toBe(true);
		expect(propagation.setGlobalPropagator(mock<TextMapPropagator>())).toBe(true);
	});

	it('drops Express middleware spans and moves their children to the parent span', async () => {
		await initSentry(1);
		const transactions = collectTransactions();

		startSpan({ name: 'GET /rest/workflows', op: 'http.server', forceTransaction: true }, () => {
			startSpan({ name: 'jsonParser', op: 'middleware' }, () => {
				startSpan({ name: 'load workflows', op: 'function' }, () => {});
			});
		});
		await flush(1000);

		const [transaction] = transactions;
		expect(transaction.spans?.map(({ op, parent_span_id }) => ({ op, parent_span_id }))).toEqual([
			{ op: 'function', parent_span_id: transaction.contexts?.trace?.span_id },
		]);
	});

	it('adds no Sentry trace headers to outgoing requests in a sampled trace', async () => {
		await initSentry(1, { eligibleIntegrations: { Http: true }, slowSpanThresholdMs: 0 });
		const transactions = collectTransactions();

		const headers = await startSpan({ name: 'run workflow', forceTransaction: true }, sendRequest);
		await flush(1000);

		const workflowTransaction = transactions.find(
			({ transaction }) => transaction === 'run workflow',
		);
		expect(workflowTransaction?.spans?.map(({ op }) => op)).toContain('http.client');
		expect(headers['sentry-trace']).toBeUndefined();
		expect(headers.baggage).toBeUndefined();
	});

	it('adds no Sentry trace headers to outgoing requests in an unsampled trace', async () => {
		await initSentry(1, { eligibleIntegrations: { Http: true } });
		const unsampledParent = `${'a'.repeat(32)}-${'b'.repeat(16)}-0`;
		const breadcrumbs: Breadcrumb[] = [];
		getClient()?.on('beforeAddBreadcrumb', (breadcrumb) => breadcrumbs.push(breadcrumb));

		const headers = await continueTrace(
			{ sentryTrace: unsampledParent, baggage: undefined },
			async () => await startSpan({ name: 'run workflow' }, sendRequest),
		);

		expect(breadcrumbs.map(({ category }) => category)).toContain('http');
		expect(headers['sentry-trace']).toBeUndefined();
		expect(headers.baggage).toBeUndefined();
	});
});
