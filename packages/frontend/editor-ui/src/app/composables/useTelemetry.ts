import type { Telemetry } from '@/app/plugins/telemetry';
import { telemetry } from '@/app/plugins/telemetry';

export function useTelemetry(): Telemetry {
	return telemetry;
}
