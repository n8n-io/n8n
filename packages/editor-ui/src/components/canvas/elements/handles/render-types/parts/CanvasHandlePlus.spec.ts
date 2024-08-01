import { fireEvent } from '@testing-library/vue';
import CanvasHandlePlus from './CanvasHandlePlus.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasHandleProvide } from '@/__tests__/data';

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

	it('emits click:plus event when plus icon is clicked', async () => {
		const { container, emitted } = renderComponent();
		const plusIcon = container.querySelector('svg.plus');

		if (!plusIcon) throw new Error('Plus icon not found');

		await fireEvent.click(plusIcon);

		expect(emitted()).toHaveProperty('click:plus');
	});

	it('applies correct classes based on position prop', () => {
		const positions = ['top', 'right', 'bottom', 'left'];

		positions.forEach((position) => {
			const { container } = renderComponent({
				props: { position },
			});
			expect(container.firstChild).toHaveClass(position);
		});
	});

	it('renders SVG elements correctly', () => {
		const { container } = renderComponent();

		const lineSvg = container.querySelector('svg.line');
		expect(lineSvg).toBeTruthy();
		expect(lineSvg?.getAttribute('viewBox')).toBe('0 0 46 24');

		const plusSvg = container.querySelector('svg.plus');
		expect(plusSvg).toBeTruthy();
		expect(plusSvg?.getAttribute('viewBox')).toBe('0 0 24 24');
	});
});
