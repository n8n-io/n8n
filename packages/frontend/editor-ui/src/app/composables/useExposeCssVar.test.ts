import { render } from '@testing-library/vue';
import { useExposeCssVar } from './useExposeCssVar';
import { defineComponent, h } from 'vue';

describe(useExposeCssVar, () => {
	it('should set CSS variable', () => {
		const Component = defineComponent(() => {
			useExposeCssVar('--test-var', '1234px');
			return () => h('div');
		});

		render(Component);
		expect(document.documentElement.style.getPropertyValue('--test-var')).toBe('1234px');
	});

	it('should unset CSS variable when component is unmounted', () => {
		const Component = defineComponent(() => {
			useExposeCssVar('--test-var', '1234px');
			return () => h('div');
		});
		const rendered = render(Component);

		expect(document.documentElement.style.getPropertyValue('--test-var')).toBe('1234px');
		rendered.unmount();
		expect(document.documentElement.style.getPropertyValue('--test-var')).toBe('');
	});

	it('should restore CSS variable before mount when component is unmounted', () => {
		const Component = defineComponent(() => {
			useExposeCssVar('--test-var', '1234px');
			return () => h('div');
		});

		document.documentElement.style.setProperty('--test-var', '3px');

		const rendered = render(Component);

		expect(document.documentElement.style.getPropertyValue('--test-var')).toBe('1234px');
		rendered.unmount();
		expect(document.documentElement.style.getPropertyValue('--test-var')).toBe('3px');
	});
});
