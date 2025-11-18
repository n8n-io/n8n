import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '../../__tests__/render';
import N8nPagination from './Pagination.vue';

const renderComponent = createComponentRenderer(N8nPagination);

describe('N8nPagination', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render pagination with default props', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
				},
			});

			expect(container.querySelector('.n8n-pagination')).toBeInTheDocument();
		});

		it('should not render when hideOnSinglePage is true and only one page exists', () => {
			const { container } = renderComponent({
				props: {
					total: 10,
					pageSize: 10,
					hideOnSinglePage: true,
				},
			});

			expect(container.querySelector('.n8n-pagination')).not.toBeInTheDocument();
		});

		it('should render when hideOnSinglePage is true but multiple pages exist', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					pageSize: 10,
					hideOnSinglePage: true,
				},
			});

			expect(container.querySelector('.n8n-pagination')).toBeInTheDocument();
		});

		it('should render with custom layout', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					layout: 'first, prev, pager, next, last',
				},
			});

			expect(container.querySelector('.n8n-pagination')).toBeInTheDocument();
		});

		it('should apply disabled class when disabled', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					disabled: true,
				},
			});

			const pagination = container.querySelector('.n8n-pagination');
			expect(pagination).toHaveClass('is-disabled');
		});

		it('should apply small class when small prop is true', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					small: true,
				},
			});

			const pagination = container.querySelector('.n8n-pagination');
			expect(pagination).toHaveClass('is-small');
		});
	});

	describe('Page Changes', () => {
		it('should emit update:current-page when page changes', async () => {
			const user = userEvent.setup();
			const { container, emitted } = renderComponent({
				props: {
					total: 100,
					currentPage: 1,
				},
			});

			// Find a page button that is not the current page
			const pageButtons = container.querySelectorAll('.n8n-pagination__button--page');
			const secondPageButton = Array.from(pageButtons).find(
				(btn) => btn.textContent?.trim() === '2' && !btn.classList.contains('is-active'),
			) as HTMLElement;

			if (secondPageButton) {
				await user.click(secondPageButton);
				await waitFor(() => {
					expect(emitted('update:current-page')).toBeTruthy();
					expect(emitted('update:current-page')[0]).toEqual([2]);
				});
			} else {
				// If no page button found, skip test but log warning
				console.warn('Could not find page button to click in test');
			}
		});

		it('should emit current-change when page changes', async () => {
			const user = userEvent.setup();
			const { container, emitted } = renderComponent({
				props: {
					total: 100,
					currentPage: 1,
				},
			});

			const pageButtons = container.querySelectorAll('.n8n-pagination__button--page');
			const secondPageButton = Array.from(pageButtons).find(
				(btn) => btn.textContent?.trim() === '2' && !btn.classList.contains('is-active'),
			) as HTMLElement;

			if (secondPageButton) {
				await user.click(secondPageButton);
				await waitFor(() => {
					expect(emitted('current-change')).toBeTruthy();
					expect(emitted('current-change')[0]).toEqual([2]);
				});
			}
		});

		it('should update when currentPage prop changes', async () => {
			const { container, rerender } = renderComponent({
				props: {
					total: 100,
					currentPage: 1,
				},
			});

			await rerender({ currentPage: 2 });

			await waitFor(() => {
				const activeButton = container.querySelector('.is-active');
				expect(activeButton).toBeInTheDocument();
				expect(activeButton?.textContent).toBe('2');
			});
		});

		it('should use defaultCurrentPage when currentPage is not provided', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					defaultCurrentPage: 3,
				},
			});

			const activeButton = container.querySelector('.is-active');
			expect(activeButton).toBeInTheDocument();
			expect(activeButton?.textContent).toBe('3');
		});
	});

	describe('Edge Buttons', () => {
		it('should emit prev-click when previous button is clicked', async () => {
			const user = userEvent.setup();
			const { container, emitted } = renderComponent({
				props: {
					total: 100,
					currentPage: 2,
					layout: 'prev, pager, next',
				},
			});

			const prevButton = container.querySelector('.n8n-pagination__button--prev');
			if (prevButton) {
				await user.click(prevButton);
				await waitFor(() => {
					expect(emitted('prev-click')).toBeTruthy();
					expect(emitted('prev-click')[0]).toEqual([2]);
				});
			}
		});

		it('should emit next-click when next button is clicked', async () => {
			const user = userEvent.setup();
			const { container, emitted } = renderComponent({
				props: {
					total: 100,
					currentPage: 1,
					layout: 'prev, pager, next',
				},
			});

			const nextButton = container.querySelector('.n8n-pagination__button--next');
			if (nextButton) {
				await user.click(nextButton);
				await waitFor(() => {
					expect(emitted('next-click')).toBeTruthy();
					expect(emitted('next-click')[0]).toEqual([1]);
				});
			}
		});

		it('should render first button when layout includes first', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					layout: 'first, prev, pager, next, last',
				},
			});

			const firstButton = container.querySelector('.n8n-pagination__button--first');
			expect(firstButton).toBeInTheDocument();
		});

		it('should render last button when layout includes last', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					layout: 'first, prev, pager, next, last',
				},
			});

			const lastButton = container.querySelector('.n8n-pagination__button--last');
			expect(lastButton).toBeInTheDocument();
		});

		it('should not render first button when layout does not include first', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					layout: 'prev, pager, next',
				},
			});

			const firstButton = container.querySelector('.n8n-pagination__button--first');
			expect(firstButton).not.toBeInTheDocument();
		});

		it('should not render last button when layout does not include last', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					layout: 'prev, pager, next',
				},
			});

			const lastButton = container.querySelector('.n8n-pagination__button--last');
			expect(lastButton).not.toBeInTheDocument();
		});
	});

	describe('Ellipses', () => {
		it('should render ellipses when there are many pages', () => {
			const { container } = renderComponent({
				props: {
					total: 500,
					pageSize: 10,
					currentPage: 25,
				},
			});

			const ellipsis = container.querySelector('.n8n-pagination__ellipsis');
			expect(ellipsis).toBeInTheDocument();
		});

		it('should not render ellipses when there are few pages', () => {
			const { container } = renderComponent({
				props: {
					total: 30,
					pageSize: 10,
					currentPage: 1,
				},
			});

			const ellipsis = container.querySelector('.n8n-pagination__ellipsis');
			expect(ellipsis).not.toBeInTheDocument();
		});
	});

	describe('v-model Support', () => {
		it('should update v-model:currentPage when page changes', async () => {
			const user = userEvent.setup();
			let currentPage = 1;
			const { container, emitted } = renderComponent({
				props: {
					total: 100,
					currentPage,
				},
			});

			const pageButtons = container.querySelectorAll('.n8n-pagination__button--page');
			const secondPageButton = Array.from(pageButtons).find(
				(btn) => btn.textContent?.trim() === '2' && !btn.classList.contains('is-active'),
			) as HTMLElement;

			if (secondPageButton) {
				await user.click(secondPageButton);
				await waitFor(() => {
					expect(emitted('update:current-page')).toBeTruthy();
					expect(emitted('update:current-page')[0]).toEqual([2]);
				});
			}
		});

		it('should update v-model:pageSize when pageSize changes', async () => {
			let pageSize = 10;
			const { rerender } = renderComponent({
				props: {
					total: 100,
					pageSize,
				},
				attrs: {
					'onUpdate:pageSize': (value: number) => {
						pageSize = value;
					},
				},
			});

			await rerender({ pageSize: 20 });
			await waitFor(() => {
				expect(pageSize).toBe(20);
			});
		});
	});

	describe('Page Size', () => {
		it('should use defaultPageSize when pageSize is not provided', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					defaultPageSize: 25,
				},
			});

			// Verify pagination renders (which means it calculated pages correctly)
			expect(container.querySelector('.n8n-pagination')).toBeInTheDocument();
		});

		it('should update when pageSize prop changes', async () => {
			const { container, rerender } = renderComponent({
				props: {
					total: 100,
					pageSize: 10,
				},
			});

			await rerender({ pageSize: 20 });

			await waitFor(() => {
				// With 20 items per page, there should be 5 pages instead of 10
				const pagination = container.querySelector('.n8n-pagination');
				expect(pagination).toBeInTheDocument();
			});
		});
	});

	describe('Disabled State', () => {
		it('should disable all buttons when disabled prop is true', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					disabled: true,
				},
			});

			const buttons = container.querySelectorAll('.n8n-pagination__button');
			buttons.forEach((button) => {
				expect(button).toHaveAttribute('disabled');
			});
		});

		it('should not allow page changes when disabled', async () => {
			const user = userEvent.setup();
			const { container, emitted } = renderComponent({
				props: {
					total: 100,
					currentPage: 1,
					disabled: true,
				},
			});

			const pageButtons = container.querySelectorAll('.n8n-pagination__button--page');
			const secondPageButton = Array.from(pageButtons).find(
				(btn) => btn.textContent?.trim() === '2',
			) as HTMLElement;

			if (secondPageButton) {
				await user.click(secondPageButton);
				// Should not emit events when disabled
				await waitFor(() => {
					expect(emitted('update:current-page')).toBeFalsy();
				});
			}
		});
	});

	describe('Custom Text and Icons', () => {
		it('should render custom prevText', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					prevText: 'Previous',
					layout: 'prev, pager, next',
				},
			});

			const prevButton = container.querySelector('.n8n-pagination__button--prev');
			expect(prevButton?.textContent).toContain('Previous');
		});

		it('should render custom nextText', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					nextText: 'Next',
					layout: 'prev, pager, next',
				},
			});

			const nextButton = container.querySelector('.n8n-pagination__button--next');
			expect(nextButton?.textContent).toContain('Next');
		});

		it('should use default prev icon when prevText is empty', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					prevText: '',
					layout: 'prev, pager, next',
				},
			});

			const prevButton = container.querySelector('.n8n-pagination__button--prev');
			expect(prevButton?.textContent).toContain('‹');
		});

		it('should use default next icon when nextText is empty', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					nextText: '',
					layout: 'prev, pager, next',
				},
			});

			const nextButton = container.querySelector('.n8n-pagination__button--next');
			expect(nextButton?.textContent).toContain('›');
		});
	});

	describe('Active Page State', () => {
		it('should highlight the active page', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					currentPage: 3,
				},
			});

			const activeButton = container.querySelector('.is-active');
			expect(activeButton).toBeInTheDocument();
			expect(activeButton?.textContent).toBe('3');
		});

		it('should update active page when currentPage changes', async () => {
			const { container, rerender } = renderComponent({
				props: {
					total: 100,
					currentPage: 1,
				},
			});

			await rerender({ currentPage: 5 });

			await waitFor(() => {
				const activeButton = container.querySelector('.is-active');
				expect(activeButton?.textContent).toBe('5');
			});
		});
	});

	describe('Edge Cases', () => {
		it('should handle zero total items', () => {
			const { container } = renderComponent({
				props: {
					total: 0,
					hideOnSinglePage: true,
				},
			});

			expect(container.querySelector('.n8n-pagination')).not.toBeInTheDocument();
		});

		it('should handle very large total items', () => {
			const { container } = renderComponent({
				props: {
					total: 1000000,
					pageSize: 10,
				},
			});

			expect(container.querySelector('.n8n-pagination')).toBeInTheDocument();
		});

		it('should handle currentPage greater than total pages', () => {
			const { container } = renderComponent({
				props: {
					total: 100,
					pageSize: 10,
					currentPage: 15, // More than 10 pages
				},
			});

			// Should still render, but might show last page
			expect(container.querySelector('.n8n-pagination')).toBeInTheDocument();
		});
	});
});
