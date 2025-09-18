import { render } from '@testing-library/vue';
import { useCssVarWithCleanup } from './useCssVarWithCleanup';
import { defineComponent, h } from 'vue';

describe(useCssVarWithCleanup, () => {
	it('should set CSS variable', () => {
		const Component = defineComponent(() => {
			const variable = useCssVarWithCleanup('--test-var');
			variable.value = '1234px';
			return () => h('div');
		});

		render(Component);
		expect(document.documentElement.style.getPropertyValue('--test-var')).toBe('1234px');
	});

	it('should unset CSS variable when component is unmounted', () => {
		const Component = defineComponent(() => {
			const variable = useCssVarWithCleanup('--test-var');
			variable.value = '1234px';
			return () => h('div');
		});
		const rendered = render(Component);

		rendered.unmount();
		expect(document.documentElement.style.getPropertyValue('--test-var')).toBe('');
	});
});
