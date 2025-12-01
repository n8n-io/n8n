import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import Pagination from './Pagination.vue';

describe('v2/components/Pagination', () => {
	describe('rendering', () => {
		it('should render with default props', () => {
			const { container } = render(Pagination, {
				props: {
					total: 100,
				},
			});
			expect(container).not.toBeEmptyDOMElement();
		});

		it('should render prev and next buttons by default', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
				},
			});
			const buttons = wrapper.container.querySelectorAll('button');
			expect(buttons.length).toBeGreaterThan(0);
		});

		it('should render disabled state', () => {
			const { container } = render(Pagination, {
				props: {
					total: 100,
					disabled: true,
				},
			});
			expect(container).not.toBeEmptyDOMElement();
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

	describe('sizes', () => {
		test.each([
			[undefined, 'Small'],
			['small' as const, 'Small'],
			['medium' as const, 'Medium'],
		])('size %s should apply %s class', (size, expected) => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					size,
				},
			});
			const container = wrapper.container.firstChild as HTMLElement;
			expect(container?.className).toContain(expected);
		});
	});

	describe('variants', () => {
		test.each([
			[undefined, 'Default'],
			['default' as const, 'Default'],
			['ghost' as const, 'Ghost'],
		])('variant %s should apply %s class', (variant, expected) => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					variant,
				},
			});
			const container = wrapper.container.firstChild as HTMLElement;
			expect(container?.className).toContain(expected);
		});

		it('should apply background class when background prop is true', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					background: true,
				},
			});
			const container = wrapper.container.firstChild as HTMLElement;
			expect(container?.className).toContain('Background');
		});
	});

	describe('layout', () => {
		it('should render only prev and next when layout is "prev, next"', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					layout: 'prev, next',
				},
			});
			// Should not render page numbers
			const pageButtons = wrapper.container.querySelectorAll('[data-index]');
			expect(pageButtons.length).toBe(0);
		});

		it('should render total count when layout includes "total"', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					layout: 'total, prev, pager, next',
				},
			});
			expect(wrapper.getByText('Total 100')).toBeInTheDocument();
		});

		it('should render page size selector when layout includes "sizes"', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					layout: 'sizes, prev, pager, next',
				},
			});
			// Look for the select component
			const select = wrapper.container.querySelector('[role="combobox"]');
			expect(select).toBeInTheDocument();
		});

		it('should render jumper when layout includes "jumper"', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 100,
					layout: 'prev, pager, next, jumper',
				},
			});
			expect(wrapper.getByText('Go to')).toBeInTheDocument();
			expect(wrapper.container.querySelector('input[type="number"]')).toBeInTheDocument();
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

			// Find and click page 2 button
			const page2Button = wrapper.getByText('2');
			await userEvent.click(page2Button);

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

			const page3Button = wrapper.getByText('3');
			expect(page3Button).toHaveAttribute('data-selected');
		});

		it('should handle prev button click', async () => {
			const wrapper = render(Pagination, {
				props: {
					currentPage: 3,
					total: 100,
					pageSize: 10,
				},
			});

			// Get all buttons and find the first one (prev button)
			const buttons = wrapper.container.querySelectorAll('button');
			const prevButton = buttons[0];
			expect(prevButton).toBeInTheDocument();

			await userEvent.click(prevButton);

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

			// Get all buttons and find the last one (next button)
			const buttons = wrapper.container.querySelectorAll('button');
			const nextButton = buttons[buttons.length - 1];
			expect(nextButton).toBeInTheDocument();

			await userEvent.click(nextButton);

			await waitFor(() => {
				expect(wrapper.emitted('update:currentPage')?.[0]).toEqual([3]);
				expect(wrapper.emitted('next-click')?.[0]).toEqual([3]);
			});
		});
	});

	describe('v-model:pageSize', () => {
		it('should emit update:pageSize when page size changes', async () => {
			const wrapper = render(Pagination, {
				props: {
					currentPage: 1,
					pageSize: 10,
					total: 100,
					layout: 'sizes, prev, pager, next',
				},
			});

			const select = wrapper.container.querySelector('[role="combobox"]');
			expect(select).toBeInTheDocument();

			await userEvent.click(select!);

			// Wait for dropdown to open and click an option
			await waitFor(async () => {
				const option20 = wrapper.getByText('20 / page');
				await userEvent.click(option20);
			});

			await waitFor(() => {
				expect(wrapper.emitted('update:pageSize')?.[0]).toEqual([20]);
				expect(wrapper.emitted('size-change')?.[0]).toEqual([20]);
			});
		});

		it('should reset to page 1 when page size changes', async () => {
			const wrapper = render(Pagination, {
				props: {
					currentPage: 3,
					pageSize: 10,
					total: 100,
					layout: 'sizes, prev, pager, next',
				},
			});

			const select = wrapper.container.querySelector('[role="combobox"]');
			expect(select).toBeInTheDocument();

			await userEvent.click(select!);

			await waitFor(async () => {
				const option20 = wrapper.getByText('20 / page');
				await userEvent.click(option20);
			});

			await waitFor(() => {
				// When page size changes, component emits update:currentPage with value 1 to reset
				expect(wrapper.emitted('update:currentPage')?.[0]).toEqual([1]);
			});
		});
	});

	describe('backward compatibility', () => {
		it('should support currentPage prop (camelCase)', () => {
			const wrapper = render(Pagination, {
				props: {
					currentPage: 2,
					total: 100,
				},
			});

			const page2Button = wrapper.getByText('2');
			expect(page2Button).toHaveAttribute('data-selected');
		});

		it('should support page prop', () => {
			const wrapper = render(Pagination, {
				props: {
					page: 2,
					total: 100,
				},
			});

			const page2Button = wrapper.getByText('2');
			expect(page2Button).toHaveAttribute('data-selected');
		});

		it('should support pageSize prop (camelCase)', () => {
			const wrapper = render(Pagination, {
				props: {
					pageSize: 20,
					total: 100,
					showEdges: true,
				},
			});

			// Should have 5 pages (100 / 20)
			expect(wrapper.getByText('5')).toBeInTheDocument();
		});

		it('should support itemsPerPage prop', () => {
			const wrapper = render(Pagination, {
				props: {
					itemsPerPage: 20,
					total: 100,
					showEdges: true,
				},
			});

			// Should have 5 pages (100 / 20)
			expect(wrapper.getByText('5')).toBeInTheDocument();
		});

		it('should support pagerCount prop', () => {
			const wrapper = render(Pagination, {
				props: {
					pagerCount: 5,
					total: 200,
					currentPage: 10,
				},
			});

			// With pagerCount 5, should show 2 siblings on each side
			// The component should exist
			expect(wrapper.container.querySelector('.n8n-pagination')).toBeInTheDocument();
		});

		it('should emit both update:currentPage and current-change events', async () => {
			const wrapper = render(Pagination, {
				props: {
					currentPage: 1,
					total: 100,
				},
			});

			const page2Button = wrapper.getByText('2');
			await userEvent.click(page2Button);

			await waitFor(() => {
				expect(wrapper.emitted('update:currentPage')).toBeTruthy();
				expect(wrapper.emitted('current-change')).toBeTruthy();
			});
		});
	});

	describe('edge cases', () => {
		it('should handle zero total', () => {
			const wrapper = render(Pagination, {
				props: {
					total: 0,
				},
			});

			// Should render but with no page buttons
			expect(wrapper.container.querySelector('.n8n-pagination')).toBeInTheDocument();
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

		it('should handle page jumper input', async () => {
			const wrapper = render(Pagination, {
				props: {
					currentPage: 1,
					total: 100,
					layout: 'prev, pager, next, jumper',
				},
			});

			const input = wrapper.container.querySelector('input[type="number"]');
			expect(input).toBeInTheDocument();

			await userEvent.type(input!, '5');
			await userEvent.keyboard('{Enter}');

			await waitFor(() => {
				expect(wrapper.emitted('update:currentPage')?.[0]).toEqual([5]);
			});
		});

		it('should not jump to invalid page number', async () => {
			const wrapper = render(Pagination, {
				props: {
					currentPage: 1,
					total: 100,
					pageSize: 10,
					layout: 'prev, pager, next, jumper',
				},
			});

			const input = wrapper.container.querySelector('input[type="number"]');
			expect(input).toBeInTheDocument();

			await userEvent.type(input!, '999');
			await userEvent.keyboard('{Enter}');

			// Should not emit any update since 999 is out of range
			expect(wrapper.emitted('update:currentPage')).toBeFalsy();
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

			// Ellipsis should be present as visual indicator
			expect(wrapper.container.textContent).toContain('…');
		});

		it('should render ellipsis with correct styling', () => {
			const wrapper = render(Pagination, {
				props: {
					currentPage: 5,
					total: 200,
					pageSize: 10,
					showEdges: true,
				},
			});

			// Find ellipsis elements
			const ellipsisElements = Array.from(wrapper.container.querySelectorAll('*')).filter(
				(el) => el.textContent === '…',
			);

			expect(ellipsisElements.length).toBeGreaterThan(0);
		});
	});
});
