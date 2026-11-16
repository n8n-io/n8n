import type { Baggage } from '@opentelemetry/api';
import {
	defaultTextMapGetter,
	defaultTextMapSetter,
	propagation,
	ROOT_CONTEXT,
} from '@opentelemetry/api';
import { W3CBaggagePropagator } from '@opentelemetry/core';

import { isReservedBaggageKey } from './otel.constants';

const baggagePropagator = new W3CBaggagePropagator();

export function toCallerBaggage(header: string | string[] | undefined): Baggage | undefined {
	if (!header) return undefined;

	const extracted = baggagePropagator.extract(
		ROOT_CONTEXT,
		{ baggage: header },
		defaultTextMapGetter,
	);
	const baggage = propagation.getBaggage(extracted);
	if (!baggage) return undefined;

	const entries = baggage.getAllEntries();
	const reserved = entries.map(([key]) => key).filter(isReservedBaggageKey);
	if (reserved.length === entries.length) return undefined;

	return reserved.length ? baggage.removeEntries(...reserved) : baggage;
}

export function toBaggageHeader(baggage: Baggage): string | undefined {
	const carrier: Record<string, string> = {};
	baggagePropagator.inject(
		propagation.setBaggage(ROOT_CONTEXT, baggage),
		carrier,
		defaultTextMapSetter,
	);
	return carrier.baggage;
}
