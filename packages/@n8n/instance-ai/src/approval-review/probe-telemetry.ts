import { AsyncLocalStorage } from 'node:async_hooks';

import type { InstanceAiContext } from '../types';

type TrackTelemetry = NonNullable<InstanceAiContext['trackTelemetry']>;
type TrackedEvent = Parameters<TrackTelemetry>;

const heldEvents = new AsyncLocalStorage<TrackedEvent[]>();

/**
 * Wraps the telemetry sink of an Auto mode run. An event that a tool tracks
 * during the review probe is held until the review ends. It is sent when the
 * card shows, and dropped when the action runs without a card, because then no
 * card ever showed. Telemetry therefore counts the same as in Manual mode.
 */
export function holdProbeTelemetry(track: TrackTelemetry): TrackTelemetry {
	return (eventName, properties) => {
		const held = heldEvents.getStore();
		if (held) held.push([eventName, properties]);
		else track(eventName, properties);
	};
}

export interface ProbeRun<T> {
	/** The events that the probe tracked. */
	held: TrackedEvent[];
	outcome: { ok: true; value: T } | { ok: false; error: unknown };
}

/** Runs the probe call and holds the telemetry that it tracks. Never throws. */
export async function runProbe<T>(call: () => Promise<T>): Promise<ProbeRun<T>> {
	const held: TrackedEvent[] = [];
	try {
		const value = await heldEvents.run(held, call);
		return { held, outcome: { ok: true, value } };
	} catch (error) {
		return { held, outcome: { ok: false, error } };
	}
}
