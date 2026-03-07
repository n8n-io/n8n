import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { ref } from 'vue';

import { N8nAlertDialog } from './index';

// Helper to render AlertDialog with controlled state (matching N8nDialog pattern)
const renderAlertDialog = (
	props: Record<string, unknown> = {},
	options: { defaultOpen?: boolean; withSlotContent?: boolean } = {},
) => {
	return render({
		components: {
			N8nAlertDialog,
		},
		setup() {
			const isOpen = ref(options.defaultOpen ?? false);
			return { props, isOpen, withSlotContent: options.withSlotContent };
		},
		template: `
			<button data-test-id="alert-trigger" @click="isOpen = true">Open Alert</button>
			<N8nAlertDialog v-model:open="isOpen" v-bind="props">
				<div v-if="withSlotContent" data-test-id="slot-content">Custom slot content</div>
			</N8nAlertDialog>
		`,
	});
};

describe('N8nAlertDialog', () => {
	describe('AlertDialog-specific features', () => {
		it('should NOT have close button (uses cancel button instead)', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByLabelText } = renderAlertDialog({
				title: 'Alert Title',
			});

			await user.click(getByTestId('alert-trigger'));

			expect(queryByLabelText('Close dialog')).not.toBeInTheDocument();
		});

		it('should have both Cancel and action buttons in footer', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByRole } = renderAlertDialog({
				title: 'Alert Title',
			});

			await user.click(getByTestId('alert-trigger'));

			expect(getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
			expect(getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
		});
	});

	describe('events', () => {
		it('should emit action event when action button is clicked', async () => {
			const user = userEvent.setup();
			const actionHandler = vi.fn();

			const { getByTestId, getByRole } = render({
				components: { N8nAlertDialog },
				setup() {
					const isOpen = ref(false);
					return { isOpen, actionHandler };
				},
				template: `
					<button data-test-id="alert-trigger" @click="isOpen = true">Open</button>
					<N8nAlertDialog v-model:open="isOpen" title="Confirm?" @action="actionHandler" />
				`,
			});

			await user.click(getByTestId('alert-trigger'));
			await user.click(getByRole('button', { name: 'Confirm' }));

			expect(actionHandler).toHaveBeenCalledTimes(1);
		});

		it('should emit cancel event and close when cancel button is clicked', async () => {
			const user = userEvent.setup();
			const cancelHandler = vi.fn();

			const { getByTestId, getByRole, queryByRole } = render({
				components: { N8nAlertDialog },
				setup() {
					const isOpen = ref(false);
					return { isOpen, cancelHandler };
				},
				template: `
					<button data-test-id="alert-trigger" @click="isOpen = true">Open</button>
					<N8nAlertDialog v-model:open="isOpen" title="Confirm?" @cancel="cancelHandler" />
				`,
			});

			await user.click(getByTestId('alert-trigger'));
			await user.click(getByRole('button', { name: 'Cancel' }));

			expect(cancelHandler).toHaveBeenCalledTimes(1);

			await waitFor(() => {
				expect(queryByRole('dialog')).not.toBeInTheDocument();
			});
		});

		it('should emit update:open when dialog state changes', async () => {
			const user = userEvent.setup();
			const updateOpenHandler = vi.fn();

			const { getByTestId, getByRole } = render({
				components: { N8nAlertDialog },
				setup() {
					const isOpen = ref(false);
					const handleUpdateOpen = (value: boolean) => {
						isOpen.value = value;
						updateOpenHandler(value);
					};
					return { isOpen, handleUpdateOpen };
				},
				template: `
					<button data-test-id="alert-trigger" @click="isOpen = true">Open</button>
					<N8nAlertDialog :open="isOpen" @update:open="handleUpdateOpen" title="Confirm?" />
				`,
			});

			await user.click(getByTestId('alert-trigger'));
			// Dialog opened via external trigger, not through dialog's update:open

			await user.click(getByRole('button', { name: 'Cancel' }));
			expect(updateOpenHandler).toHaveBeenCalledWith(false);
		});
	});

	describe('props', () => {
		describe('title', () => {
			it('should render the title text', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByText } = renderAlertDialog({
					title: 'Are you sure?',
				});

				await user.click(getByTestId('alert-trigger'));

				expect(getByText('Are you sure?')).toBeInTheDocument();
			});
		});

		describe('description', () => {
			it('should render description when provided', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByText } = renderAlertDialog({
					title: 'Delete item?',
					description: 'This action cannot be undone.',
				});

				await user.click(getByTestId('alert-trigger'));

				expect(getByText('This action cannot be undone.')).toBeInTheDocument();
			});

			it('should NOT render description element when not provided', async () => {
				const user = userEvent.setup();
				const { getByTestId, container } = renderAlertDialog({
					title: 'Simple alert',
				});

				await user.click(getByTestId('alert-trigger'));

				// Verify there's no description paragraph in the header
				const descriptionElement = container.querySelector('.description');
				expect(descriptionElement).not.toBeInTheDocument();
			});
		});

		describe('actionLabel', () => {
			it('should default to "Confirm"', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByRole } = renderAlertDialog({
					title: 'Confirm?',
				});

				await user.click(getByTestId('alert-trigger'));

				expect(getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
			});

			it('should use custom action label', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByRole } = renderAlertDialog({
					title: 'Delete?',
					actionLabel: 'Delete permanently',
				});

				await user.click(getByTestId('alert-trigger'));

				expect(getByRole('button', { name: 'Delete permanently' })).toBeInTheDocument();
			});
		});

		describe('cancelLabel', () => {
			it('should default to "Cancel"', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByRole } = renderAlertDialog({
					title: 'Confirm?',
				});

				await user.click(getByTestId('alert-trigger'));

				expect(getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
			});

			it('should use custom cancel label', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByRole } = renderAlertDialog({
					title: 'Confirm?',
					cancelLabel: 'Never mind',
				});

				await user.click(getByTestId('alert-trigger'));

				expect(getByRole('button', { name: 'Never mind' })).toBeInTheDocument();
			});
		});

		describe('actionVariant', () => {
			it('should default to solid variant', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByRole } = renderAlertDialog({
					title: 'Save?',
				});

				await user.click(getByTestId('alert-trigger'));

				const actionButton = getByRole('button', { name: 'Confirm' });
				expect(actionButton.className).toContain('solid');
			});

			it('should apply destructive variant', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByRole } = renderAlertDialog({
					title: 'Delete?',
					actionVariant: 'destructive',
				});

				await user.click(getByTestId('alert-trigger'));

				const actionButton = getByRole('button', { name: 'Confirm' });
				expect(actionButton.className).toContain('destructive');
			});
		});

		describe('loading', () => {
			it('should show loading state on action button', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByRole } = renderAlertDialog({
					title: 'Processing...',
					loading: true,
				});

				await user.click(getByTestId('alert-trigger'));

				const actionButton = getByRole('button', { name: 'Confirm' });
				expect(actionButton).toHaveAttribute('disabled');
			});

			it('should NOT disable cancel button when loading', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByRole } = renderAlertDialog({
					title: 'Processing...',
					loading: true,
				});

				await user.click(getByTestId('alert-trigger'));

				const cancelButton = getByRole('button', { name: 'Cancel' });
				expect(cancelButton).not.toHaveAttribute('disabled');
			});
		});

		describe('size', () => {
			it('should default to small size', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByRole } = renderAlertDialog({
					title: 'Small dialog',
				});

				await user.click(getByTestId('alert-trigger'));

				const dialog = getByRole('dialog');
				expect(dialog.className).toContain('small');
			});

			it('should apply medium size', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByRole } = renderAlertDialog({
					title: 'Medium dialog',
					size: 'medium',
				});

				await user.click(getByTestId('alert-trigger'));

				const dialog = getByRole('dialog');
				expect(dialog.className).toContain('medium');
			});
		});

		describe('controlled state', () => {
			it('should support controlled open state via v-model:open', async () => {
				const { queryByRole, getByRole, rerender } = render({
					components: { N8nAlertDialog },
					props: {
						isOpen: false,
					},
					template: `
						<N8nAlertDialog title="Controlled" :open="isOpen" />
					`,
				});

				expect(queryByRole('dialog')).not.toBeInTheDocument();

				await rerender({ isOpen: true });
				expect(getByRole('dialog')).toBeInTheDocument();

				await rerender({ isOpen: false });
				await waitFor(() => {
					expect(queryByRole('dialog')).not.toBeInTheDocument();
				});
			});

			it('should start closed when no open prop is provided', async () => {
				const { queryByRole } = render({
					components: { N8nAlertDialog },
					template: `
						<N8nAlertDialog title="Initially closed" />
					`,
				});

				// Dialog should not be visible by default
				expect(queryByRole('dialog')).not.toBeInTheDocument();
			});

			it('should open when open prop is true', async () => {
				const { getByRole } = render({
					components: { N8nAlertDialog },
					template: `
						<N8nAlertDialog title="Open dialog" :open="true" />
					`,
				});

				await waitFor(() => {
					expect(getByRole('dialog')).toBeInTheDocument();
				});
			});
		});
	});

	describe('slots', () => {
		it('should render default slot content between description and footer', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderAlertDialog(
				{
					title: 'Alert with content',
					description: 'Description text',
				},
				{ withSlotContent: true },
			);

			await user.click(getByTestId('alert-trigger'));

			expect(getByTestId('slot-content')).toBeInTheDocument();
			expect(getByTestId('slot-content')).toHaveTextContent('Custom slot content');
		});

		it('should work in controlled mode without external trigger', async () => {
			const { getByRole } = render({
				components: { N8nAlertDialog },
				template: `
					<N8nAlertDialog title="No trigger" :open="true" />
				`,
			});

			await waitFor(() => {
				expect(getByRole('dialog')).toBeInTheDocument();
			});
		});
	});

	describe('action button behavior', () => {
		it('should NOT automatically close on action (allows async operations)', async () => {
			const user = userEvent.setup();

			const { getByTestId, getByRole } = render({
				components: { N8nAlertDialog },
				setup() {
					const isOpen = ref(false);
					const handleAction = () => {
						// Simulating async: dialog stays open until explicitly closed
					};
					return { isOpen, handleAction };
				},
				template: `
					<button data-test-id="alert-trigger" @click="isOpen = true">Open</button>
					<N8nAlertDialog v-model:open="isOpen" title="Async operation" @action="handleAction" />
				`,
			});

			await user.click(getByTestId('alert-trigger'));
			expect(getByRole('dialog')).toBeInTheDocument();

			await user.click(getByRole('button', { name: 'Confirm' }));

			// Dialog should still be open because action doesn't auto-close
			expect(getByRole('dialog')).toBeInTheDocument();
		});

		it('should allow closing via v-model after action completes', async () => {
			const user = userEvent.setup();

			const { getByTestId, getByRole, queryByRole } = render({
				components: { N8nAlertDialog },
				setup() {
					const isOpen = ref(false);
					const handleAction = () => {
						// Simulate async completion - close dialog
						isOpen.value = false;
					};
					return { isOpen, handleAction };
				},
				template: `
					<button data-test-id="alert-trigger" @click="isOpen = true">Open</button>
					<N8nAlertDialog v-model:open="isOpen" title="Async operation" @action="handleAction" />
				`,
			});

			await user.click(getByTestId('alert-trigger'));
			expect(getByRole('dialog')).toBeInTheDocument();

			await user.click(getByRole('button', { name: 'Confirm' }));

			await waitFor(() => {
				expect(queryByRole('dialog')).not.toBeInTheDocument();
			});
		});
	});
});
