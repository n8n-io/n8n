import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import EulaAcceptanceModal from '../EulaAcceptanceModal.vue';
import { waitFor } from '@testing-library/vue';

const renderComponent = createComponentRenderer(EulaAcceptanceModal);

describe('EulaAcceptanceModal', () => {
	it('should render the modal when modelValue is true', async () => {
		const { findByTestId } = renderComponent({
			props: {
				modelValue: true,
				eulaUrl: 'https://example.com/eula.pdf',
			},
		});

		expect(await findByTestId('eula-acceptance-modal')).toBeInTheDocument();
	});

	it('should display the audit notice', async () => {
		const { findByText } = renderComponent({
			props: {
				modelValue: true,
				eulaUrl: 'https://example.com/eula.pdf',
			},
		});

		expect(
			await findByText('Your acceptance will be recorded for audit purposes.'),
		).toBeInTheDocument();
	});

	it('should display the EULA link with correct URL', async () => {
		const eulaUrl = 'https://example.com/eula.pdf';
		const { findByTestId } = renderComponent({
			props: {
				modelValue: true,
				eulaUrl,
			},
		});

		const link = (await findByTestId('eula-link')) as HTMLAnchorElement;
		expect(link).toBeInTheDocument();
		expect(link.href).toBe(eulaUrl);
		expect(link.target).toBe('_blank');
		expect(link.rel).toBe('noopener noreferrer');
	});

	it('should have accept button disabled when checkbox is not checked', async () => {
		const { findByTestId } = renderComponent({
			props: {
				modelValue: true,
				eulaUrl: 'https://example.com/eula.pdf',
			},
		});

		const acceptButton = await findByTestId('eula-accept-button');
		expect(acceptButton).toBeDisabled();
	});

	it('should enable accept button when checkbox is checked', async () => {
		const { findByTestId } = renderComponent({
			props: {
				modelValue: true,
				eulaUrl: 'https://example.com/eula.pdf',
			},
		});

		const checkbox = await findByTestId('eula-checkbox');
		let acceptButton = await findByTestId('eula-accept-button');

		expect(acceptButton).toBeDisabled();

		checkbox.click();

		// Wait for reactivity
		acceptButton = await findByTestId('eula-accept-button');
		expect(acceptButton).not.toBeDisabled();
	});

	it('should emit accept event when accept button is clicked', async () => {
		const { findByTestId, emitted } = renderComponent({
			props: {
				modelValue: true,
				eulaUrl: 'https://example.com/eula.pdf',
			},
		});

		const checkbox = await findByTestId('eula-checkbox');
		checkbox.click();

		const acceptButton = await findByTestId('eula-accept-button');
		acceptButton.click();

		expect(emitted()).toHaveProperty('accept');
		expect(emitted().accept).toHaveLength(1);
	});

	it('should emit cancel event when cancel button is clicked', async () => {
		const { findByTestId, emitted } = renderComponent({
			props: {
				modelValue: true,
				eulaUrl: 'https://example.com/eula.pdf',
			},
		});

		const cancelButton = await findByTestId('eula-cancel-button');
		cancelButton.click();

		expect(emitted()).toHaveProperty('cancel');
		expect(emitted().cancel).toHaveLength(1);
	});

	it('should reset checkbox state when cancel is clicked', async () => {
		const { findByTestId } = renderComponent({
			props: {
				modelValue: true,
				eulaUrl: 'https://example.com/eula.pdf',
			},
		});

		let checkbox = await findByTestId('eula-checkbox');
		expect(checkbox.getAttribute('data-state')).toBe('unchecked');

		checkbox.click();
		await waitFor(() => {
			expect(checkbox.getAttribute('data-state')).toBe('checked');
		});

		const cancelButton = await findByTestId('eula-cancel-button');
		cancelButton.click();

		// Wait for reactivity
		checkbox = await findByTestId('eula-checkbox');
		expect(checkbox.getAttribute('data-state')).toBe('unchecked');
	});
});
