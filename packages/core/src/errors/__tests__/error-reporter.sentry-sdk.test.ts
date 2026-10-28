import type { ContextManager, TextMapPropagator, TracerProvider } from '@opentelemetry/api';
import { context, propagation, trace } from '@opentelemetry/api';
import type { TransactionEvent } from '@sentry/core';
import { close, flush, getClient, startSpan } from '@sentry/node';
import { mock } from 'vitest-mock-extended';

import { ErrorReporter } from '../error-reporter';

vi.mock('@n8n/backend-common', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/backend-common')>()),
	inTest: false,
}));

async function initSentry(tracesSampleRate: number) {
	await new ErrorReporter(mock(), mock()).init({
		serverType: 'main',
		dsn: 'http://public@127.0.0.1:9/1',
		release: 'n8n@test',
		environment: 'test',
		serverName: 'test-server',
		withEventLoopBlockDetection: false,
		tracesSampleRate,
		profilingEnabled: false,
	});
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
		const transactions: TransactionEvent[] = [];
		getClient()?.on('beforeEnvelope', ([, items]) => {
			for (const [header, item] of items) {
				if (header.type === 'transaction') transactions.push(item as TransactionEvent);
			}
		});

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
});
