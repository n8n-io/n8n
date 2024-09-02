import { useKeybindings } from '@/composables/useKeybindings';
import { ref } from 'vue';

describe('useKeybindings', () => {
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
});
