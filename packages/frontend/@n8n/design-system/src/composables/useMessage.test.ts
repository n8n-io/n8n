import { ElMessageBox } from 'element-plus';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isVNode } from 'vue';

import { useMessage } from './useMessage';

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
});
