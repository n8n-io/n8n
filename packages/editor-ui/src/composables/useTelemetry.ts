import type { Telemetry } from '@/plugins/telemetry';
import { telemetry } from '@/plugins/telemetry';

export function useTelemetry(): Telemetry {
	return telemetry;
}
