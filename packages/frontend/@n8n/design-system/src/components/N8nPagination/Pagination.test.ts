import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import Pagination from './Pagination.vue';

describe('components/N8nPagination', () => {
	describe('rendering', () => {
		it('should render prev, next, total, and sizes by default without jumper', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
				},
			});
			expect(wrapper.getByTestId('pagination-prev')).toBeInTheDocument();
			expect(wrapper.getByTestId('pagination-next')).toBeInTheDocument();
			expect(wrapper.getByTestId('pagination-total')).toHaveTextContent('Total 100');
			expect(wrapper.getByTestId('pagination-sizes')).toBeInTheDocument();
			expect(wrapper.queryByTestId('pagination-jumper')).not.toBeInTheDocument();
		});

		it('should show jumper when showJumper is true', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					showJumper: true,
				},
			});
			expect(wrapper.getByTestId('pagination-jumper')).toBeInTheDocument();
			expect(wrapper.getByTestId('pagination-jumper-input')).toHaveValue('1');
		});

		it('should hide total, sizes, and jumper when disabled via props', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					showTotal: false,
					showSizes: false,
					showJumper: false,
				},
			});
			expect(wrapper.queryByTestId('pagination-total')).not.toBeInTheDocument();
			expect(wrapper.queryByTestId('pagination-sizes')).not.toBeInTheDocument();
			expect(wrapper.queryByTestId('pagination-jumper')).not.toBeInTheDocument();
			expect(wrapper.getByTestId('pagination-prev')).toBeInTheDocument();
			expect(wrapper.getByTestId('pagination-next')).toBeInTheDocument();
		});

		it('should default to medium size', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
				},
			});
			const container = wrapper.container.firstChild as HTMLElement;
			expect(container?.className).toContain('medium');
		});

		it('should apply small size class', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					size: 'small',
				},
			});
			const container = wrapper.container.firstChild as HTMLElement;
			expect(container?.className).toContain('small');
		});

		it('should render disabled state', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					itemsPerPage: 10,
					disabled: true,
					showJumper: true,
				},
			});

			const container = wrapper.getByTestId('pagination');
			expect(container.className).toMatch(/isDisabled/);

			const buttons = wrapper.container.querySelectorAll('button');
			expect(buttons.length).toBeGreaterThan(0);
			buttons.forEach((button) => {
				expect(button).toBeDisabled();
			});
			expect(wrapper.getByTestId('pagination-jumper-input')).toBeDisabled();
		});

		it('should not emit page changes when disabled', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 1,
					total: 100,
					itemsPerPage: 10,
					disabled: true,
				},
			});

			await userEvent.click(wrapper.getByText('2'));

			expect(wrapper.emitted('update:page')).toBeFalsy();
		});

		it('should hide when hideOnSinglePage is true and only one page', () => {
			const { container } = render(Pagination, {
				props: {
					total: 10,
					itemsPerPage: 20,
					hideOnSinglePage: true,
				},
			});
			expect(container).toBeEmptyDOMElement();
		});

		it('should show when hideOnSinglePage is true but multiple pages', () => {
			const { container } = render(Pagination, {
				props: {
					total: 100,
					itemsPerPage: 20,
					hideOnSinglePage: true,
				},
			});
			expect(container).not.toBeEmptyDOMElement();
		});
	});

	describe('v-model:page', () => {
		it('should update page on page click', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 1,
					total: 100,
					itemsPerPage: 10,
				},
			});

			await userEvent.click(wrapper.getByText('2'));

			await waitFor(() => {
				expect(wrapper.emitted('update:page')?.[0]).toEqual([2]);
			});
		});

		it('should display correct current page', () => {
			const wrapper = render(Pagination, {
				props: {
					page: 3,
					total: 100,
					itemsPerPage: 10,
				},
			});

			expect(wrapper.getByText('3')).toHaveAttribute('data-selected');
		});

		it('should keep the supplied page until the parent accepts the update', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 1,
					total: 100,
					itemsPerPage: 10,
					showJumper: true,
				},
			});

			await userEvent.click(wrapper.getByText('2'));

			await waitFor(() => {
				expect(wrapper.emitted('update:page')?.[0]).toEqual([2]);
			});
			expect(wrapper.getByText('1')).toHaveAttribute('data-selected');
			expect(wrapper.getByText('2')).not.toHaveAttribute('data-selected');
			expect(wrapper.getByTestId('pagination-jumper-input')).toHaveValue('1');

			await wrapper.rerender({
				page: 2,
				total: 100,
				itemsPerPage: 10,
				showJumper: true,
			});

			expect(wrapper.getByText('2')).toHaveAttribute('data-selected');
			expect(wrapper.getByTestId('pagination-jumper-input')).toHaveValue('2');
		});

		it('should handle prev button click', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 3,
					total: 100,
					itemsPerPage: 10,
				},
			});

			await userEvent.click(wrapper.getByTestId('pagination-prev'));

			await waitFor(() => {
				expect(wrapper.emitted('update:page')?.[0]).toEqual([2]);
			});
		});

		it('should handle next button click', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 2,
					total: 100,
					itemsPerPage: 10,
				},
			});

			await userEvent.click(wrapper.getByTestId('pagination-next'));

			await waitFor(() => {
				expect(wrapper.emitted('update:page')?.[0]).toEqual([3]);
			});
		});

		it('should support uncontrolled mode via defaultPage', async () => {
			const wrapper = render(Pagination, {
				props: {
					defaultPage: 2,
					total: 100,
					itemsPerPage: 10,
				},
			});

			expect(wrapper.getByText('2')).toHaveAttribute('data-selected');

			await userEvent.click(wrapper.getByText('3'));

			await waitFor(() => {
				expect(wrapper.getByText('3')).toHaveAttribute('data-selected');
			});
		});

		it('should navigate via jumper in uncontrolled mode', async () => {
			const wrapper = render(Pagination, {
				props: {
					defaultPage: 3,
					total: 100,
					itemsPerPage: 10,
					showJumper: true,
				},
			});

			expect(wrapper.getByText('3')).toHaveAttribute('data-selected');

			const input = wrapper.getByTestId('pagination-jumper-input');
			await userEvent.clear(input);
			await userEvent.type(input, '5');
			await userEvent.tab();

			await waitFor(() => {
				expect(wrapper.getByText('5')).toHaveAttribute('data-selected');
				expect(wrapper.emitted('update:page')?.[0]).toEqual([5]);
			});
		});
	});

	describe('v-model:itemsPerPage', () => {
		it('should label page size options with a /page suffix', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 1,
					itemsPerPage: 10,
					total: 100,
				},
			});

			await userEvent.click(wrapper.getByRole('combobox'));

			await waitFor(() => {
				expect(wrapper.getByRole('option', { name: '10/page' })).toBeInTheDocument();
				expect(wrapper.getByRole('option', { name: '50/page' })).toBeInTheDocument();
			});
		});

		it('should emit update:itemsPerPage when page size changes', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 1,
					itemsPerPage: 10,
					total: 100,
				},
			});

			await userEvent.click(wrapper.getByRole('combobox'));

			await waitFor(async () => {
				await userEvent.click(wrapper.getByRole('option', { name: '20/page' }));
			});

			await waitFor(() => {
				expect(wrapper.emitted('update:itemsPerPage')?.[0]).toEqual([20]);
			});
		});

		it('should keep the supplied itemsPerPage until the parent accepts the update', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 1,
					itemsPerPage: 10,
					total: 100,
				},
			});

			await userEvent.click(wrapper.getByRole('combobox'));

			await waitFor(async () => {
				await userEvent.click(wrapper.getByRole('option', { name: '20/page' }));
			});

			await waitFor(() => {
				expect(wrapper.emitted('update:itemsPerPage')?.[0]).toEqual([20]);
			});
			expect(wrapper.getByRole('combobox')).toHaveTextContent('10/page');

			await wrapper.rerender({
				page: 1,
				itemsPerPage: 20,
				total: 100,
			});

			expect(wrapper.getByRole('combobox')).toHaveTextContent('20/page');
		});

		it('should support uncontrolled mode via defaultItemsPerPage', async () => {
			const wrapper = render(Pagination, {
				props: {
					defaultPage: 1,
					defaultItemsPerPage: 10,
					total: 100,
				},
			});

			await userEvent.click(wrapper.getByRole('combobox'));

			await waitFor(async () => {
				await userEvent.click(wrapper.getByRole('option', { name: '20/page' }));
			});

			await waitFor(() => {
				expect(wrapper.getByRole('combobox')).toHaveTextContent('20/page');
				expect(wrapper.emitted('update:itemsPerPage')?.[0]).toEqual([20]);
			});
		});

		it('should reset to page 1 when page size changes', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 3,
					itemsPerPage: 10,
					total: 100,
				},
			});

			await userEvent.click(wrapper.getByRole('combobox'));

			await waitFor(async () => {
				await userEvent.click(wrapper.getByRole('option', { name: '20/page' }));
			});

			await waitFor(() => {
				expect(wrapper.emitted('update:page')?.[0]).toEqual([1]);
			});
		});
	});

	describe('jumper', () => {
		it('should handle page jumper input', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 1,
					total: 100,
					itemsPerPage: 10,
					showJumper: true,
				},
			});

			const input = wrapper.getByTestId('pagination-jumper-input');

			await userEvent.clear(input);
			await userEvent.type(input, '5');
			await userEvent.keyboard('{Enter}');

			await waitFor(() => {
				expect(wrapper.emitted('update:page')?.[0]).toEqual([5]);
			});
		});

		it('should clamp jumper input above the last page', async () => {
			const wrapper = render(Pagination, {
				props: {
					defaultPage: 1,
					total: 100,
					itemsPerPage: 10,
					showJumper: true,
				},
			});

			const input = wrapper.getByTestId('pagination-jumper-input');

			await userEvent.clear(input);
			await userEvent.type(input, '999');
			await userEvent.keyboard('{Enter}');

			await waitFor(() => {
				expect(wrapper.emitted('update:page')?.[0]).toEqual([10]);
			});
			expect(input).toHaveValue('10');
		});

		it('should clamp jumper input below the first page', async () => {
			const wrapper = render(Pagination, {
				props: {
					defaultPage: 3,
					total: 100,
					itemsPerPage: 10,
					showJumper: true,
				},
			});

			const input = wrapper.getByTestId('pagination-jumper-input');

			await userEvent.clear(input);
			await userEvent.type(input, '0');
			await userEvent.keyboard('{Enter}');

			await waitFor(() => {
				expect(wrapper.emitted('update:page')?.[0]).toEqual([1]);
			});
			expect(input).toHaveValue('1');
		});

		it('should reset invalid jumper input to the current page without emitting', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 3,
					total: 100,
					itemsPerPage: 10,
					showJumper: true,
				},
			});

			const input = wrapper.getByTestId('pagination-jumper-input');

			await userEvent.clear(input);
			await userEvent.tab();

			await waitFor(() => {
				expect(input).toHaveValue('3');
			});
			expect(wrapper.emitted('update:page')).toBeFalsy();
		});

		it('should keep jumper aligned with the supplied page when the parent does not accept the update', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 1,
					total: 100,
					itemsPerPage: 10,
					showJumper: true,
				},
			});

			const input = wrapper.getByTestId('pagination-jumper-input');
			await userEvent.clear(input);
			await userEvent.type(input, '5');
			await userEvent.keyboard('{Enter}');

			await waitFor(() => {
				expect(wrapper.emitted('update:page')?.[0]).toEqual([5]);
			});
			expect(input).toHaveValue('1');
			expect(wrapper.getByText('1')).toHaveAttribute('data-selected');
		});

		it('should strip non-digit characters from jumper input', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 1,
					total: 100,
					itemsPerPage: 10,
					showJumper: true,
				},
			});

			const input = wrapper.getByTestId('pagination-jumper-input');
			await userEvent.clear(input);
			await userEvent.type(input, '1a2b3');

			expect(input).toHaveValue('123');
			expect(wrapper.emitted('update:page')).toBeFalsy();
		});
	});

	describe('keyboard navigation', () => {
		it('should move focus across enabled pager buttons with arrow keys', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 2,
					total: 50,
					itemsPerPage: 10,
					showTotal: false,
					showSizes: false,
					showJumper: false,
				},
			});

			wrapper.getByText('2').focus();
			expect(wrapper.getByText('2')).toHaveFocus();

			await userEvent.keyboard('{ArrowRight}');
			expect(wrapper.getByText('3')).toHaveFocus();

			await userEvent.keyboard('{ArrowLeft}');
			expect(wrapper.getByText('2')).toHaveFocus();

			await userEvent.keyboard('{ArrowLeft}');
			expect(wrapper.getByText('1')).toHaveFocus();

			await userEvent.keyboard('{ArrowLeft}');
			expect(wrapper.getByTestId('pagination-prev')).toHaveFocus();
		});

		it('should not move focus onto disabled prev or next buttons', async () => {
			const firstPage = render(Pagination, {
				props: {
					page: 1,
					total: 50,
					itemsPerPage: 10,
					showTotal: false,
					showSizes: false,
					showJumper: false,
				},
			});

			firstPage.getByText('1').focus();
			await userEvent.keyboard('{ArrowLeft}');
			expect(firstPage.getByText('1')).toHaveFocus();
			firstPage.unmount();

			const lastPage = render(Pagination, {
				props: {
					page: 5,
					total: 50,
					itemsPerPage: 10,
					showTotal: false,
					showSizes: false,
					showJumper: false,
				},
			});

			lastPage.getByText('5').focus();
			await userEvent.keyboard('{ArrowRight}');
			expect(lastPage.getByTestId('pagination-next')).not.toHaveFocus();
			expect(lastPage.getByText('5')).toHaveFocus();
		});
	});

	describe('siblingCount and showEdges', () => {
		it('should limit visible page buttons with siblingCount', () => {
			const withFew = render(Pagination, {
				props: {
					siblingCount: 1,
					total: 200,
					itemsPerPage: 10,
					page: 10,
					showEdges: true,
				},
			});
			const fewCount = withFew.queryAllByTestId('pagination-item').length;
			withFew.unmount();

			const withMany = render(Pagination, {
				props: {
					siblingCount: 3,
					total: 200,
					itemsPerPage: 10,
					page: 10,
					showEdges: true,
				},
			});
			const manyCount = withMany.queryAllByTestId('pagination-item').length;

			expect(fewCount).toBeLessThan(manyCount);
		});

		it('should omit first and last page buttons when showEdges is false', () => {
			const wrapper = render(Pagination, {
				props: {
					page: 10,
					total: 200,
					itemsPerPage: 10,
					siblingCount: 1,
					showEdges: false,
				},
			});

			const pageNumbers = wrapper
				.queryAllByTestId('pagination-item')
				.map((item) => item.textContent?.trim());

			expect(pageNumbers).not.toContain('1');
			expect(pageNumbers).not.toContain('20');
			expect(pageNumbers).toContain('10');
		});
	});

	describe('edge cases', () => {
		it('should handle zero total', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 0,
				},
			});

			expect(wrapper.getByTestId('pagination')).toBeInTheDocument();
			expect(wrapper.getByTestId('pagination-total')).toHaveTextContent('Total 0');
		});
	});

	describe('slots', () => {
		it('should render custom prev slot', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
				},
				slots: {
					prev: '<span data-test-id="custom-prev">Prev</span>',
				},
			});

			expect(wrapper.getByTestId('custom-prev')).toBeInTheDocument();
		});

		it('should render custom next slot', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
				},
				slots: {
					next: '<span data-test-id="custom-next">Next</span>',
				},
			});

			expect(wrapper.getByTestId('custom-next')).toBeInTheDocument();
		});

		it('should forward disabled to prev and next slots when pagination is disabled', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					page: 2,
					itemsPerPage: 10,
					disabled: true,
				},
				slots: {
					prev: '<template #prev="{ disabled }"><button data-test-id="custom-prev" :disabled="disabled">Prev</button></template>',
					next: '<template #next="{ disabled }"><button data-test-id="custom-next" :disabled="disabled">Next</button></template>',
				},
			});

			expect(wrapper.getByTestId('custom-prev')).toBeDisabled();
			expect(wrapper.getByTestId('custom-next')).toBeDisabled();
		});

		it('should disable prev slot on the first page and next slot on the last page', () => {
			const firstPage = render(Pagination, {
				props: {
					total: 30,
					page: 1,
					itemsPerPage: 10,
				},
				slots: {
					prev: '<template #prev="{ disabled }"><button data-test-id="custom-prev" :disabled="disabled">Prev</button></template>',
					next: '<template #next="{ disabled }"><button data-test-id="custom-next" :disabled="disabled">Next</button></template>',
				},
			});

			expect(firstPage.getByTestId('custom-prev')).toBeDisabled();
			expect(firstPage.getByTestId('custom-next')).not.toBeDisabled();
			firstPage.unmount();

			const lastPage = render(Pagination, {
				props: {
					total: 30,
					page: 3,
					itemsPerPage: 10,
				},
				slots: {
					prev: '<template #prev="{ disabled }"><button data-test-id="custom-prev" :disabled="disabled">Prev</button></template>',
					next: '<template #next="{ disabled }"><button data-test-id="custom-next" :disabled="disabled">Next</button></template>',
				},
			});

			expect(lastPage.getByTestId('custom-prev')).not.toBeDisabled();
			expect(lastPage.getByTestId('custom-next')).toBeDisabled();
		});
	});

	describe('ellipsis rendering', () => {
		it('should render ellipsis when there are many pages', () => {
			const wrapper = render(Pagination, {
				props: {
					page: 10,
					total: 200,
					itemsPerPage: 10,
					showEdges: true,
				},
			});

			expect(wrapper.container.textContent).toContain('…');
		});
	});
});
