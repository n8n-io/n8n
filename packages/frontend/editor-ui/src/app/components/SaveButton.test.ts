import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import SaveButton from '@/app/components/SaveButton.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';

vi.mock('@n8n/i18n', async (importActual) => ({
	...(await importActual()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

// Create the renderer for SaveButton
const renderComponent = createComponentRenderer(SaveButton);

describe('SaveButton.vue', () => {
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		pinia = createTestingPinia();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering states', () => {
		it('should render the save button with default props', () => {
			const { getByTestId, getByRole } = renderComponent({
				props: {
					saved: false,
				},
				pinia,
			});

			const container = getByTestId('save-button');
			expect(container).toBeInTheDocument();

			const button = getByRole('button');
			expect(button).toBeInTheDocument();
			expect(button).toHaveTextContent('saveButton.save');
		});

		it('should render "Saved" text when saved prop is true', () => {
			const { getByTestId, getByText, queryByRole } = renderComponent({
				props: {
					saved: true,
				},
				pinia,
			});

			const container = getByTestId('save-button');
			expect(container).toBeInTheDocument();
			expect(getByText('saveButton.saved')).toBeInTheDocument();
			expect(queryByRole('button')).not.toBeInTheDocument();
		});

		it('should render saving state when isSaving prop is true', () => {
			const { getByRole } = renderComponent({
				props: {
					saved: false,
					isSaving: true,
				},
				pinia,
			});

			const button = getByRole('button');
			expect(button).toBeInTheDocument();
			expect(button).toHaveTextContent('saveButton.saving');
		});

		it('should render custom saving label when provided', () => {
			const customLabel = 'Please wait...';
			const { getByRole } = renderComponent({
				props: {
					saved: false,
					isSaving: true,
					savingLabel: customLabel,
				},
				pinia,
			});

			const button = getByRole('button');
			expect(button).toHaveTextContent(customLabel);
		});

		it('should render disabled button when disabled prop is true', () => {
			const { getByRole } = renderComponent({
				props: {
					saved: false,
					disabled: true,
				},
				pinia,
			});

			const button = getByRole('button');
			expect(button).toBeDisabled();
		});
	});

	describe('Button states and interactions', () => {
		it('should show loading state on button when isSaving is true', () => {
			const { getByRole } = renderComponent({
				props: {
					saved: false,
					isSaving: true,
				},
				pinia,
			});

			const button = getByRole('button');
			expect(button).toHaveAttribute('aria-busy', 'true');
			expect(button).toHaveTextContent('saveButton.saving');
		});

		it('should not show loading state when isSaving is false', () => {
			const { getByRole } = renderComponent({
				props: {
					saved: false,
					isSaving: false,
				},
				pinia,
			});

			const button = getByRole('button');
			expect(button).not.toHaveAttribute('aria-busy', 'true');
			expect(button).toHaveTextContent('saveButton.save');
		});

		it('should disable button when disabled is true', () => {
			const { getByRole } = renderComponent({
				props: {
					saved: false,
					disabled: true,
					isSaving: false,
				},
				pinia,
			});

			const button = getByRole('button');
			expect(button).toBeDisabled();
		});

		it('should handle multiple state changes correctly', async () => {
			const { getByRole, getByText, queryByRole, rerender } = renderComponent({
				props: {
					saved: false,
					isSaving: false,
					disabled: false,
				},
				pinia,
			});

			// Initial state - Save button visible
			let button = getByRole('button');
			expect(button).toHaveTextContent('saveButton.save');
			expect(button).not.toBeDisabled();

			// Change to saving state
			await rerender({
				saved: false,
				isSaving: true,
				disabled: false,
			});
			button = getByRole('button');
			expect(button).toHaveTextContent('saveButton.saving');
			expect(button).toHaveAttribute('aria-busy', 'true');

			// Change to saved state
			await rerender({
				saved: true,
				isSaving: false,
				disabled: false,
			});
			expect(getByText('saveButton.saved')).toBeInTheDocument();
			expect(queryByRole('button')).not.toBeInTheDocument();

			// Back to initial state
			await rerender({
				saved: false,
				isSaving: false,
				disabled: false,
			});
			button = getByRole('button');
			expect(button).toHaveTextContent('saveButton.save');
			expect(button).not.toBeDisabled();
		});

		it('should emit click event when button is clicked', async () => {
			const user = userEvent.setup();
			const { getByRole, emitted } = renderComponent({
				props: {
					saved: false,
				},
				pinia,
			});

			const button = getByRole('button');
			await user.click(button);

			expect(emitted()).toHaveProperty('click');
			expect(emitted().click).toHaveLength(1);
		});

		it('should not emit click event when button is disabled', async () => {
			const user = userEvent.setup();
			const { getByRole, emitted } = renderComponent({
				props: {
					saved: false,
					disabled: true,
				},
				pinia,
			});

			const button = getByRole('button');
			await user.click(button);

			expect(emitted()).not.toHaveProperty('click');
		});
	});

	describe('Click prevention on saved state', () => {
		it('should prevent click propagation when showing saved text', async () => {
			const user = userEvent.setup();
			const { getByText, emitted } = renderComponent({
				props: {
					saved: true,
				},
				pinia,
			});

			const savedText = getByText('saveButton.saved');
			await user.click(savedText);

			expect(savedText).toBeInTheDocument();

			// The click should be prevented by @click.stop.prevent
			expect(emitted()).not.toHaveProperty('click');
		});
	});
});
