import { screen } from '@testing-library/vue';
import CategoryItem from './ItemTypes/CategoryItem.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(CategoryItem);

describe('CategoryItem', () => {
	it('should allow expand and collapse', async () => {
		const { container, rerender } = renderComponent({ props: { name: 'Category Test' } });

		expect(container.querySelector('[data-icon="chevron-down"]')).toBeInTheDocument();
		await rerender({ expanded: false });
		expect(container.querySelector('[data-icon="chevron-down"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-icon="chevron-up"]')).toBeInTheDocument();
	});

	it('should show count', async () => {
		const { rerender } = renderComponent({ props: { name: 'Category Test', count: 10 } });

		expect(screen.getByText('Category Test (10)')).toBeInTheDocument();
		await rerender({ count: 0 });
		expect(screen.getByText('Category Test')).toBeInTheDocument();
	});

	it('should show trigger icon', async () => {
		const { rerender, container } = renderComponent({
			props: { name: 'Category Test', isTrigger: true },
		});

		expect(container.querySelector('[data-icon="bolt-filled"]')).toBeInTheDocument();
		await rerender({ isTrigger: false });
		expect(container.querySelector('[data-icon="bolt-filled"]')).not.toBeInTheDocument();
	});
});
