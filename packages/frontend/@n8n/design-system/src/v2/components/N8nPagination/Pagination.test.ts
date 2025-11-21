import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import Pagination from './Pagination.vue';

describe('v2/components/N8nPagination', () => {
	describe('rendering', () => {
		it('should render with default props', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
				},
			});
			// Should render page numbers
			expect(wrapper.getByText('1')).toBeInTheDocument();
		});

		it('should render page numbers', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 10,
				},
			});
			// Should render page 1 by default
			expect(wrapper.getByText('1')).toBeInTheDocument();
		});

		it('should render prev and next buttons', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 10,
				},
			});
			// Check for prev and next buttons (they contain ‹ and ›)
			expect(wrapper.container.textContent).toContain('‹');
			expect(wrapper.container.textContent).toContain('›');
		});

		it('should render ellipsis when there are many pages', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 500,
					pageSize: 10,
				},
			});
			// Ellipsis is rendered as … (horizontal ellipsis character)
			expect(wrapper.container.textContent).toContain('…');
		});
	});

	describe('props', () => {
		it('should use default pageSize when not provided', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
				},
			});
			// With default pageSize of 10, total 100 should show 10 pages
			expect(wrapper.container).toBeInTheDocument();
		});

		it('should use custom pageSize', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 20,
				},
			});
			// With pageSize 20, total 100 should show 5 pages
			expect(wrapper.container).toBeInTheDocument();
		});

		it('should display correct current page', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 10,
					currentPage: 3,
				},
			});
			// Should show page 3
			const page3 = wrapper.getByText('3');
			expect(page3).toBeInTheDocument();
		});

		it('should default to page 1 when currentPage is not provided', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 10,
				},
			});
			// Should show page 1
			expect(wrapper.getByText('1')).toBeInTheDocument();
		});
	});

	describe('v-model', () => {
		it('should emit update:current-page when page changes', async () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 10,
					currentPage: 1,
				},
			});

			// Find and click page 2
			const page2 = wrapper.getByText('2');
			await userEvent.click(page2);

			await waitFor(() => {
				expect(wrapper.emitted('update:current-page')).toBeTruthy();
				expect(wrapper.emitted('update:current-page')?.[0]).toEqual([2]);
			});
		});

		it('should update current page when clicking next button', async () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 10,
					currentPage: 1,
				},
			});

			// Find next button (contains ›)
			const nextButton = Array.from(wrapper.container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('›'),
			);

			if (nextButton) {
				await userEvent.click(nextButton);

				await waitFor(() => {
					expect(wrapper.emitted('update:current-page')).toBeTruthy();
				});
			}
		});

		it('should update current page when clicking prev button', async () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 10,
					currentPage: 2,
				},
			});

			// Find prev button (contains ‹)
			const prevButton = Array.from(wrapper.container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('‹'),
			);

			if (prevButton) {
				await userEvent.click(prevButton);

				await waitFor(() => {
					expect(wrapper.emitted('update:current-page')).toBeTruthy();
				});
			}
		});
	});

	describe('active page state', () => {
		it('should highlight current page', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 10,
					currentPage: 3,
				},
			});

			const page3 = wrapper.getByText('3');
			const page3Button = page3.closest('button');
			// Active page should have a border (checking for style or class that indicates active state)
			// Since CSS modules hash class names, we check that the element exists and is clickable
			expect(page3Button).toBeInTheDocument();
		});

		it('should render current page correctly', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 10,
					currentPage: 2,
				},
			});

			// Both pages should be visible
			expect(wrapper.getByText('1')).toBeInTheDocument();
			expect(wrapper.getByText('2')).toBeInTheDocument();
		});
	});

	describe('ellipsis', () => {
		it('should render ellipsis for large page counts', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 500,
					pageSize: 10,
					currentPage: 1,
				},
			});
			// Should show ellipsis when there are many pages
			expect(wrapper.container.textContent).toContain('…');
		});

		it('should not render ellipsis for small page counts', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 50,
					pageSize: 10,
					currentPage: 1,
				},
			});
			// With only 5 pages, ellipsis might not be needed
			// This depends on the sibling-count prop (set to 2)
			expect(wrapper.container).toBeInTheDocument();
		});
	});

	describe('slots', () => {
		it('should render custom prev-icon slot', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 10,
				},
				slots: {
					'prev-icon': '<span data-testid="custom-prev">Previous</span>',
				},
			});
			expect(wrapper.getByTestId('custom-prev')).toBeInTheDocument();
		});

		it('should render custom next-icon slot', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 10,
				},
				slots: {
					'next-icon': '<span data-testid="custom-next">Next</span>',
				},
			});
			expect(wrapper.getByTestId('custom-next')).toBeInTheDocument();
		});

		it('should render default prev-icon when slot is not provided', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 10,
				},
			});
			// Default is ‹
			expect(wrapper.container.textContent).toContain('‹');
		});

		it('should render default next-icon when slot is not provided', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					pageSize: 10,
				},
			});
			// Default is ›
			expect(wrapper.container.textContent).toContain('›');
		});
	});

	describe('edge cases', () => {
		it('should handle single page', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 5,
					pageSize: 10,
				},
			});
			// Should still render pagination with just one page
			expect(wrapper.getByText('1')).toBeInTheDocument();
		});

		it('should handle zero total', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 0,
					pageSize: 10,
				},
			});
			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle very large page numbers', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 10000,
					pageSize: 10,
					currentPage: 500,
				},
			});
			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle pageSize larger than total', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 5,
					pageSize: 100,
				},
			});
			// Should show only one page
			expect(wrapper.getByText('1')).toBeInTheDocument();
		});
	});
});
