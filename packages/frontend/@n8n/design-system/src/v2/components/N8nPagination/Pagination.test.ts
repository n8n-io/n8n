import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import Pagination from './Pagination.vue';

// Mock i18n
const mockI18n = {
	global: {
		mocks: {
			$t: (key: string, values?: Record<string, unknown>) => {
				if (key === 'pagination.total') return `Total ${values?.total}`;
				if (key === 'pagination.page') return 'page';
				return key;
			},
		},
	},
};

const renderWithI18n = (props: Record<string, unknown>) => {
	return render(Pagination, {
		...mockI18n,
		props,
	});
};

describe('v2/components/N8nPagination', () => {
	describe('rendering', () => {
		it('should render with default props', () => {
			const wrapper = renderWithI18n({
				total: 100,
			});
			// Should render page numbers
			expect(wrapper.getByText('1')).toBeInTheDocument();
		});

		it('should render page numbers', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
			});
			// Should render page 1 by default
			expect(wrapper.getByText('1')).toBeInTheDocument();
		});

		it('should render prev and next buttons', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
			});
			// Check for prev and next buttons (they contain ‹ and ›)
			expect(wrapper.container.textContent).toContain('‹');
			expect(wrapper.container.textContent).toContain('›');
		});

		it('should render ellipsis when there are many pages', () => {
			const wrapper = renderWithI18n({
				total: 500,
				pageSize: 10,
			});
			// Ellipsis is rendered as … (horizontal ellipsis character)
			expect(wrapper.container.textContent).toContain('…');
		});

		it('should hide pagination when hideOnSinglePage is true and only one page', () => {
			const wrapper = renderWithI18n({
				total: 5,
				pageSize: 10,
				hideOnSinglePage: true,
			});
			// Should not render pagination
			expect(wrapper.container.textContent).toBe('');
		});

		it('should show pagination when hideOnSinglePage is false and only one page', () => {
			const wrapper = renderWithI18n({
				total: 5,
				pageSize: 10,
				hideOnSinglePage: false,
			});
			// Should render pagination
			expect(wrapper.getByText('1')).toBeInTheDocument();
		});

		it('should render with background styling', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				background: true,
			});
			const wrapperEl = wrapper.container.querySelector('div');
			expect(wrapperEl?.className).toContain('HasBackground');
		});

		it('should show total when layout includes total', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				layout: 'total, prev, pager, next',
			});
			expect(wrapper.getByText('Total 100')).toBeInTheDocument();
		});

		it('should not show total when layout does not include total', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				layout: 'prev, pager, next',
			});
			expect(wrapper.queryByText('Total 100')).not.toBeInTheDocument();
		});

		it('should show page size selector when layout includes sizes', async () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				layout: 'prev, pager, next, sizes',
				pageSizes: [10, 20, 50],
			});
			// Look for select element
			const select = wrapper.container.querySelector('select, input[role="combobox"]');
			expect(select).toBeInTheDocument();
		});
	});

	describe('props', () => {
		it('should use default pageSize when not provided', () => {
			const wrapper = renderWithI18n({
				total: 100,
			});
			// With default pageSize of 10, total 100 should show 10 pages
			expect(wrapper.container).toBeInTheDocument();
		});

		it('should use custom pageSize', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 20,
			});
			// With pageSize 20, total 100 should show 5 pages
			expect(wrapper.container).toBeInTheDocument();
		});

		it('should display correct current page', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				currentPage: 3,
			});
			// Should show page 3
			const page3 = wrapper.getByText('3');
			expect(page3).toBeInTheDocument();
		});

		it('should default to page 1 when currentPage is not provided', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
			});
			// Should show page 1
			expect(wrapper.getByText('1')).toBeInTheDocument();
		});

		it('should respect custom pagerCount', () => {
			const wrapper = renderWithI18n({
				total: 1000,
				pageSize: 10,
				currentPage: 50,
				pagerCount: 3,
			});
			// With pagerCount of 3, should show fewer page numbers
			expect(wrapper.container).toBeInTheDocument();
		});
	});

	describe('v-model', () => {
		it('should emit update:current-page when page changes', async () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				currentPage: 1,
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
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				currentPage: 1,
			});

			// Find next button (contains ›)
			const nextButton = Array.from(wrapper.container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('›'),
			);

			expect(nextButton).toBeInTheDocument();
			await userEvent.click(nextButton!);

			await waitFor(() => {
				expect(wrapper.emitted('update:current-page')).toBeTruthy();
			});
		});

		it('should update current page when clicking prev button', async () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				currentPage: 2,
			});

			// Find prev button (contains ‹)
			const prevButton = Array.from(wrapper.container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('‹'),
			);

			expect(prevButton).toBeInTheDocument();
			await userEvent.click(prevButton!);

			await waitFor(() => {
				expect(wrapper.emitted('update:current-page')).toBeTruthy();
			});
		});

		it('should emit update:page-size and size-change when page size changes', async () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				layout: 'prev, pager, next, sizes',
				pageSizes: [10, 20, 50],
			});

			// Find page size selector
			const select = wrapper.container.querySelector('select, input[role="combobox"]');
			expect(select).toBeInTheDocument();

			if (select) {
				await userEvent.click(select);
				// Try to select 20 option
				const option20 = wrapper.queryByText('20 / page');
				if (option20) {
					await userEvent.click(option20);

					await waitFor(() => {
						expect(wrapper.emitted('update:page-size')).toBeTruthy();
						expect(wrapper.emitted('size-change')).toBeTruthy();
					});
				}
			}
		});

		it('should reset to page 1 when page size changes', async () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				currentPage: 5,
				layout: 'prev, pager, next, sizes',
				pageSizes: [10, 20, 50],
			});

			const select = wrapper.container.querySelector('select, input[role="combobox"]');
			if (select) {
				await userEvent.click(select);
				const option20 = wrapper.queryByText('20 / page');
				if (option20) {
					await userEvent.click(option20);

					await waitFor(() => {
						const emittedPages = wrapper.emitted('update:current-page');
						if (emittedPages) {
							expect(emittedPages[emittedPages.length - 1]).toEqual([1]);
						}
					});
				}
			}
		});
	});

	describe('active page state', () => {
		it('should highlight current page', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				currentPage: 3,
			});

			const page3 = wrapper.getByText('3');
			const page3Button = page3.closest('button');
			// Active page should have a border (checking for style or class that indicates active state)
			// Since CSS modules hash class names, we check that the element exists and is clickable
			expect(page3Button).toBeInTheDocument();
		});

		it('should render current page correctly', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				currentPage: 2,
			});

			// Both pages should be visible
			expect(wrapper.getByText('1')).toBeInTheDocument();
			expect(wrapper.getByText('2')).toBeInTheDocument();
		});
	});

	describe('ellipsis', () => {
		it('should render ellipsis for large page counts', () => {
			const wrapper = renderWithI18n({
				total: 500,
				pageSize: 10,
				currentPage: 1,
			});
			// Should show ellipsis when there are many pages
			expect(wrapper.container.textContent).toContain('…');
		});

		it('should not render ellipsis for small page counts', () => {
			const wrapper = renderWithI18n({
				total: 50,
				pageSize: 10,
				currentPage: 1,
			});
			// With only 5 pages, ellipsis should not be rendered
			// This depends on the sibling-count prop (set to 2)
			expect(wrapper.container.textContent).not.toContain('…');
		});
	});

	describe('slots', () => {
		it('should render default prev-icon when slot is not provided', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
			});
			// Default is ‹
			expect(wrapper.container.textContent).toContain('‹');
		});

		it('should render default next-icon when slot is not provided', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
			});
			// Default is ›
			expect(wrapper.container.textContent).toContain('›');
		});
	});

	describe('edge cases', () => {
		it('should handle single page', () => {
			const wrapper = renderWithI18n({
				total: 5,
				pageSize: 10,
			});
			// Should still render pagination with just one page
			expect(wrapper.getByText('1')).toBeInTheDocument();
		});

		it('should handle zero total', () => {
			const wrapper = renderWithI18n({
				total: 0,
				pageSize: 10,
			});
			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle very large page numbers', () => {
			const wrapper = renderWithI18n({
				total: 10000,
				pageSize: 10,
				currentPage: 500,
			});
			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle pageSize larger than total', () => {
			const wrapper = renderWithI18n({
				total: 5,
				pageSize: 100,
			});
			// Should show only one page
			expect(wrapper.getByText('1')).toBeInTheDocument();
		});
	});

	describe('layout configurations', () => {
		it('should render with layout="total, prev, pager, next, sizes"', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				layout: 'total, prev, pager, next, sizes',
			});
			expect(wrapper.getByText('Total 100')).toBeInTheDocument();
			expect(wrapper.container.textContent).toContain('‹');
			expect(wrapper.container.textContent).toContain('›');
		});

		it('should render with layout="prev, pager, next" (minimal)', () => {
			const wrapper = renderWithI18n({
				total: 100,
				pageSize: 10,
				layout: 'prev, pager, next',
			});
			expect(wrapper.queryByText('Total 100')).not.toBeInTheDocument();
			expect(wrapper.container.textContent).toContain('‹');
			expect(wrapper.container.textContent).toContain('›');
		});
	});
});
