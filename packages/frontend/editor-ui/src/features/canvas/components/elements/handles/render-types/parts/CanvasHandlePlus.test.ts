import { fireEvent } from '@testing-library/vue';
import CanvasHandlePlus from './CanvasHandlePlus.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasHandleProvide } from '@/features/canvas/__tests__/utils';

const renderComponent = createComponentRenderer(CanvasHandlePlus, {
	global: {
		provide: {
			...createCanvasHandleProvide(),
		},
	},
});

describe('CanvasHandlePlus', () => {
	it('should render with default props', () => {
		const { html } = renderComponent();

		expect(html()).toMatchSnapshot();
	});

	it('should emit click:plus event when plus icon is clicked', async () => {
		const { container, emitted } = renderComponent();
		const plusIcon = container.querySelector('.plus');

		if (!plusIcon) throw new Error('Plus icon not found');

		await fireEvent.click(plusIcon);

		expect(emitted()).toHaveProperty('click:plus');
	});

	it('should apply correct classes based on position prop', () => {
		const positions = ['top', 'right', 'bottom', 'left'] as const;

		positions.forEach((position) => {
			const { container } = renderComponent({
				props: { position },
			});
			expect(container.firstChild).toHaveClass(position);
		});
	});

	it('should apply correct classes based on status', () => {
		const { container } = renderComponent({
			props: { type: 'success' },
		});

		expect(container.firstChild).toHaveClass('success');
	});

	it('should render SVG elements correctly', () => {
		const { container } = renderComponent();

		const svg = container.querySelector('svg');
		expect(svg).toBeTruthy();
		expect(svg?.getAttribute('viewBox')).toBe('0 0 70 24');

		const lineSvg = container.querySelector('line');
		expect(lineSvg).toBeTruthy();

		const plusSvg = container.querySelector('.plus');
		expect(plusSvg).toBeTruthy();
	});
});
