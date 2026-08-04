import { onKeyDown, onKeyUp } from '@vueuse/core';
import { ref } from 'vue';

import { useShortKeyPress } from './useShortKeyPress';

vi.mock('@vueuse/core', () => ({
	onKeyDown: vi.fn(),
	onKeyUp: vi.fn(),
}));

describe('useShortKeyPress', () => {
	it('should call the function on short key press', async () => {
		vi.useFakeTimers();

		const fn = vi.fn();
		const key = 'a';
		const threshold = 300;
		const disabled = ref(false);

		useShortKeyPress(key, fn, { threshold, disabled });

		const keyDownHandler = vi.mocked(onKeyDown).mock.calls[0][1];
		const keyUpHandler = vi.mocked(onKeyUp).mock.calls[0][1];

		keyDownHandler(new KeyboardEvent('keydown', { key }));
		await vi.advanceTimersByTimeAsync(100);
		keyUpHandler(new KeyboardEvent('keydown', { key }));

		expect(fn).toHaveBeenCalled();
	});

	it('should not call the function if key press duration exceeds threshold', async () => {
		vi.useFakeTimers();

		const fn = vi.fn();
		const key = 'a';
		const threshold = 300;
		const disabled = ref(false);

		useShortKeyPress(key, fn, { threshold, disabled });

		const keyDownHandler = vi.mocked(onKeyDown).mock.calls[0][1];
		const keyUpHandler = vi.mocked(onKeyUp).mock.calls[0][1];

		keyDownHandler(new KeyboardEvent('keydown', { key }));
		await vi.advanceTimersByTimeAsync(400);
		keyUpHandler(new KeyboardEvent('keydown', { key }));

		expect(fn).not.toHaveBeenCalled();
	});

	it('should not call the function if disabled is true', async () => {
		vi.useFakeTimers();

		const fn = vi.fn();
		const key = 'a';
		const threshold = 300;
		const disabled = ref(true);

		useShortKeyPress(key, fn, { threshold, disabled });

		const keyDownHandler = vi.mocked(onKeyDown).mock.calls[0][1];
		const keyUpHandler = vi.mocked(onKeyUp).mock.calls[0][1];

		keyDownHandler(new KeyboardEvent('keydown', { key }));
		await vi.advanceTimersByTimeAsync(100);
		keyUpHandler(new KeyboardEvent('keydown', { key }));

		expect(fn).not.toHaveBeenCalled();
	});
});
