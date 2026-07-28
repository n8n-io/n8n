import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import Pagination from './Pagination.vue';

describe('v2/components/Pagination', () => {
	describe('rendering', () => {
		it('should render prev, next, total, sizes, and jumper by default', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
				},
			});
			expect(wrapper.getByTestId('pagination-prev')).toBeInTheDocument();
			expect(wrapper.getByTestId('pagination-next')).toBeInTheDocument();
			expect(wrapper.getByTestId('pagination-total')).toHaveTextContent('Total 100');
			expect(wrapper.getByTestId('pagination-sizes')).toBeInTheDocument();
			expect(wrapper.getByTestId('pagination-jumper')).toBeInTheDocument();
			expect(wrapper.getByTestId('pagination-jumper-input')).toHaveValue(1);
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
	});

	describe('v-model:itemsPerPage', () => {
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
				await userEvent.click(wrapper.getByRole('option', { name: '20' }));
			});

			await waitFor(() => {
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
				await userEvent.click(wrapper.getByRole('option', { name: '20' }));
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

		it('should clamp jumper input to the nearest valid page', async () => {
			const wrapper = render(Pagination, {
				props: {
					page: 1,
					total: 100,
					itemsPerPage: 10,
				},
			});

			const input = wrapper.getByTestId('pagination-jumper-input');

			await userEvent.clear(input);
			await userEvent.type(input, '999');
			await userEvent.keyboard('{Enter}');

			await waitFor(() => {
				expect(wrapper.emitted('update:page')?.[0]).toEqual([10]);
			});
			expect(input).toHaveValue(10);
		});
	});

	describe('siblingCount', () => {
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
	});

	describe('edge cases', () => {
		it('should handle zero total', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 0,
				},
			});

			expect(wrapper.getByTestId('pagination')).toBeInTheDocument();
		});

		it('should calculate pages from pageCount prop', () => {
			const wrapper = render(Pagination, {
				props: {
					pageCount: 5,
					itemsPerPage: 10,
					showEdges: true,
				},
			});

			expect(wrapper.getByText('5')).toBeInTheDocument();
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
					prev: `<template #prev="{ disabled }"><button data-test-id="custom-prev" :disabled="disabled">Prev</button></template>`,
					next: `<template #next="{ disabled }"><button data-test-id="custom-next" :disabled="disabled">Next</button></template>`,
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
					prev: `<template #prev="{ disabled }"><button data-test-id="custom-prev" :disabled="disabled">Prev</button></template>`,
					next: `<template #next="{ disabled }"><button data-test-id="custom-next" :disabled="disabled">Next</button></template>`,
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
					prev: `<template #prev="{ disabled }"><button data-test-id="custom-prev" :disabled="disabled">Prev</button></template>`,
					next: `<template #next="{ disabled }"><button data-test-id="custom-next" :disabled="disabled">Next</button></template>`,
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
