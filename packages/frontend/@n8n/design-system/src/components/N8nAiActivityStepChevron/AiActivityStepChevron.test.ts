import { render } from '@testing-library/vue';
import AiActivityStepChevron from './AiActivityStepChevron.vue';

describe('AiActivityStepChevron', () => {
	it.each(['right', 'down'] as const)(
		'keeps one decorative icon while toggling from %s',
		async (direction) => {
			const { container, rerender } = render(AiActivityStepChevron, {
				props: { open: false, direction },
			});
			const icon = container.querySelector('svg');
			expect(icon).not.toBeNull();
			expect(icon).toHaveAttribute('aria-hidden', 'true');
			const closedClass = icon?.getAttribute('class');
			await rerender({ open: true, direction });
			expect(container.querySelector('svg')).toBe(icon);
			expect(icon?.getAttribute('class')).not.toBe(closedClass);
			await rerender({ open: false, direction });
			expect(icon?.getAttribute('class')).toBe(closedClass);
		},
	);
});
