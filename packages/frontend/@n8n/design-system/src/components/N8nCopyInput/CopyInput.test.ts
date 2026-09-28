import { fireEvent, render } from '@testing-library/vue';
import { nextTick } from 'vue';

import N8nCopyInput from './CopyInput.vue';

const clipboardCopy = vi.fn();

vi.mock('@vueuse/core', async (importOriginal) => {
	const original = await importOriginal<typeof import('@vueuse/core')>();
	return {
		...original,
		useClipboard: () => ({ copy: clipboardCopy }),
	};
});

describe('N8nCopyInput', () => {
	beforeEach(() => {
		clipboardCopy.mockClear();
	});

	it('renders the value in a readonly input', () => {
		const { getByDisplayValue } = render(N8nCopyInput, {
			props: { value: 'secret-token' },
		});

		const input = getByDisplayValue('secret-token');
		expect(input).toBeInTheDocument();
		expect(input).toHaveAttribute('readonly');
	});

	it('shows the display value but copies the full value', async () => {
		const { getByDisplayValue, getByTestId, queryByDisplayValue, emitted } = render(N8nCopyInput, {
			props: { value: 'secret-token', displayValue: 'secret...oken' },
		});

		expect(getByDisplayValue('secret...oken')).toBeInTheDocument();
		expect(queryByDisplayValue('secret-token')).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('copy-input-button'));

		expect(clipboardCopy).toHaveBeenCalledWith('secret-token');
		expect(emitted('copy')).toEqual([['secret-token']]);
	});

	it('flips the copy button to a check mark after copying, then back', async () => {
		vi.useFakeTimers();
		try {
			const { getByTestId } = render(N8nCopyInput, {
				props: { value: 'secret-token', feedbackDurationMs: 1000 },
			});

			const button = getByTestId('copy-input-button');
			expect(button).toHaveAccessibleName('Copy');

			await fireEvent.click(button);
			await nextTick();
			expect(button).toHaveAccessibleName('Copied to clipboard');

			await vi.advanceTimersByTimeAsync(1000);
			await nextTick();
			expect(button).toHaveAccessibleName('Copy');
		} finally {
			vi.useRealTimers();
		}
	});

	it('uses custom button labels', async () => {
		const { getByTestId } = render(N8nCopyInput, {
			props: { value: 'secret-token', copyLabel: 'Kopieren', copiedLabel: 'Kopiert' },
		});

		const button = getByTestId('copy-input-button');
		expect(button).toHaveAccessibleName('Kopieren');

		await fireEvent.click(button);
		await nextTick();
		expect(button).toHaveAccessibleName('Kopiert');
	});
});
