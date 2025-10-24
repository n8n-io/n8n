// Empty telemetry event relay - all telemetry has been removed
import { EventRelay } from './event-relay';

export class TelemetryEventRelay extends EventRelay {
	async init() {
		// No telemetry initialization
	}
}
