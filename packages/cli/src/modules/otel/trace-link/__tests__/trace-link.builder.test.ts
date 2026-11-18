import { buildTraceLink, buildTraceUrl, getSampledTraceId } from '../trace-link.builder';
import type { TraceLinkSettings } from '../trace-link.builder';

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const SAMPLED = `00-${TRACE_ID}-00f067aa0ba902b7-01`;
const UNSAMPLED = `00-${TRACE_ID}-00f067aa0ba902b7-00`;

const settings = (overrides: Partial<TraceLinkSettings> = {}): TraceLinkSettings => ({
	backend: 'jaeger',
	baseUrl: 'https://jaeger.example.com',
	datasourceUid: '',
	...overrides,
});

const startedAt = new Date('2026-11-18T10:00:00.000Z');
const stoppedAt = new Date('2026-11-18T10:00:02.000Z');

describe('getSampledTraceId', () => {
	it('should return the trace id of a sampled trace', () => {
		expect(getSampledTraceId({ traceparent: SAMPLED })).toBe(TRACE_ID);
	});

	it('should return undefined for an unsampled trace', () => {
		expect(getSampledTraceId({ traceparent: UNSAMPLED })).toBeUndefined();
	});

	it.each([
		['missing context', undefined],
		['null context', null],
		['no traceparent', {}],
		['empty traceparent', { traceparent: '' }],
		['malformed traceparent', { traceparent: 'not-a-traceparent' }],
		['all-zero trace id', { traceparent: `00-${'0'.repeat(32)}-00f067aa0ba902b7-01` }],
	])('should return undefined for %s', (_, tracingContext) => {
		expect(getSampledTraceId(tracingContext)).toBeUndefined();
	});
});

describe('buildTraceUrl', () => {
	it('should build a Jaeger link', () => {
		expect(buildTraceUrl(settings(), TRACE_ID)).toBe(
			`https://jaeger.example.com/trace/${TRACE_ID}`,
		);
	});

	it('should remove trailing slashes from the base URL', () => {
		expect(buildTraceUrl(settings({ baseUrl: 'https://jaeger.example.com//' }), TRACE_ID)).toBe(
			`https://jaeger.example.com/trace/${TRACE_ID}`,
		);
	});

	it('should build a Zipkin link', () => {
		expect(
			buildTraceUrl(
				settings({ backend: 'zipkin', baseUrl: 'https://zipkin.example.com/zipkin' }),
				TRACE_ID,
			),
		).toBe(`https://zipkin.example.com/zipkin/traces/${TRACE_ID}`);
	});

	it('should build a Datadog link with the lower 64 bits of the trace id in decimal', () => {
		expect(
			buildTraceUrl(
				settings({ backend: 'datadog', baseUrl: 'https://app.datadoghq.eu' }),
				TRACE_ID,
			),
		).toBe(`https://app.datadoghq.eu/apm/trace/${BigInt('0xa3ce929d0e0e4736').toString(10)}`);
	});

	it('should build a Honeycomb link with a padded time range', () => {
		const url = buildTraceUrl(
			settings({
				backend: 'honeycomb',
				baseUrl: 'https://ui.honeycomb.io/acme/environments/production',
			}),
			TRACE_ID,
			{ startedAt, stoppedAt },
		);

		const startSec = startedAt.getTime() / 1000 - 300;
		const endSec = stoppedAt.getTime() / 1000 + 300;
		expect(url).toBe(
			`https://ui.honeycomb.io/acme/environments/production/trace?trace_id=${TRACE_ID}&trace_start_ts=${startSec}&trace_end_ts=${endSec}`,
		);
	});

	it('should build a Honeycomb link without a time range when the start time is unknown', () => {
		expect(
			buildTraceUrl(
				settings({
					backend: 'honeycomb',
					baseUrl: 'https://ui.honeycomb.io/acme/environments/dev',
				}),
				TRACE_ID,
			),
		).toBe(`https://ui.honeycomb.io/acme/environments/dev/trace?trace_id=${TRACE_ID}`);
	});

	it('should build a Grafana Tempo Explore link', () => {
		const url = buildTraceUrl(
			settings({
				backend: 'tempo',
				baseUrl: 'https://grafana.example.com',
				datasourceUid: 'tempo-prod',
			}),
			TRACE_ID,
			{ startedAt, stoppedAt },
		);

		const parsed = new URL(url ?? '');
		expect(`${parsed.origin}${parsed.pathname}`).toBe('https://grafana.example.com/explore');
		expect(JSON.parse(parsed.searchParams.get('panes') ?? '')).toEqual({
			a: {
				datasource: 'tempo-prod',
				queries: [
					{
						refId: 'A',
						datasource: { type: 'tempo', uid: 'tempo-prod' },
						queryType: 'traceql',
						query: TRACE_ID,
					},
				],
				range: {
					from: String(startedAt.getTime() - 300_000),
					to: String(stoppedAt.getTime() + 300_000),
				},
			},
		});
	});

	it('should not build a Tempo link without a data source UID', () => {
		expect(
			buildTraceUrl(
				settings({ backend: 'tempo', baseUrl: 'https://grafana.example.com' }),
				TRACE_ID,
			),
		).toBeUndefined();
	});

	it.each(['', 'jaeger.example.com', 'javascript:alert(1)', 'ftp://jaeger.example.com'])(
		'should not build a link for the base URL "%s"',
		(baseUrl) => {
			expect(buildTraceUrl(settings({ baseUrl }), TRACE_ID)).toBeUndefined();
		},
	);

	it('should not build a link when the backend is none', () => {
		expect(buildTraceUrl(settings({ backend: 'none' }), TRACE_ID)).toBeUndefined();
	});
});

describe('buildTraceLink', () => {
	it('should return the trace id and URL of a sampled trace', () => {
		expect(buildTraceLink(settings(), { traceparent: SAMPLED })).toEqual({
			traceId: TRACE_ID,
			url: `https://jaeger.example.com/trace/${TRACE_ID}`,
		});
	});

	it('should return undefined for an unsampled trace', () => {
		expect(buildTraceLink(settings(), { traceparent: UNSAMPLED })).toBeUndefined();
	});

	it('should return undefined when the backend is none', () => {
		expect(buildTraceLink(settings({ backend: 'none' }), { traceparent: SAMPLED })).toBeUndefined();
	});

	it('should return undefined when the execution has no trace', () => {
		expect(buildTraceLink(settings(), null)).toBeUndefined();
	});
});
