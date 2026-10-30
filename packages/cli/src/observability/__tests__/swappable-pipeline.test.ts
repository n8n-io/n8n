import { defaultTextMapSetter, propagation, ROOT_CONTEXT } from '@opentelemetry/api';
import { W3CBaggagePropagator } from '@opentelemetry/core';

import {
	DEFAULT_OUTBOUND_PROPAGATOR,
	DEFAULT_PROPAGATOR_NAMES,
	propagatorFor,
	propagatorFromEnv,
	propagatorNamesFromEnv,
	unknownPropagatorNames,
} from '../swappable-pipeline';

describe('unknownPropagatorNames', () => {
	it('names only what n8n does not carry, whatever the case', () => {
		expect(unknownPropagatorNames(['TraceContext', 'baggage', 'b3', 'none'])).toEqual([
			'b3',
			'none',
		]);
	});
});

describe('outbound header propagators', () => {
	const setNames = (value: string | undefined) => {
		if (value === undefined) delete process.env.OTEL_PROPAGATORS;
		else process.env.OTEL_PROPAGATORS = value;
	};

	afterEach(() => setNames(undefined));

	describe('propagatorFor', () => {
		it.each([
			['tracecontext', ['traceparent', 'tracestate']],
			['baggage', ['baggage']],
			['baggage,tracecontext', ['baggage', 'traceparent', 'tracestate']],
		])('writes the headers that %s names', (names, expected) => {
			expect(propagatorFor(names.split(',')).fields()).toEqual(expected);
		});

		it('reads a name whatever its case', () => {
			expect(propagatorFor(['TraceContext', 'BAGGAGE']).fields()).toEqual([
				'traceparent',
				'tracestate',
				'baggage',
			]);
		});

		it.each([['none'], ['b3,jaeger']])('writes no header for %s', (names) => {
			const propagator = propagatorFor(names.split(','));
			const carrier: Record<string, string> = {};
			propagator.inject({} as never, carrier, { set: (c, k, v) => (c[k] = v as string) });

			expect(propagator.fields()).toEqual([]);
			expect(carrier).toEqual({});
		});

		it('keeps the names it carries when a name it does not carry sits next to them', () => {
			expect(propagatorFor(['tracecontext', 'b3multi']).fields()).toEqual([
				'traceparent',
				'tracestate',
			]);
		});

		it('registers a repeated name once', () => {
			const inject = vi.spyOn(W3CBaggagePropagator.prototype, 'inject');
			const ctx = propagation.setBaggage(
				ROOT_CONTEXT,
				propagation.createBaggage({ tenant: { value: 'acme' } }),
			);

			propagatorFor(['baggage', 'BAGGAGE', 'baggage']).inject(ctx, {}, defaultTextMapSetter);

			expect(inject).toHaveBeenCalledTimes(1);
			inject.mockRestore();
		});

		it.each(['constructor', '__proto__', 'toString'])('carries no name for %s', (name) => {
			expect(unknownPropagatorNames([name])).toEqual([name]);
			expect(() => propagatorFor([name, 'tracecontext'])).not.toThrow();
			expect(propagatorFor([name, 'tracecontext']).fields()).toEqual(['traceparent', 'tracestate']);
		});
	});

	describe('the default', () => {
		it('writes the trace context and the baggage', () => {
			expect(DEFAULT_PROPAGATOR_NAMES).toEqual(['tracecontext', 'baggage']);
			expect(DEFAULT_OUTBOUND_PROPAGATOR.fields()).toEqual([
				'traceparent',
				'tracestate',
				'baggage',
			]);
		});
	});

	describe('propagatorFromEnv', () => {
		it.each([undefined, ''])('gives way to the stored setting when the variable is %p', (value) => {
			setNames(value);

			expect(propagatorNamesFromEnv()).toBeUndefined();
			expect(propagatorFromEnv()).toBeUndefined();
		});

		it('decides the headers when the variable is set', () => {
			setNames('tracecontext');

			expect(propagatorNamesFromEnv()).toEqual(['tracecontext']);
			expect(propagatorFromEnv()?.fields()).toEqual(['traceparent', 'tracestate']);
		});

		it('writes no header when the variable asks for none', () => {
			setNames('none');

			expect(propagatorFromEnv()?.fields()).toEqual([]);
		});
	});
});
