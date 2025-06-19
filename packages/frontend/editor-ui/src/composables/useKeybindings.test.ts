import { renderComponent } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { useKeybindings } from './useKeybindings';

const renderTestComponent = async (...args: Parameters<typeof useKeybindings>) => {
	return renderComponent(
		defineComponent({
			setup() {
				useKeybindings(...args);
				return () => h('div', [h('input')]);
			},
		}),
	);
};

describe('useKeybindings', () => {
	it('should trigger case-insensitive keyboard shortcuts', async () => {
		const saveSpy = vi.fn();
		const saveAllSpy = vi.fn();
		const keymap = ref({ Ctrl_s: saveSpy, ctrl_Shift_S: saveAllSpy });
		await renderTestComponent(keymap);
		await userEvent.keyboard('{Control>}s');
		expect(saveSpy).toHaveBeenCalled();
		expect(saveAllSpy).not.toHaveBeenCalled();

		await userEvent.keyboard('{Control>}{Shift>}s');
		expect(saveAllSpy).toHaveBeenCalled();
	});

	it('should not trigger shortcuts when an input element has focus', async () => {
		const saveSpy = vi.fn();
		const saveAllSpy = vi.fn();
		const keymap = ref({ Ctrl_s: saveSpy, ctrl_Shift_S: saveAllSpy });
		const { getByRole } = await renderTestComponent(keymap);

		getByRole('textbox').focus();

		await userEvent.keyboard('{Control>}s');
		await userEvent.keyboard('{Control>}{Shift>}s');

		expect(saveSpy).not.toHaveBeenCalled();
		expect(saveAllSpy).not.toHaveBeenCalled();
	});

	it('should call the correct handler for a single key press', async () => {
		const handler = vi.fn();
		const keymap = ref({ a: handler });

		useKeybindings(keymap);

		const event = new KeyboardEvent('keydown', { key: 'a' });
		document.dispatchEvent(event);

		expect(handler).toHaveBeenCalled();
	});

	it('should call the correct handler for a combination key press', async () => {
		const handler = vi.fn();
		const keymap = ref({ 'ctrl+a': handler });

		useKeybindings(keymap);

		const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });
		document.dispatchEvent(event);

		expect(handler).toHaveBeenCalled();
	});

	it('should not call handler if key press is ignored', async () => {
		const handler = vi.fn();
		const keymap = ref({ a: handler });

		useKeybindings(keymap);

		const input = document.createElement('input');
		document.body.appendChild(input);
		input.focus();

		const event = new KeyboardEvent('keydown', { key: 'a' });
		document.dispatchEvent(event);

		expect(handler).not.toHaveBeenCalled();
		document.body.removeChild(input);
	});

	it('should not call handler if disabled', async () => {
		const handler = vi.fn();
		const keymap = ref({ a: handler });
		const disabled = ref(true);

		useKeybindings(keymap, { disabled });

		const event = new KeyboardEvent('keydown', { key: 'a' });
		document.dispatchEvent(event);

		expect(handler).not.toHaveBeenCalled();
	});

	it('should normalize shortcut strings correctly', async () => {
		const handler = vi.fn();
		const keymap = ref({ 'ctrl+shift+a': handler });

		useKeybindings(keymap);

		const event = new KeyboardEvent('keydown', { key: 'A', ctrlKey: true, shiftKey: true });
		document.dispatchEvent(event);

		expect(handler).toHaveBeenCalled();
	});

	it('should normalize shortcut strings containing splitting key correctly', async () => {
		const handler = vi.fn();
		const keymap = ref({ 'ctrl_+': handler });

		useKeybindings(keymap);

		const event = new KeyboardEvent('keydown', { key: '+', ctrlKey: true });
		document.dispatchEvent(event);

		expect(handler).toHaveBeenCalled();
	});

	it('should normalize shortcut string alternatives correctly', async () => {
		const handler = vi.fn();
		const keymap = ref({ 'a|b': handler });

		useKeybindings(keymap);

		const eventA = new KeyboardEvent('keydown', { key: 'A' });
		document.dispatchEvent(eventA);
		expect(handler).toHaveBeenCalled();

		const eventB = new KeyboardEvent('keydown', { key: 'B' });
		document.dispatchEvent(eventB);
		expect(handler).toHaveBeenCalledTimes(2);
	});

	it("should prefer the 'key' over 'code' for dvorak to work correctly", () => {
		const cHandler = vi.fn();
		const iHandler = vi.fn();
		const keymap = ref({
			'ctrl+c': cHandler,
			'ctrl+i': iHandler,
		});

		useKeybindings(keymap);

		const event = new KeyboardEvent('keydown', { key: 'c', code: 'KeyI', ctrlKey: true });
		document.dispatchEvent(event);
		expect(cHandler).toHaveBeenCalled();
		expect(iHandler).not.toHaveBeenCalled();
	});

	it("should fallback to 'code' for non-ansi layouts", () => {
		const handler = vi.fn();
		const keymap = ref({ 'ctrl+c': handler });

		useKeybindings(keymap);

		const event = new KeyboardEvent('keydown', { key: 'ב', code: 'KeyC', ctrlKey: true });
		document.dispatchEvent(event);
		expect(handler).toHaveBeenCalled();
	});
});
