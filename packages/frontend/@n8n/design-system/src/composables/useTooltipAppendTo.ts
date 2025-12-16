import type { ElTooltip } from 'element-plus';
import { computed, type ComputedRef, inject, type InjectionKey, provide } from 'vue';

const TOOLTIP_APPEND_TO = 'TOOLTIP_APPEND_TO' as unknown as InjectionKey<Value>;

type Value = ComputedRef<InstanceType<typeof ElTooltip>['$props']['appendTo']>;

export function useProvideTooltipAppendTo(el: Value) {
	provide(TOOLTIP_APPEND_TO, el);
}

export function useInjectTooltipAppendTo(): Value {
	const injected = inject(
		TOOLTIP_APPEND_TO,
		computed(() => undefined),
	);

	return injected;
}
