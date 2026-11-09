import { Service } from '@n8n/di';
import type { InferTelemetryProps, TelemetryEventDef } from '@n8n/telemetry';
import type { ITelemetryTrackProperties } from 'n8n-workflow';

/** Sends product telemetry events from this instance. */
export interface TelemetryTracker {
	track<T extends TelemetryEventDef>(event: T, properties: InferTelemetryProps<T>): void;
	track(eventName: string, properties?: ITelemetryTrackProperties): void;

	/** Returns `true` when tracked events reach a telemetry backend. */
	isEnabled(): boolean;

	/** Adds a callback that sends buffered events each time the telemetry buffers flush. */
	addBufferFlusher(flusher: () => void): void;
}

/** Without a registered provider the instance sends no telemetry, so events are dropped. */
@Service()
export class TelemetryProxy implements TelemetryTracker {
	private provider: TelemetryTracker | null = null;

	/** Flushers added before the provider registers. */
	private readonly pendingFlushers: Array<() => void> = [];

	registerProvider(provider: TelemetryTracker): void {
		this.provider = provider;
		for (const flusher of this.pendingFlushers.splice(0)) {
			provider.addBufferFlusher(flusher);
		}
	}

	track<T extends TelemetryEventDef>(event: T, properties: InferTelemetryProps<T>): void;
	track(eventName: string, properties?: ITelemetryTrackProperties): void;
	track(event: string | TelemetryEventDef, properties?: ITelemetryTrackProperties): void {
		if (!this.provider) return;

		if (typeof event === 'string') {
			this.provider.track(event, properties);
		} else {
			this.provider.track(event, properties);
		}
	}

	isEnabled(): boolean {
		return this.provider?.isEnabled() ?? false;
	}

	addBufferFlusher(flusher: () => void): void {
		if (this.provider) {
			this.provider.addBufferFlusher(flusher);
		} else {
			this.pendingFlushers.push(flusher);
		}
	}
}
