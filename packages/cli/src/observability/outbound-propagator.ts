import type { TextMapPropagator } from '@opentelemetry/api';
import {
	CompositePropagator,
	getStringListFromEnv,
	W3CBaggagePropagator,
	W3CTraceContextPropagator,
} from '@opentelemetry/core';

const PROPAGATORS_BY_NAME = new Map<string, () => TextMapPropagator>([
	['tracecontext', () => new W3CTraceContextPropagator()],
	['baggage', () => new W3CBaggagePropagator()],
]);

const DEFAULT_NAMES = ['tracecontext', 'baggage'];

export type OutboundPropagator = { propagator: TextMapPropagator; unknownNames: string[] };

function outboundPropagatorFor(names: string[]): OutboundPropagator {
	const propagators = new Map<string, TextMapPropagator>();
	const unknownNames: string[] = [];

	for (const name of names) {
		const key = name.toLowerCase();
		if (key === 'none') continue;

		const make = PROPAGATORS_BY_NAME.get(key);
		if (!make) unknownNames.push(name);
		else if (!propagators.has(key)) propagators.set(key, make());
	}

	return {
		propagator: new CompositePropagator({ propagators: [...propagators.values()] }),
		unknownNames,
	};
}

export function outboundPropagatorFromEnv(): OutboundPropagator {
	return outboundPropagatorFor(getStringListFromEnv('OTEL_PROPAGATORS') ?? DEFAULT_NAMES);
}

export const DEFAULT_OUTBOUND_PROPAGATOR = outboundPropagatorFor(DEFAULT_NAMES).propagator;
