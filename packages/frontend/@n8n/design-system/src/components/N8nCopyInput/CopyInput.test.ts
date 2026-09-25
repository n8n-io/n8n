import { PopOutWindowKey } from '@n8n/composables/injectionKeys';
import { fireEvent, render } from '@testing-library/vue';
import { nextTick, ref } from 'vue';

import N8nCopyInput from './CopyInput.vue';

const writeText = vi.fn<(text: string) => Promise<void>>();

const tooltipStub = {
	template:
		'<span data-test-id="tooltip" :data-content="content" :data-disabled="disabled"><slot /></span>',
	props: ['content', 'disabled'],
};

const renderComponent = (
	props: Partial<InstanceType<typeof N8nCopyInput>['$props']> = {},
	options: { slots?: Record<string, string>; provide?: Record<symbol, unknown> } = {},
) =>
	render(N8nCopyInput, {
		props: { value: 'secret-token', label: 'API key', ...props },
		slots: options.slots,
		global: { stubs: { N8nTooltip: tooltipStub }, provide: options.provide },
	});

const nativeCopyEvent = () => {
	const setData = vi.fn();
	const event = new Event('copy', { bubbles: true, cancelable: true });
	Object.defineProperty(event, 'clipboardData', { value: { setData } });
	return { event, setData };
};

describe('N8nCopyInput', () => {
	beforeEach(() => {
		writeText.mockReset().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText },
			configurable: true,
		});
	});

	it('renders a labelled readonly input', () => {
		const { getByRole } = renderComponent();

		const input = getByRole('textbox', { name: 'API key' });
		expect(input).toHaveValue('secret-token');
		expect(input).toHaveAttribute('readonly');
	});

	it('shows the display value but copies the full value', async () => {
		const { getByRole, getByTestId, queryByDisplayValue, emitted } = renderComponent({
			displayValue: 'secret...oken',
		});

		expect(getByRole('textbox')).toHaveValue('secret...oken');
		expect(queryByDisplayValue('secret-token')).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('copy-input-button'));

		expect(writeText).toHaveBeenCalledWith('secret-token');
		expect(emitted('copy')).toEqual([['secret-token']]);
	});

	it('flips the copy button to a check mark after copying, then back', async () => {
		vi.useFakeTimers();
		try {
			const { getByTestId } = renderComponent({ feedbackDurationMs: 1000 });

			const button = getByTestId('copy-input-button');
			expect(button).toHaveAccessibleName('Copy');
			expect(getByTestId('tooltip')).toHaveAttribute('data-content', 'Copy');

			await fireEvent.click(button);
			await nextTick();
			expect(button).toHaveAccessibleName('Copied to clipboard');
			expect(getByTestId('tooltip')).toHaveAttribute('data-content', 'Copied to clipboard');

			await vi.advanceTimersByTimeAsync(1000);
			await nextTick();
			expect(button).toHaveAccessibleName('Copy');
		} finally {
			vi.useRealTimers();
		}
	});

	it('uses custom button labels', async () => {
		const { getByTestId } = renderComponent({ copyLabel: 'Kopieren', copiedLabel: 'Kopiert' });

		const button = getByTestId('copy-input-button');
		expect(button).toHaveAccessibleName('Kopieren');

		await fireEvent.click(button);
		await nextTick();
		expect(button).toHaveAccessibleName('Kopiert');
	});

	describe('clipboard', () => {
		it('falls back to execCommand when the Clipboard API rejects the write', async () => {
			writeText.mockRejectedValue(new Error('denied'));
			const execCommand = vi.fn().mockReturnValue(true);
			document.execCommand = execCommand;
			try {
				const { getByTestId, emitted } = renderComponent();

				await fireEvent.click(getByTestId('copy-input-button'));
				await nextTick();

				expect(execCommand).toHaveBeenCalledWith('copy');
				expect(emitted('copy')).toEqual([['secret-token']]);
				expect(emitted('error')).toBeUndefined();
				expect(getByTestId('copy-input-button')).toHaveAccessibleName('Copied to clipboard');
			} finally {
				// @ts-expect-error jsdom does not implement execCommand; restore the bare prototype
				delete document.execCommand;
			}
		});

		it('emits an error and keeps the resting state when both clipboard paths are refused', async () => {
			writeText.mockRejectedValue(new Error('denied'));
			document.execCommand = vi.fn().mockReturnValue(false);
			try {
				const { getByTestId, emitted } = renderComponent();

				await fireEvent.click(getByTestId('copy-input-button'));
				await nextTick();

				expect(emitted('error')).toEqual([[expect.any(Error)]]);
				expect(emitted('copy')).toBeUndefined();
				expect(getByTestId('copy-input-button')).toHaveAccessibleName('Copy');
			} finally {
				// @ts-expect-error jsdom does not implement execCommand; restore the bare prototype
				delete document.execCommand;
			}
		});

		it('writes to the pop-out window clipboard when one is provided', async () => {
			const popOutWriteText = vi.fn().mockResolvedValue(undefined);
			const popOutWindow = {
				navigator: { clipboard: { writeText: popOutWriteText } },
				document,
			} as unknown as Window;

			const { getByTestId, emitted } = renderComponent(
				{},
				{ provide: { [PopOutWindowKey as symbol]: ref(popOutWindow) } },
			);

			await fireEvent.click(getByTestId('copy-input-button'));

			expect(popOutWriteText).toHaveBeenCalledWith('secret-token');
			expect(writeText).not.toHaveBeenCalled();
			expect(emitted('copy')).toEqual([['secret-token']]);
		});
	});

	describe('field interaction', () => {
		it('selects the whole value when the field is focused or clicked', async () => {
			const select = vi.spyOn(HTMLInputElement.prototype, 'select');
			try {
				const { getByRole } = renderComponent({ displayValue: 'secret...oken' });
				const input = getByRole('textbox');

				await fireEvent.focus(input);
				expect(select).toHaveBeenCalledTimes(1);

				select.mockClear();
				await fireEvent.click(input);
				expect(select).toHaveBeenCalled();
			} finally {
				select.mockRestore();
			}
		});

		it('does not focus or select the field when the copy button is clicked', async () => {
			const select = vi.spyOn(HTMLInputElement.prototype, 'select');
			try {
				const { getByRole, getByTestId } = renderComponent();

				await fireEvent.click(getByTestId('copy-input-button'));

				expect(select).not.toHaveBeenCalled();
				expect(getByRole('textbox')).not.toHaveFocus();
			} finally {
				select.mockRestore();
			}
		});

		it('writes the full value on a native copy instead of the display value', async () => {
			const { getByRole, getByTestId, emitted } = renderComponent({
				displayValue: 'secret...oken',
			});
			const { event, setData } = nativeCopyEvent();

			await fireEvent(getByRole('textbox'), event);
			await nextTick();

			expect(event.defaultPrevented).toBe(true);
			expect(setData).toHaveBeenCalledWith('text/plain', 'secret-token');
			expect(writeText).not.toHaveBeenCalled();
			expect(emitted('copy')).toEqual([['secret-token']]);
			expect(getByTestId('copy-input-button')).toHaveAccessibleName('Copied to clipboard');
		});
	});

	describe('states', () => {
		it('disables the field, the button and the tooltip', () => {
			const { getByRole, getByTestId } = renderComponent({ disabled: true });

			expect(getByRole('textbox')).toBeDisabled();
			expect(getByTestId('copy-input-button')).toBeDisabled();
			expect(getByTestId('tooltip')).toHaveAttribute('data-disabled', 'true');
		});

		it('shows a skeleton, marks the field busy and disables copying while loading', () => {
			const { getByRole, getByTestId, queryByDisplayValue } = renderComponent(
				{ loading: true },
				{ slots: { actions: '<button data-test-id="rotate">Rotate</button>' } },
			);

			expect(getByTestId('copy-input-skeleton')).toBeInTheDocument();
			expect(getByRole('textbox')).toHaveAttribute('aria-busy', 'true');
			expect(queryByDisplayValue('secret-token')).not.toBeInTheDocument();
			expect(getByTestId('copy-input-button')).toBeDisabled();
			expect(getByTestId('rotate')).toBeInTheDocument();
		});

		it('hides the copy button but keeps the field enabled when copying is not allowed', async () => {
			const { getByRole, queryByTestId, emitted } = renderComponent({
				allowCopy: false,
				displayValue: 'secret...oken',
			});
			const { event, setData } = nativeCopyEvent();

			expect(queryByTestId('copy-input-button')).not.toBeInTheDocument();
			expect(getByRole('textbox')).toBeEnabled();

			await fireEvent(getByRole('textbox'), event);

			expect(event.defaultPrevented).toBe(false);
			expect(setData).not.toHaveBeenCalled();
			expect(emitted('copy')).toBeUndefined();
		});

		it('marks the field as redacted for session recordings', () => {
			const { container } = renderComponent({ redact: true });

			expect(container.firstElementChild).toHaveClass('ph-no-capture');
		});

		it('renders the actions slot before the copy button', () => {
			const { getByTestId } = renderComponent(
				{},
				{ slots: { actions: '<button data-test-id="rotate">Rotate</button>' } },
			);

			const rotate = getByTestId('rotate');
			const copy = getByTestId('copy-input-button');
			expect(rotate.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		});

		it('passes the size through to the copy button', () => {
			const { getByTestId } = renderComponent({ size: 'small' });

			expect(getByTestId('copy-input-button').className).toContain('small');
		});
	});
});
