import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import AgentChannelWhatsAppSettings from './AgentChannelWhatsAppSettings.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join(' ')}` : key,
	}),
}));

// The shared default is `data-test-id`; these components use `data-testid`.
configure({ testIdAttribute: 'data-testid' });

const renderComponent = createComponentRenderer(AgentChannelWhatsAppSettings);

const DEFAULTS = { typingIndicator: true, downloadMedia: true, mediaRetentionDays: 30 };

// N8nSwitch2 is a Reka UI switch: a button with aria-checked, not an input.
const isOn = (el: HTMLElement) => el.getAttribute('aria-checked') === 'true';

// The field's root carries the test ID. The editable element is the input inside it.
const retentionInput = (getByTestId: (id: string) => HTMLElement) => {
	const input = getByTestId('whatsapp-media-retention').querySelector('input');
	if (!input) throw new Error('Retention input not found');
	return input;
};

async function typeRetention(input: HTMLElement, value: string) {
	await userEvent.clear(input);
	await userEvent.type(input, value);
	await fireEvent.blur(input);
}

describe('AgentChannelWhatsAppSettings', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('shows the current values', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: { ...DEFAULTS, downloadMedia: false } },
		});

		expect(isOn(getByTestId('whatsapp-typing-indicator'))).toBe(true);
		expect(isOn(getByTestId('whatsapp-download-media'))).toBe(false);
	});

	it.each([
		['whatsapp-typing-indicator', { typingIndicator: false }],
		['whatsapp-download-media', { downloadMedia: false }],
	])('emits the patched settings when %s is toggled', async (testId, patch) => {
		const { getByTestId, emitted } = renderComponent({ props: { modelValue: DEFAULTS } });

		await fireEvent.click(getByTestId(testId));

		expect(emitted()['update:modelValue']).toEqual([[{ ...DEFAULTS, ...patch }]]);
	});

	it('shows the saved retention in days', () => {
		const { getByTestId, getByText } = renderComponent({
			props: { modelValue: { ...DEFAULTS, mediaRetentionDays: 45 } },
		});

		expect(retentionInput(getByTestId)).toHaveValue('45');
		expect(getByText('agents.channels.whatsapp.settings.mediaRetentionUnit')).toBeInTheDocument();
	});

	it('emits a typed retention as a number', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { modelValue: DEFAULTS } });

		await typeRetention(retentionInput(getByTestId), '90');

		expect(emitted()['update:modelValue']?.at(-1)).toEqual([
			{ ...DEFAULTS, mediaRetentionDays: 90 },
		]);
	});

	it('does not emit an empty retention', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { modelValue: DEFAULTS } });

		await userEvent.clear(retentionInput(getByTestId));
		await fireEvent.blur(retentionInput(getByTestId));

		expect(emitted()['update:modelValue']).toBeUndefined();
	});
});
