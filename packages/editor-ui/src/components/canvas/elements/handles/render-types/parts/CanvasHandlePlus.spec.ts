import { fireEvent } from '@testing-library/vue';
import CanvasHandlePlus from './CanvasHandlePlus.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(CanvasHandlePlus);

describe('YourComponent', () => {
	it('renders with default props', () => {
		const { html } = renderComponent();

		expect(html()).toMatchSnapshot();
	});

	it('emits click:plus event when plus icon is clicked', async () => {
		const { getByRole, emitted } = renderComponent();
		const plusIcon = getByRole('svg', { name: /plus/i });

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
