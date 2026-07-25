import type { Telemetry } from '@/app/plugins/telemetry';
import { telemetry } from '@/app/plugins/telemetry';

/**
 * @deprecated Import from `@n8n/composables/useTelemetry` instead.
 *
 * Temporary compatibility shim for the frontend modularization effort
 * (CAT-3686). The telemetry contract and DI now live in `@n8n/composables`;
 * this shim returns the app-registered instance directly so existing call
 * sites — and their `vi.mock`/`vi.spyOn` idioms — keep pre-migration
 * semantics. Call sites are migrated off this path per-directory before it is
 * removed. (N8N-72)
 */
export function useTelemetry(): Telemetry {
	return telemetry;
}
