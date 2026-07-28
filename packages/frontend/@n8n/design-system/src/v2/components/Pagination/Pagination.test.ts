import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import Pagination from './Pagination.vue';

describe('v2/components/Pagination', () => {
	describe('rendering', () => {
		it('should render prev and next buttons by default', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
				},
			});
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
					pageSize: 10,
					disabled: true,
				},
			});

			const buttons = wrapper.container.querySelectorAll('button');
			expect(buttons.length).toBeGreaterThan(0);
			buttons.forEach((button) => {
				expect(button).toBeDisabled();
			});
		});

		it('should not emit page changes when disabled', async () => {
			const wrapper = render(Pagination, {
				props: {
					currentPage: 1,
					total: 100,
					pageSize: 10,
					disabled: true,
				},
			});

			await userEvent.click(wrapper.getByText('2'));

			expect(wrapper.emitted('update:currentPage')).toBeFalsy();
		});

		it('should hide when hideOnSinglePage is true and only one page', () => {
			const { container } = render(Pagination, {
				props: {
					total: 10,
					pageSize: 20,
					hideOnSinglePage: true,
				},
			});
			expect(container).toBeEmptyDOMElement();
		});

		it('should show when hideOnSinglePage is true but multiple pages', () => {
			const { container } = render(Pagination, {
				props: {
					total: 100,
					pageSize: 20,
					hideOnSinglePage: true,
				},
			});
			expect(container).not.toBeEmptyDOMElement();
		});
	});

	describe('v-model:currentPage', () => {
		it('should update currentPage on page click', async () => {
			const wrapper = render(Pagination, {
				props: {
					currentPage: 1,
					total: 100,
					pageSize: 10,
				},
			});

			await userEvent.click(wrapper.getByText('2'));

			await waitFor(() => {
				expect(wrapper.emitted('update:currentPage')?.[0]).toEqual([2]);
				expect(wrapper.emitted('update:page')?.[0]).toEqual([2]);
				expect(wrapper.emitted('current-change')?.[0]).toEqual([2]);
			});
		});

		it('should display correct current page', () => {
			const wrapper = render(Pagination, {
				props: {
					currentPage: 3,
					total: 100,
					pageSize: 10,
				},
			});

			expect(wrapper.getByText('3')).toHaveAttribute('data-selected');
		});

		it('should handle prev button click', async () => {
			const wrapper = render(Pagination, {
				props: {
					currentPage: 3,
					total: 100,
					pageSize: 10,
				},
			});

			await userEvent.click(wrapper.getByTestId('pagination-prev'));

			await waitFor(() => {
				expect(wrapper.emitted('update:currentPage')?.[0]).toEqual([2]);
				expect(wrapper.emitted('prev-click')?.[0]).toEqual([2]);
			});
		});

		it('should handle next button click', async () => {
			const wrapper = render(Pagination, {
				props: {
					currentPage: 2,
					total: 100,
					pageSize: 10,
				},
			});

			await userEvent.click(wrapper.getByTestId('pagination-next'));

			await waitFor(() => {
				expect(wrapper.emitted('update:currentPage')?.[0]).toEqual([3]);
				expect(wrapper.emitted('next-click')?.[0]).toEqual([3]);
			});
		});
	});

	describe('backward compatibility', () => {
		it('should support page prop as an alias for currentPage', () => {
			const wrapper = render(Pagination, {
				props: {
					page: 2,
					total: 100,
				},
			});

			expect(wrapper.getByText('2')).toHaveAttribute('data-selected');
		});

		it('should support itemsPerPage prop as an alias for pageSize', () => {
			const wrapper = render(Pagination, {
				props: {
					itemsPerPage: 20,
					total: 100,
					showEdges: true,
				},
			});

			expect(wrapper.getByText('5')).toBeInTheDocument();
		});

		it('should limit visible page buttons with pagerCount', () => {
			const withFew = render(Pagination, {
				props: {
					pagerCount: 3,
					total: 200,
					pageSize: 10,
					currentPage: 10,
					showEdges: true,
				},
			});
			const fewCount = withFew.queryAllByTestId('pagination-item').length;
			withFew.unmount();

			const withMany = render(Pagination, {
				props: {
					pagerCount: 7,
					total: 200,
					pageSize: 10,
					currentPage: 10,
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

		it('should handle custom prev/next text', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					prevText: 'Previous',
					nextText: 'Next',
				},
			});

			expect(wrapper.getByText('Previous')).toBeInTheDocument();
			expect(wrapper.getByText('Next')).toBeInTheDocument();
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
					currentPage: 2,
					pageSize: 10,
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
					currentPage: 1,
					pageSize: 10,
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
					currentPage: 3,
					pageSize: 10,
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
					currentPage: 10,
					total: 200,
					pageSize: 10,
					showEdges: true,
				},
			});

			expect(wrapper.container.textContent).toContain('…');
		});
	});
});
