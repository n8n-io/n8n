import { Telemetry, telemetry } from '@/plugins/telemetry';

export function useTelemetry(): Telemetry {
	return telemetry;
}
