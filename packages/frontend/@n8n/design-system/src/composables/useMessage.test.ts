import { ElMessageBox } from 'element-plus';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isVNode } from 'vue';

import { hasActiveMessageBox, useMessage } from './useMessage';

vi.mock('element-plus', async (importOriginal) => {
	const actual = await importOriginal<typeof import('element-plus')>();
	return {
		...actual,
		ElMessageBox: {
			alert: vi.fn(),
			confirm: vi.fn(),
			prompt: vi.fn(),
		},
	};
});

const mockedBox = ElMessageBox as unknown as {
	alert: ReturnType<typeof vi.fn>;
	confirm: ReturnType<typeof vi.fn>;
	prompt: ReturnType<typeof vi.fn>;
};

describe('useMessage', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('exposes alert, confirm, prompt and the underlying message box', () => {
		const message = useMessage();
		expect(typeof message.alert).toBe('function');
		expect(typeof message.confirm).toBe('function');
		expect(typeof message.prompt).toBe('function');
		expect(message.message).toBe(ElMessageBox);
	});

	it('sanitizes string content and forces HTML string rendering on alert', async () => {
		mockedBox.alert.mockResolvedValue('confirm');

		await useMessage().alert('<script>alert(1)</script>Safe', 'Title');

		const [content, title, config] = mockedBox.alert.mock.calls[0];
		expect(content).not.toContain('<script>');
		expect(content).toContain('Safe');
		expect(title).toBe('Title');
		expect(config).toMatchObject({
			dangerouslyUseHTMLString: true,
			cancelButtonClass: 'btn--cancel',
			confirmButtonClass: 'btn--confirm',
		});
	});

	it('rethrows when the message box rejects with an Error', async () => {
		const boom = new Error('boom');
		mockedBox.confirm.mockRejectedValue(boom);

		await expect(useMessage().confirm('Delete?')).rejects.toThrow('boom');
	});

	it('resolves to the action when the user cancels', async () => {
		mockedBox.confirm.mockRejectedValue('cancel');

		await expect(useMessage().confirm('Delete?')).resolves.toBe('cancel');
	});

	it('renders a checkbox node and tags the modal when a confirmation checkbox is requested', async () => {
		mockedBox.confirm.mockResolvedValue('confirm');

		await useMessage().confirm('Delete?', 'Please confirm', {
			confirmationCheckboxMessage: 'I understand',
		});

		const [content, , config] = mockedBox.confirm.mock.calls[0];
		expect(isVNode(content)).toBe(true);
		expect(config.customClass).toContain('with-confirmation-checkbox');
	});

	it('returns a structured input result when a prompt is cancelled', async () => {
		mockedBox.prompt.mockRejectedValue('cancel');

		await expect(useMessage().prompt('Name?')).resolves.toEqual({
			value: '',
			action: 'cancel',
		});
	});

	it('tracks active message box state and mounts a focus-scope layer cleaned up on settle', async () => {
		let resolveConfirm!: (value: string) => void;
		mockedBox.confirm.mockImplementation(
			async () =>
				await new Promise<string>((resolve) => {
					resolveConfirm = resolve;
				}),
		);

		expect(hasActiveMessageBox.value).toBe(false);
		const pending = useMessage().confirm('Discard changes?', 'Close without saving?');

		expect(hasActiveMessageBox.value).toBe(true);
		const [, , config] = mockedBox.confirm.mock.calls[0];
		expect(config.appendTo).toBeInstanceOf(HTMLElement);
		const layerEl = config.appendTo as HTMLElement;
		expect(document.body.contains(layerEl)).toBe(true);
		expect(layerEl.style.pointerEvents).toBe('auto');

		resolveConfirm('confirm');
		await expect(pending).resolves.toBe('confirm');

		expect(hasActiveMessageBox.value).toBe(false);
		expect(document.body.contains(layerEl)).toBe(false);
	});

	it('cleans up active state and modal layer when the message box rejects with an Error', async () => {
		let rejectAlert!: (reason: Error) => void;
		mockedBox.alert.mockImplementation(
			async () =>
				await new Promise<string>((_resolve, reject) => {
					rejectAlert = reject;
				}),
		);

		const pending = useMessage().alert('Something failed', 'Error');
		const [, , config] = mockedBox.alert.mock.calls[0];
		const layerEl = config.appendTo as HTMLElement;
		expect(hasActiveMessageBox.value).toBe(true);

		rejectAlert(new Error('boom'));
		await expect(pending).rejects.toThrow('boom');

		expect(hasActiveMessageBox.value).toBe(false);
		expect(document.body.contains(layerEl)).toBe(false);
	});

	it('mounts the focus-scope layer inside a caller-provided appendTo container', async () => {
		const customTarget = document.createElement('div');
		customTarget.id = 'custom-message-box-root';
		document.body.appendChild(customTarget);

		let capturedAppendTo: unknown;
		mockedBox.confirm.mockImplementation(async (_msg, _title, config) => {
			capturedAppendTo = config.appendTo;
			expect(customTarget.contains(config.appendTo as Node)).toBe(true);
			return 'confirm';
		});

		try {
			await useMessage().confirm('Continue?', 'Confirm', {
				appendTo: '#custom-message-box-root',
			});
			expect(capturedAppendTo).toBeInstanceOf(HTMLElement);
			expect(customTarget.childElementCount).toBe(0);
		} finally {
			customTarget.remove();
		}
	});

	it('cleans up the modal layer if the message box DOM child is removed externally', async () => {
		let appendedOverlay: HTMLDivElement | null = null;
		mockedBox.confirm.mockImplementation(async (_msg, _title, config) => {
			const layer = config.appendTo as HTMLElement;
			appendedOverlay = document.createElement('div');
			layer.appendChild(appendedOverlay);
			return await new Promise(() => {});
		});

		void useMessage().confirm('External close?', 'Confirm');
		expect(hasActiveMessageBox.value).toBe(true);
		expect(appendedOverlay).not.toBeNull();

		appendedOverlay!.remove();
		await vi.waitFor(() => {
			expect(hasActiveMessageBox.value).toBe(false);
		});
	});
});
