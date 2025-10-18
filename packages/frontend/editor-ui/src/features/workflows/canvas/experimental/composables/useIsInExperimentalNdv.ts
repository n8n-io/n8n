import { ExpressionLocalResolveContextSymbol } from '@/constants';
import { computed, inject } from 'vue';

export function useIsInExperimentalNdv() {
	const expressionLocalResolveCtx = inject(ExpressionLocalResolveContextSymbol, undefined);

	// This condition is correct as long as ExpressionLocalResolveContext is used only in experimental NDV
	return computed(() => expressionLocalResolveCtx?.value !== undefined);
}
