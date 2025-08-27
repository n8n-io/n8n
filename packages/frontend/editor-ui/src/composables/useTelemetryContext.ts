import { TelemetryContextSymbol } from '@/constants';
import type { TelemetryContext } from '@/types/telemetry';
import { inject, provide } from 'vue';

export function useTelemetryContext(
	overrides: Partial<TelemetryContext> = {},
): Partial<TelemetryContext> {
	const ctx = inject(TelemetryContextSymbol, {});
	const merged = { ...ctx, ...overrides };

	provide(TelemetryContextSymbol, merged);

	return merged;
}
