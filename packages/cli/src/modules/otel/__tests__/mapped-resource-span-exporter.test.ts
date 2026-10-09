import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

import { MappedResourceSpanExporter } from '../mapped-resource-span-exporter';
import { OtelTestProvider } from './support/otel-test-provider';

describe('MappedResourceSpanExporter', () => {
	let otel: OtelTestProvider;
	let received: ReadableSpan[];
	let inner: SpanExporter;

	beforeAll(() => {
		otel = OtelTestProvider.create();
	});

	afterAll(async () => {
		await otel.shutdown();
	});

	beforeEach(() => {
		otel.reset();
		received = [];
		inner = {
			export: (spans, resultCallback) => {
				received.push(...spans);
				resultCallback({ code: 0 });
			},
			shutdown: async () => {},
			forceFlush: async () => {},
		};
	});

	const finishedSpans = (...attributeSets: Array<Record<string, string>>) => {
		const tracer = otel.provider.getTracer('test');
		for (const attributes of attributeSets) tracer.startSpan('node.execute', { attributes }).end();
		return otel.getFinishedSpans();
	};

	it('exports spans with a merged resource and reuses one resource object per mapped attribute set', () => {
		const exporter = new MappedResourceSpanExporter(inner, (attrs): Record<string, string> => {
			const projectId = attrs['n8n.project.id'];
			return typeof projectId === 'string' ? { 'project.id': projectId } : {};
		});
		const [first, second] = finishedSpans({ 'n8n.project.id': 'p1' }, { 'n8n.project.id': 'p1' });

		exporter.export([first, second], () => {});

		expect(received).toHaveLength(2);
		expect(received[0].resource.attributes['project.id']).toBe('p1');
		expect(received[0].resource).toBe(received[1].resource);
		expect(received[0].resource.attributes).toMatchObject(first.resource.attributes);
		expect(first.resource.attributes['project.id']).toBeUndefined();
		expect(received[0].duration).toEqual(first.duration);
		expect(received[0].ended).toBe(true);
		expect(received[0].spanContext().spanId).toBe(first.spanContext().spanId);
		expect(received[0].attributes).toEqual(first.attributes);
	});

	it('passes a span through untouched when the mapper returns no attributes', () => {
		const exporter = new MappedResourceSpanExporter(inner, () => ({}));
		const [span] = finishedSpans({ 'n8n.workflow.id': 'wf-1' });

		exporter.export([span], () => {});

		expect(received[0]).toBe(span);
	});
});
