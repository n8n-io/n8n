import { outboundPropagatorFromEnv } from '../outbound-propagator';

describe('outboundPropagatorFromEnv', () => {
	afterEach(() => delete process.env.OTEL_PROPAGATORS);

	it.each([
		['the variable is unset', undefined, ['traceparent', 'tracestate', 'baggage'], []],
		['it names tracecontext', 'tracecontext', ['traceparent', 'tracestate'], []],
		['it names baggage', 'baggage', ['baggage'], []],
		['it names none', 'none', [], []],
		['it repeats a name in any case', 'Baggage,BAGGAGE,baggage', ['baggage'], []],
		['it names one n8n does not carry', 'tracecontext,b3', ['traceparent', 'tracestate'], ['b3']],
	])('writes the headers for %s', (_name, value, fields, unknownNames) => {
		if (value !== undefined) process.env.OTEL_PROPAGATORS = value;

		const outbound = outboundPropagatorFromEnv();

		expect(outbound.propagator.fields()).toEqual(fields);
		expect(outbound.unknownNames).toEqual(unknownNames);
	});
});
