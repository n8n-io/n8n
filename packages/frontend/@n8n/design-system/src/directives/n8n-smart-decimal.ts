import { smartDecimal } from '@n8n/utils/number/smartDecimal';
import type { DirectiveBinding, FunctionDirective } from 'vue';

/**
 * Custom directive `n8nSmartDecimal` to format numbers with smart decimal places.
 *
 * Usage:
 * In your Vue template, use the directive `v-n8n-smart-decimal` passing the number and optionally the decimal places.
 *
 * Example:
 * <p v-n8n-smart-decimal="42.567" />
 *
 * Compiles to: <p>42.57</p>
 *
 * Example with specified decimal places:
 * <p v-n8n-smart-decimal:4="42.56789" />
 *
 * Compiles to: <p>42.5679</p>
 *
 * Function Shorthand:
 * https://vuejs.org/guide/reusability/custom-directives#function-shorthand
 *
 * Hint: Do not use it on components
 * https://vuejs.org/guide/reusability/custom-directives#usage-on-components
 */

export const n8nSmartDecimal: FunctionDirective = (
	el: HTMLElement,
	binding: DirectiveBinding<number | undefined>,
) => {
	const value = parseFloat(binding.value?.toString() ?? '');
	if (!isNaN(value)) {
		const decimals = isNaN(Number(binding.arg)) ? undefined : Number(binding.arg);
		const formattedValue = smartDecimal(value, decimals);
		el.textContent = formattedValue.toString();
	}
};
