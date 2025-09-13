import { IsInExperimentalNdvSymbol } from '@/constants';
import { computed, inject } from 'vue';

export function useIsInExperimentalNdv() {
	return computed(() => inject(IsInExperimentalNdvSymbol, false));
}
