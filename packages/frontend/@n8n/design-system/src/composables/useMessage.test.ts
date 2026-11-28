import { ElMessageBox } from 'element-plus';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isVNode } from 'vue';

import { hasActiveMessageBox, isEscapeConsumedByMessageBox, useMessage } from './useMessage';

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

	it('cleans up active state when a caller-provided appendTo container is removed while pending', async () => {
		const customTarget = document.createElement('div');
		document.body.appendChild(customTarget);

		let resolveConfirm!: (value: string) => void;
		mockedBox.confirm.mockImplementation(async (_msg, _title, config) => {
			const layer = config.appendTo as HTMLElement;
			const overlay = document.createElement('div');
			layer.appendChild(overlay);
			return await new Promise<string>((resolve) => {
				resolveConfirm = resolve;
			});
		});

		try {
			const pending = useMessage().confirm('Continue?', 'Confirm', {
				appendTo: customTarget,
			});
			expect(hasActiveMessageBox.value).toBe(true);
			expect(customTarget.childElementCount).toBe(1);

			customTarget.remove();
			await vi.waitFor(() => {
				expect(hasActiveMessageBox.value).toBe(false);
			});
			expect(customTarget.childElementCount).toBe(0);

			// Settling later must remain a safe no-op.
			resolveConfirm('confirm');
			await expect(pending).resolves.toBe('confirm');
			expect(hasActiveMessageBox.value).toBe(false);
		} finally {
			customTarget.remove();
		}
	});

	it('cleans up active state when an ancestor of the appendTo container is removed while pending', async () => {
		const ancestor = document.createElement('div');
		const customTarget = document.createElement('div');
		customTarget.id = 'nested-message-box-root';
		ancestor.appendChild(customTarget);
		document.body.appendChild(ancestor);

		mockedBox.confirm.mockImplementation(async (_msg, _title, config) => {
			const layer = config.appendTo as HTMLElement;
			layer.appendChild(document.createElement('div'));
			return await new Promise(() => {});
		});

		try {
			void useMessage().confirm('Continue?', 'Confirm', {
				appendTo: '#nested-message-box-root',
			});
			expect(hasActiveMessageBox.value).toBe(true);

			ancestor.remove();
			await vi.waitFor(() => {
				expect(hasActiveMessageBox.value).toBe(false);
			});
			expect(customTarget.childElementCount).toBe(0);
		} finally {
			ancestor.remove();
		}
	});

	it('cleans up active state when a shadow host containing the appendTo container is removed', async () => {
		const shadowHost = document.createElement('div');
		document.body.appendChild(shadowHost);
		const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
		const shadowTarget = document.createElement('div');
		shadowRoot.appendChild(shadowTarget);

		mockedBox.confirm.mockImplementation(async (_msg, _title, config) => {
			const layer = config.appendTo as HTMLElement;
			layer.appendChild(document.createElement('div'));
			return await new Promise(() => {});
		});

		try {
			void useMessage().confirm('Continue?', 'Confirm', {
				appendTo: shadowTarget,
			});
			expect(hasActiveMessageBox.value).toBe(true);
			expect(shadowTarget.childElementCount).toBe(1);

			shadowHost.remove();
			await vi.waitFor(() => {
				expect(hasActiveMessageBox.value).toBe(false);
			});
			expect(shadowTarget.childElementCount).toBe(0);
		} finally {
			shadowHost.remove();
		}
	});

	it('falls back to document.body when appendTo is a detached element', async () => {
		const detachedTarget = document.createElement('div');

		mockedBox.confirm.mockImplementation(async (_msg, _title, config) => {
			const layer = config.appendTo as HTMLElement;
			expect(document.body.contains(layer)).toBe(true);
			expect(detachedTarget.contains(layer)).toBe(false);
			return 'confirm';
		});

		await expect(
			useMessage().confirm('Continue?', 'Confirm', {
				appendTo: detachedTarget,
			}),
		).resolves.toBe('confirm');
		expect(hasActiveMessageBox.value).toBe(false);
	});

	it('keeps active state during unrelated DOM mutations and cleans up only when all boxes end', async () => {
		const customTarget = document.createElement('div');
		document.body.appendChild(customTarget);

		let resolveBodyBox!: (value: string) => void;
		mockedBox.confirm
			.mockImplementationOnce(async () => await new Promise(() => {}))
			.mockImplementationOnce(
				async () =>
					await new Promise<string>((resolve) => {
						resolveBodyBox = resolve;
					}),
			);

		try {
			void useMessage().confirm('First?', 'First', { appendTo: customTarget });
			const secondPending = useMessage().confirm('Second?', 'Second');
			expect(hasActiveMessageBox.value).toBe(true);

			// Unrelated DOM churn must not prematurely clear active state.
			const sibling = document.createElement('div');
			document.body.appendChild(sibling);
			sibling.remove();
			await Promise.resolve();
			expect(hasActiveMessageBox.value).toBe(true);

			// Removing only the first container must leave active state on for the second box.
			customTarget.remove();
			await vi.waitFor(() => {
				expect(customTarget.childElementCount).toBe(0);
			});
			expect(hasActiveMessageBox.value).toBe(true);

			resolveBodyBox('confirm');
			await expect(secondPending).resolves.toBe('confirm');
			expect(hasActiveMessageBox.value).toBe(false);
		} finally {
			customTarget.remove();
		}
	});

	it('marks Escape events that start while a message box is active even after it settles', async () => {
		let resolveConfirm!: (value: string) => void;
		mockedBox.confirm.mockImplementation(
			async () =>
				await new Promise<string>((resolve) => {
					resolveConfirm = resolve;
				}),
		);

		const pending = useMessage().confirm('Discard changes?', 'Close without saving?');
		expect(hasActiveMessageBox.value).toBe(true);

		const escapeEvent = new KeyboardEvent('keydown', {
			key: 'Escape',
			bubbles: false,
			cancelable: true,
		});
		document.dispatchEvent(escapeEvent);

		resolveConfirm('close');
		await expect(pending).resolves.toBe('close');
		expect(hasActiveMessageBox.value).toBe(false);

		// Simulates a browser running promise callbacks between document and window listeners.
		expect(isEscapeConsumedByMessageBox(escapeEvent)).toBe(true);
		expect(
			isEscapeConsumedByMessageBox(
				new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
			),
		).toBe(false);
	});

	it('keeps the host layer mounted until a mounted overlay is removed, without relying on transition classes', async () => {
		let resolveConfirm!: (value: string) => void;
		let layerEl!: HTMLElement;
		let overlayEl!: HTMLDivElement;

		mockedBox.confirm.mockImplementation(async (_msg, _title, config) => {
			layerEl = config.appendTo as HTMLElement;
			overlayEl = document.createElement('div');
			layerEl.appendChild(overlayEl);
			return await new Promise<string>((resolve) => {
				resolveConfirm = resolve;
			});
		});

		const pending = useMessage().confirm('Discard changes?', 'Close without saving?');
		expect(hasActiveMessageBox.value).toBe(true);

		resolveConfirm('confirm');
		await expect(pending).resolves.toBe('confirm');

		// Active modal state clears immediately while the fading overlay stays in the DOM.
		expect(hasActiveMessageBox.value).toBe(false);
		expect(document.body.contains(layerEl)).toBe(true);
		expect(layerEl.contains(overlayEl)).toBe(true);
		expect(layerEl.style.pointerEvents).toBe('none');

		// Once Element Plus unmounts the overlay after leave completes, the host layer tears down.
		overlayEl.remove();
		await vi.waitFor(() => {
			expect(document.body.contains(layerEl)).toBe(false);
		});
	});

	it('cleans up a mounted overlay via fallback timer if it is never removed', async () => {
		vi.useFakeTimers();
		try {
			let resolveConfirm!: (value: string) => void;
			let layerEl!: HTMLElement;

			mockedBox.confirm.mockImplementation(async (_msg, _title, config) => {
				layerEl = config.appendTo as HTMLElement;
				const overlayEl = document.createElement('div');
				layerEl.appendChild(overlayEl);
				return await new Promise<string>((resolve) => {
					resolveConfirm = resolve;
				});
			});

			const pending = useMessage().confirm('Discard changes?', 'Close without saving?');
			resolveConfirm('confirm');
			await expect(pending).resolves.toBe('confirm');

			expect(document.body.contains(layerEl)).toBe(true);
			vi.advanceTimersByTime(600);
			expect(document.body.contains(layerEl)).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it('tears down immediately when the overlay is removed before the promise settles', async () => {
		let resolveConfirm!: (value: string) => void;
		let layerEl!: HTMLElement;
		let overlayEl!: HTMLDivElement;

		mockedBox.confirm.mockImplementation(async (_msg, _title, config) => {
			layerEl = config.appendTo as HTMLElement;
			overlayEl = document.createElement('div');
			layerEl.appendChild(overlayEl);
			return await new Promise<string>((resolve) => {
				resolveConfirm = resolve;
			});
		});

		const pending = useMessage().confirm('Discard changes?', 'Close without saving?');
		overlayEl.remove();
		resolveConfirm('confirm');
		await expect(pending).resolves.toBe('confirm');

		expect(hasActiveMessageBox.value).toBe(false);
		expect(document.body.contains(layerEl)).toBe(false);
	});

	it('tears down immediately when the message box rejects with an Error even if an overlay is mounted', async () => {
		let rejectAlert!: (reason: Error) => void;
		let layerEl!: HTMLElement;

		mockedBox.alert.mockImplementation(async (_msg, _title, config) => {
			layerEl = config.appendTo as HTMLElement;
			layerEl.appendChild(document.createElement('div'));
			return await new Promise<string>((_resolve, reject) => {
				rejectAlert = reject;
			});
		});

		const pending = useMessage().alert('Something failed', 'Error');
		rejectAlert(new Error('boom'));
		await expect(pending).rejects.toThrow('boom');

		expect(hasActiveMessageBox.value).toBe(false);
		expect(document.body.contains(layerEl)).toBe(false);
	});

	it('tears down immediately when the mounted overlay is already hidden', async () => {
		let resolveConfirm!: (value: string) => void;
		let layerEl!: HTMLElement;
		let overlayEl!: HTMLDivElement;

		mockedBox.confirm.mockImplementation(async (_msg, _title, config) => {
			layerEl = config.appendTo as HTMLElement;
			overlayEl = document.createElement('div');
			layerEl.appendChild(overlayEl);
			return await new Promise<string>((resolve) => {
				resolveConfirm = resolve;
			});
		});

		const pending = useMessage().confirm('Discard changes?', 'Close without saving?');
		overlayEl.style.display = 'none';
		resolveConfirm('confirm');
		await expect(pending).resolves.toBe('confirm');

		expect(hasActiveMessageBox.value).toBe(false);
		expect(document.body.contains(layerEl)).toBe(false);
	});

	it('tears down immediately when a wrapper holds a single hidden overlay', async () => {
		let resolveConfirm!: (value: string) => void;
		let layerEl!: HTMLElement;
		let overlayEl!: HTMLDivElement;

		mockedBox.confirm.mockImplementation(async (_msg, _title, config) => {
			layerEl = config.appendTo as HTMLElement;
			const wrapper = document.createElement('div');
			overlayEl = document.createElement('div');
			wrapper.appendChild(overlayEl);
			layerEl.appendChild(wrapper);
			return await new Promise<string>((resolve) => {
				resolveConfirm = resolve;
			});
		});

		const pending = useMessage().confirm('Discard changes?', 'Close without saving?');
		overlayEl.style.display = 'none';
		resolveConfirm('confirm');
		await expect(pending).resolves.toBe('confirm');

		expect(hasActiveMessageBox.value).toBe(false);
		expect(document.body.contains(layerEl)).toBe(false);
	});

	it('cleans up an asynchronously appended overlay once removed after settle', async () => {
		let resolveConfirm!: (value: string) => void;
		let layerEl!: HTMLElement;
		let overlayEl!: HTMLDivElement;

		mockedBox.confirm.mockImplementation(async (_msg, _title, config) => {
			layerEl = config.appendTo as HTMLElement;
			return await new Promise<string>((resolve) => {
				resolveConfirm = (value) => {
					overlayEl = document.createElement('div');
					layerEl.appendChild(overlayEl);
					resolve(value);
				};
			});
		});

		const pending = useMessage().confirm('Discard changes?', 'Close without saving?');
		resolveConfirm('confirm');
		await expect(pending).resolves.toBe('confirm');

		expect(document.body.contains(layerEl)).toBe(true);
		overlayEl.remove();
		await vi.waitFor(() => {
			expect(document.body.contains(layerEl)).toBe(false);
		});
	});
});
