import { TelemetryContextSymbol } from '@/constants';
import type { TelemetryContext } from '@/types/telemetry';
import { inject, provide } from 'vue';

/**
 * Composable that injects/provides data for telemetry payload.
 *
 * Intended for populating telemetry payload in reusable components to include
 * contextual information that depends on which part of UI it is used.
 */
export function useTelemetryContext(overrides: TelemetryContext = {}): TelemetryContext {
	const ctx = inject(TelemetryContextSymbol, {});
	const merged = { ...ctx, ...overrides };

	provide(TelemetryContextSymbol, merged);

	return merged;
}
