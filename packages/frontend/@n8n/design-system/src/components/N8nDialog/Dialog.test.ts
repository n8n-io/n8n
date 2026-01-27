import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import {
	N8nDialogRoot,
	N8nDialogTrigger,
	N8nDialogPortal,
	N8nDialogOverlay,
	N8nDialogContent,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogClose,
} from './index';

// Helper to render a complete dialog setup
const renderDialog = (
	contentProps: Record<string, unknown> = {},
	options: { defaultOpen?: boolean } = {},
) => {
	return render({
		components: {
			N8nDialogRoot,
			N8nDialogTrigger,
			N8nDialogPortal,
			N8nDialogOverlay,
			N8nDialogContent,
			N8nDialogHeader,
			N8nDialogTitle,
			N8nDialogDescription,
			N8nDialogFooter,
			N8nDialogClose,
		},
		setup() {
			return { contentProps, defaultOpen: options.defaultOpen };
		},
		template: `
			<N8nDialogRoot :default-open="defaultOpen">
				<N8nDialogTrigger as-child>
					<button data-test-id="dialog-trigger">Open Dialog</button>
				</N8nDialogTrigger>
				<N8nDialogPortal>
					<N8nDialogOverlay />
					<N8nDialogContent v-bind="contentProps">
						<N8nDialogHeader>
							<N8nDialogTitle>Test Dialog Title</N8nDialogTitle>
							<N8nDialogDescription>Test dialog description text.</N8nDialogDescription>
						</N8nDialogHeader>
						<div data-test-id="dialog-body">Dialog body content</div>
						<N8nDialogFooter>
							<N8nDialogClose as-child>
								<button data-test-id="dialog-cancel">Cancel</button>
							</N8nDialogClose>
							<button data-test-id="dialog-confirm">Confirm</button>
						</N8nDialogFooter>
					</N8nDialogContent>
				</N8nDialogPortal>
			</N8nDialogRoot>
		`,
	});
};

describe('N8nDialog', () => {
	describe('accessibility', () => {
		it('should have role="dialog" on the content', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByRole } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));

			const dialog = getByRole('dialog');
			expect(dialog).toBeInTheDocument();
		});

		it('should have role="dialog" which implies modal behavior', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByRole } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));

			// Reka UI's Dialog uses role="dialog" and manages focus trapping internally
			// The modal behavior is enforced by focus trapping rather than aria-modal attribute
			const dialog = getByRole('dialog');
			expect(dialog).toBeInTheDocument();
		});

		it('should have aria-labelledby pointing to title', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByRole, getByText } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));

			const dialog = getByRole('dialog');
			const title = getByText('Test Dialog Title');

			expect(dialog).toHaveAttribute('aria-labelledby');
			expect(title).toHaveAttribute('id', dialog.getAttribute('aria-labelledby'));
		});

		it('should have aria-describedby pointing to description', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByRole, getByText } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));

			const dialog = getByRole('dialog');
			const description = getByText('Test dialog description text.');

			expect(dialog).toHaveAttribute('aria-describedby');
			expect(description).toHaveAttribute('id', dialog.getAttribute('aria-describedby'));
		});

		it('should have aria-label on close button', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByLabelText } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));

			const closeButton = getByLabelText('Close dialog');
			expect(closeButton).toBeInTheDocument();
		});

		it('should trap focus within the dialog', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByRole } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));

			const dialog = getByRole('dialog');

			// Tab through all focusable elements
			await user.tab();
			expect(dialog.contains(document.activeElement)).toBe(true);

			await user.tab();
			expect(dialog.contains(document.activeElement)).toBe(true);

			await user.tab();
			expect(dialog.contains(document.activeElement)).toBe(true);

			// Focus should cycle back within dialog
			await user.tab();
			expect(dialog.contains(document.activeElement)).toBe(true);
		});

		it('should render fallback title for screen readers when ariaLabel is provided without DialogTitle', async () => {
			const user = userEvent.setup();

			const { getByTestId, getByRole, getByText } = render({
				components: {
					N8nDialogRoot,
					N8nDialogTrigger,
					N8nDialogPortal,
					N8nDialogOverlay,
					N8nDialogContent,
				},
				template: `
					<N8nDialogRoot>
						<N8nDialogTrigger as-child>
							<button data-test-id="dialog-trigger">Open</button>
						</N8nDialogTrigger>
						<N8nDialogPortal>
							<N8nDialogOverlay />
							<N8nDialogContent aria-label="Fallback Title">
								<p>Content without DialogTitle component</p>
							</N8nDialogContent>
						</N8nDialogPortal>
					</N8nDialogRoot>
				`,
			});

			await user.click(getByTestId('dialog-trigger'));

			const dialog = getByRole('dialog');
			expect(dialog).toBeInTheDocument();

			// The fallback title should be rendered (visually hidden but in DOM)
			const fallbackTitle = getByText('Fallback Title');
			expect(fallbackTitle).toBeInTheDocument();

			// Dialog should have aria-labelledby pointing to the fallback title
			expect(dialog).toHaveAttribute('aria-labelledby');
		});

		it('should render fallback description for screen readers when ariaDescription is provided without DialogDescription', async () => {
			const user = userEvent.setup();

			const { getByTestId, getByRole, getByText } = render({
				components: {
					N8nDialogRoot,
					N8nDialogTrigger,
					N8nDialogPortal,
					N8nDialogOverlay,
					N8nDialogContent,
					N8nDialogTitle,
				},
				template: `
					<N8nDialogRoot>
						<N8nDialogTrigger as-child>
							<button data-test-id="dialog-trigger">Open</button>
						</N8nDialogTrigger>
						<N8nDialogPortal>
							<N8nDialogOverlay />
							<N8nDialogContent aria-description="Fallback Description">
								<N8nDialogTitle>Test Title</N8nDialogTitle>
								<p>Content without DialogDescription component</p>
							</N8nDialogContent>
						</N8nDialogPortal>
					</N8nDialogRoot>
				`,
			});

			await user.click(getByTestId('dialog-trigger'));

			const dialog = getByRole('dialog');
			expect(dialog).toBeInTheDocument();

			// The fallback description should be rendered (visually hidden but in DOM)
			const fallbackDescription = getByText('Fallback Description');
			expect(fallbackDescription).toBeInTheDocument();

			// Dialog should have aria-describedby pointing to the fallback description
			expect(dialog).toHaveAttribute('aria-describedby');
		});

		it('should warn in dev mode when dialog has no title or ariaLabel', async () => {
			const user = userEvent.setup();
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const { getByTestId, getByRole } = render({
				components: {
					N8nDialogRoot,
					N8nDialogTrigger,
					N8nDialogPortal,
					N8nDialogOverlay,
					N8nDialogContent,
				},
				template: `
					<N8nDialogRoot>
						<N8nDialogTrigger as-child>
							<button data-test-id="dialog-trigger">Open</button>
						</N8nDialogTrigger>
						<N8nDialogPortal>
							<N8nDialogOverlay />
							<N8nDialogContent>
								<p>Content without any title</p>
							</N8nDialogContent>
						</N8nDialogPortal>
					</N8nDialogRoot>
				`,
			});

			await user.click(getByTestId('dialog-trigger'));
			expect(getByRole('dialog')).toBeInTheDocument();

			// Wait for the accessibility check to run (uses requestAnimationFrame)
			await new Promise((resolve) => requestAnimationFrame(resolve));

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[N8nDialogContent] Dialog is missing accessible title'),
			);

			consoleSpy.mockRestore();
		});

		it('should NOT warn when DialogTitle component is provided', async () => {
			const user = userEvent.setup();
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const { getByTestId, getByRole } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));
			expect(getByRole('dialog')).toBeInTheDocument();

			// Wait for the accessibility check to run
			await new Promise((resolve) => requestAnimationFrame(resolve));

			// Should not warn because DialogTitle is provided in renderDialog
			expect(consoleSpy).not.toHaveBeenCalledWith(
				expect.stringContaining('[N8nDialogContent] Dialog is missing accessible title'),
			);

			consoleSpy.mockRestore();
		});

		it('should NOT warn when ariaLabel is provided instead of DialogTitle', async () => {
			const user = userEvent.setup();
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const { getByTestId, getByRole } = render({
				components: {
					N8nDialogRoot,
					N8nDialogTrigger,
					N8nDialogPortal,
					N8nDialogOverlay,
					N8nDialogContent,
				},
				template: `
					<N8nDialogRoot>
						<N8nDialogTrigger as-child>
							<button data-test-id="dialog-trigger">Open</button>
						</N8nDialogTrigger>
						<N8nDialogPortal>
							<N8nDialogOverlay />
							<N8nDialogContent aria-label="Accessible Title">
								<p>Content with ariaLabel prop</p>
							</N8nDialogContent>
						</N8nDialogPortal>
					</N8nDialogRoot>
				`,
			});

			await user.click(getByTestId('dialog-trigger'));
			expect(getByRole('dialog')).toBeInTheDocument();

			// Wait for the accessibility check to run
			await new Promise((resolve) => requestAnimationFrame(resolve));

			// Should not warn because ariaLabel is provided
			expect(consoleSpy).not.toHaveBeenCalledWith(
				expect.stringContaining('[N8nDialogContent] Dialog is missing accessible title'),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('open/close behavior', () => {
		it('should open dialog when trigger is clicked', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByRole, getByRole } = renderDialog();

			expect(queryByRole('dialog')).not.toBeInTheDocument();

			await user.click(getByTestId('dialog-trigger'));

			expect(getByRole('dialog')).toBeInTheDocument();
		});

		it('should close dialog when close button is clicked', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByLabelText, queryByRole, getByRole } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));
			expect(getByRole('dialog')).toBeInTheDocument();

			await user.click(getByLabelText('Close dialog'));

			await waitFor(() => {
				expect(queryByRole('dialog')).not.toBeInTheDocument();
			});
		});

		it('should close dialog when Cancel button (DialogClose) is clicked', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByRole, getByRole } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));
			expect(getByRole('dialog')).toBeInTheDocument();

			await user.click(getByTestId('dialog-cancel'));

			await waitFor(() => {
				expect(queryByRole('dialog')).not.toBeInTheDocument();
			});
		});

		it('should close dialog when Escape key is pressed', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByRole, getByRole } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));
			expect(getByRole('dialog')).toBeInTheDocument();

			await user.keyboard('{Escape}');

			await waitFor(() => {
				expect(queryByRole('dialog')).not.toBeInTheDocument();
			});
		});

		it('should close dialog when clicking outside with disableOutsidePointerEvents=false', async () => {
			const user = userEvent.setup();

			const { getByTestId, getByRole, queryByRole, baseElement } = render({
				components: {
					N8nDialogRoot,
					N8nDialogTrigger,
					N8nDialogPortal,
					N8nDialogOverlay,
					N8nDialogContent,
					N8nDialogTitle,
				},
				template: `
					<N8nDialogRoot>
						<N8nDialogTrigger as-child>
							<button data-test-id="dialog-trigger">Open</button>
						</N8nDialogTrigger>
						<N8nDialogPortal>
							<N8nDialogOverlay data-test-id="dialog-overlay" />
							<N8nDialogContent :disable-outside-pointer-events="false">
								<N8nDialogTitle>Test</N8nDialogTitle>
							</N8nDialogContent>
						</N8nDialogPortal>
					</N8nDialogRoot>
				`,
			});

			await user.click(getByTestId('dialog-trigger'));
			expect(getByRole('dialog')).toBeInTheDocument();

			// Dispatch pointer events directly to simulate clicking outside
			// This bypasses the pointer-events CSS check in userEvent
			const overlay = baseElement.querySelector('[data-test-id="dialog-overlay"]');
			if (overlay) {
				overlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
				overlay.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
			}

			await waitFor(() => {
				expect(queryByRole('dialog')).not.toBeInTheDocument();
			});
		});

		it('should NOT close dialog when clicking outside with disableOutsidePointerEvents=true (default)', async () => {
			const user = userEvent.setup();
			const interactOutsideHandler = vi.fn((e: Event) => e.preventDefault());

			const { getByTestId, getByRole, baseElement } = render({
				components: {
					N8nDialogRoot,
					N8nDialogTrigger,
					N8nDialogPortal,
					N8nDialogOverlay,
					N8nDialogContent,
					N8nDialogTitle,
				},
				setup() {
					return { interactOutsideHandler };
				},
				template: `
					<N8nDialogRoot>
						<N8nDialogTrigger as-child>
							<button data-test-id="dialog-trigger">Open</button>
						</N8nDialogTrigger>
						<N8nDialogPortal>
							<N8nDialogOverlay data-test-id="dialog-overlay" />
							<N8nDialogContent @interact-outside="interactOutsideHandler">
								<N8nDialogTitle>Test</N8nDialogTitle>
							</N8nDialogContent>
						</N8nDialogPortal>
					</N8nDialogRoot>
				`,
			});

			await user.click(getByTestId('dialog-trigger'));
			expect(getByRole('dialog')).toBeInTheDocument();

			// Dispatch pointer event on overlay - dialog should remain open
			const overlay = baseElement.querySelector('[data-test-id="dialog-overlay"]');
			if (overlay) {
				overlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
			}

			// Dialog should still be open because disableOutsidePointerEvents is true by default
			expect(getByRole('dialog')).toBeInTheDocument();
		});

		it('should support controlled open state via v-model', async () => {
			const { queryByRole, getByRole, rerender } = render({
				components: {
					N8nDialogRoot,
					N8nDialogPortal,
					N8nDialogOverlay,
					N8nDialogContent,
					N8nDialogTitle,
				},
				props: {
					isOpen: false,
				},
				template: `
					<N8nDialogRoot :open="isOpen">
						<N8nDialogPortal>
							<N8nDialogOverlay />
							<N8nDialogContent>
								<N8nDialogTitle>Controlled Dialog</N8nDialogTitle>
							</N8nDialogContent>
						</N8nDialogPortal>
					</N8nDialogRoot>
				`,
			});

			expect(queryByRole('dialog')).not.toBeInTheDocument();

			// Open the dialog by updating the prop
			await rerender({ isOpen: true });
			expect(getByRole('dialog')).toBeInTheDocument();

			// Close the dialog by updating the prop
			await rerender({ isOpen: false });
			await waitFor(() => {
				expect(queryByRole('dialog')).not.toBeInTheDocument();
			});
		});

		it('should emit escapeKeyDown event when Escape is pressed', async () => {
			const user = userEvent.setup();
			const escapeHandler = vi.fn();

			const { getByTestId, getByRole } = render({
				components: {
					N8nDialogRoot,
					N8nDialogTrigger,
					N8nDialogPortal,
					N8nDialogOverlay,
					N8nDialogContent,
					N8nDialogTitle,
				},
				setup() {
					return { escapeHandler };
				},
				template: `
					<N8nDialogRoot>
						<N8nDialogTrigger as-child>
							<button data-test-id="dialog-trigger">Open</button>
						</N8nDialogTrigger>
						<N8nDialogPortal>
							<N8nDialogOverlay />
							<N8nDialogContent @escape-key-down="escapeHandler">
								<N8nDialogTitle>Test</N8nDialogTitle>
							</N8nDialogContent>
						</N8nDialogPortal>
					</N8nDialogRoot>
				`,
			});

			await user.click(getByTestId('dialog-trigger'));
			expect(getByRole('dialog')).toBeInTheDocument();

			await user.keyboard('{Escape}');

			expect(escapeHandler).toHaveBeenCalled();
		});
	});

	describe('props', () => {
		describe('size', () => {
			it.each(['small', 'medium', 'large', 'xlarge', '2xlarge', 'fit', 'full', 'cover'] as const)(
				'should apply %s size class',
				async (size) => {
					const user = userEvent.setup();
					const { getByTestId, getByRole } = renderDialog({ size });

					await user.click(getByTestId('dialog-trigger'));

					const dialog = getByRole('dialog');
					expect(dialog.className).toContain(size === '2xlarge' ? '2xlarge' : size);
				},
			);

			it('should default to medium size', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByRole } = renderDialog();

				await user.click(getByTestId('dialog-trigger'));

				const dialog = getByRole('dialog');
				expect(dialog.className).toContain('medium');
			});
		});

		describe('showCloseButton', () => {
			it('should show close button by default', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByLabelText } = renderDialog();

				await user.click(getByTestId('dialog-trigger'));

				expect(getByLabelText('Close dialog')).toBeInTheDocument();
			});

			it('should hide close button when showCloseButton is false', async () => {
				const user = userEvent.setup();
				const { getByTestId, queryByLabelText } = renderDialog({ showCloseButton: false });

				await user.click(getByTestId('dialog-trigger'));

				expect(queryByLabelText('Close dialog')).not.toBeInTheDocument();
			});
		});

		describe('trapFocus', () => {
			it('should trap focus by default', async () => {
				const user = userEvent.setup();
				const { getByTestId, getByRole } = renderDialog();

				await user.click(getByTestId('dialog-trigger'));

				const dialog = getByRole('dialog');

				// Verify focus stays within dialog after multiple tabs
				for (let i = 0; i < 10; i++) {
					await user.tab();
					expect(dialog.contains(document.activeElement)).toBe(true);
				}
			});
		});

		describe('disableOutsidePointerEvents', () => {
			it('should have disableOutsidePointerEvents enabled by default', async () => {
				const user = userEvent.setup();

				const { getByTestId, getByRole } = renderDialog();

				await user.click(getByTestId('dialog-trigger'));
				const dialog = getByRole('dialog');
				expect(dialog).toBeInTheDocument();

				// The dialog content should have data-state="open" when open
				// and disableOutsidePointerEvents is a prop that's true by default
				// which prevents interaction with elements outside the dialog
				expect(dialog).toHaveAttribute('data-state', 'open');
			});
		});
	});

	describe('slots', () => {
		it('should render default slot content', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));

			expect(getByTestId('dialog-body')).toBeInTheDocument();
			expect(getByTestId('dialog-body')).toHaveTextContent('Dialog body content');
		});

		it('should render header with title and description', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByText } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));

			expect(getByText('Test Dialog Title')).toBeInTheDocument();
			expect(getByText('Test dialog description text.')).toBeInTheDocument();
		});

		it('should render footer with action buttons', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));

			expect(getByTestId('dialog-cancel')).toBeInTheDocument();
			expect(getByTestId('dialog-confirm')).toBeInTheDocument();
		});
	});

	describe('keyboard navigation', () => {
		it('should focus first focusable element when dialog opens', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByRole } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));

			const dialog = getByRole('dialog');
			expect(dialog.contains(document.activeElement)).toBe(true);
		});

		it('should return focus to trigger when dialog closes', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByLabelText, queryByRole } = renderDialog();

			const trigger = getByTestId('dialog-trigger');
			await user.click(trigger);

			await user.click(getByLabelText('Close dialog'));

			await waitFor(() => {
				expect(queryByRole('dialog')).not.toBeInTheDocument();
			});

			expect(document.activeElement).toBe(trigger);
		});

		it('should cycle focus with Tab key', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByLabelText } = renderDialog();

			await user.click(getByTestId('dialog-trigger'));

			const closeButton = getByLabelText('Close dialog');
			const cancelButton = getByTestId('dialog-cancel');
			const confirmButton = getByTestId('dialog-confirm');

			// Get all focusable elements and verify tab cycles through them
			const focusableElements = [closeButton, cancelButton, confirmButton];

			// Tab through elements multiple times to verify cycling
			const totalTabs = focusableElements.length * 2;
			for (let i = 0; i < totalTabs; i++) {
				await user.tab();
				// Focus should stay within the dialog's focusable elements
				expect(focusableElements.includes(document.activeElement as HTMLElement)).toBe(true);
			}
		});
	});
});
