import { createComponentRenderer } from '@/__tests__/render';
import McpAccessToggle from './McpAccessToggle.vue';
import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

const renderComponent = createComponentRenderer(McpAccessToggle);

let pinia: ReturnType<typeof createPinia>;

describe('McpAccessToggle', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	describe('Component rendering', () => {
		it('should handle modelValue and disabled prop combinations correctly', () => {
			// Test modelValue=true, disabled=true
			{
				const { getByTestId, unmount } = renderComponent({
					pinia,
					props: { modelValue: true, disabled: true },
				});
				const toggle = getByTestId('mcp-access-toggle');
				expect(toggle).toHaveClass('is-checked');
				expect(toggle).toHaveClass('is-disabled');
				unmount();
			}

			// Test modelValue=true, disabled=false
			{
				const { getByTestId, unmount } = renderComponent({
					pinia,
					props: { modelValue: true, disabled: false },
				});
				const toggle = getByTestId('mcp-access-toggle');
				expect(toggle).toHaveClass('is-checked');
				expect(toggle).not.toHaveClass('is-disabled');
				unmount();
			}

			// Test modelValue=false, disabled=true
			{
				const { getByTestId, unmount } = renderComponent({
					pinia,
					props: { modelValue: false, disabled: true },
				});
				const toggle = getByTestId('mcp-access-toggle');
				expect(toggle).not.toHaveClass('is-checked');
				expect(toggle).toHaveClass('is-disabled');
				unmount();
			}

			// Test modelValue=false, disabled=false
			{
				const { getByTestId, unmount } = renderComponent({
					pinia,
					props: { modelValue: false, disabled: false },
				});
				const toggle = getByTestId('mcp-access-toggle');
				expect(toggle).not.toHaveClass('is-checked');
				expect(toggle).not.toHaveClass('is-disabled');
				unmount();
			}
		});

		it('should handle loading prop correctly', () => {
			const { getByTestId, unmount: unmount1 } = renderComponent({
				pinia,
				props: { modelValue: false, loading: true },
			});
			expect(getByTestId('mcp-access-toggle')).toBeInTheDocument();
			unmount1();

			const { getByTestId: getByTestId2, unmount: unmount2 } = renderComponent({
				pinia,
				props: { modelValue: false, loading: false },
			});
			expect(getByTestId2('mcp-access-toggle')).toBeInTheDocument();
			unmount2();
		});
	});

	describe('Disabled state', () => {
		it('should render as disabled when disabled prop is true', () => {
			const { getByTestId } = renderComponent({
				pinia,
				props: {
					modelValue: false,
					disabled: true,
				},
			});

			const toggle = getByTestId('mcp-access-toggle');
			expect(toggle).toHaveClass('is-disabled');
		});

		it('should render as enabled when disabled prop is false', () => {
			const { getByTestId } = renderComponent({
				pinia,
				props: {
					modelValue: false,
					disabled: false,
				},
			});

			const toggle = getByTestId('mcp-access-toggle');
			expect(toggle).not.toHaveClass('is-disabled');
		});

		it('should show tooltip when disabled', async () => {
			const { container, queryByRole } = renderComponent({
				pinia,
				props: {
					modelValue: false,
					disabled: true,
				},
			});

			const tooltipTrigger = container.querySelector('.el-tooltip__trigger');
			expect(tooltipTrigger).toBeInTheDocument();

			await userEvent.hover(tooltipTrigger!);
			await waitFor(() => {
				const tooltip = queryByRole('tooltip');
				expect(tooltip).toBeInTheDocument();
				expect(tooltip).toHaveTextContent('Only instance admins can change this');
			});
		});

		it('should not show tooltip when enabled', async () => {
			const { container, queryByRole } = renderComponent({
				pinia,
				props: {
					modelValue: false,
					disabled: false,
				},
			});

			const tooltipTrigger = container.querySelector('.el-tooltip__trigger');
			expect(tooltipTrigger).toBeInTheDocument();

			await userEvent.hover(tooltipTrigger!);

			expect(queryByRole('tooltip')).not.toBeInTheDocument();
		});
	});

	describe('Event emissions', () => {
		it('should emit toggleMcpAccess event with true when toggled on', async () => {
			const { getByTestId, emitted } = renderComponent({
				pinia,
				props: {
					modelValue: false,
				},
			});

			const toggle = getByTestId('mcp-access-toggle');
			await userEvent.click(toggle);

			expect(emitted()).toHaveProperty('toggleMcpAccess');
			expect(emitted().toggleMcpAccess).toHaveLength(1);
			expect(emitted().toggleMcpAccess[0]).toEqual([true]);
		});

		it('should emit toggleMcpAccess event with false when toggled off', async () => {
			const { getByTestId, emitted } = renderComponent({
				pinia,
				props: {
					modelValue: true,
				},
			});

			const toggle = getByTestId('mcp-access-toggle');
			await userEvent.click(toggle);

			expect(emitted()).toHaveProperty('toggleMcpAccess');
			expect(emitted().toggleMcpAccess).toHaveLength(1);
			expect(emitted().toggleMcpAccess[0]).toEqual([false]);
		});

		it('should not emit event when disabled', async () => {
			const { getByTestId, emitted } = renderComponent({
				pinia,
				props: {
					modelValue: false,
					disabled: true,
				},
			});

			const toggle = getByTestId('mcp-access-toggle');
			await userEvent.click(toggle);

			expect(emitted()).not.toHaveProperty('toggleMcpAccess');
		});
	});
});
