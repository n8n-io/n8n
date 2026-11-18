import { fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';

import { NOW, listPage, renderBuiltinView } from '../__tests__/render-builtin-view';

/** Records the colors that the game draws with. */
function recordingContext() {
	const fills = new Set<string>();
	let fillStyle = '';
	const context = {
		get fillStyle() {
			return fillStyle;
		},
		set fillStyle(value: string) {
			fillStyle = value;
			fills.add(value);
		},
		strokeStyle: '',
		lineWidth: 1,
		fillRect: vi.fn(),
		clearRect: vi.fn(),
		setTransform: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		fill: vi.fn(),
		arc: vi.fn(),
		roundRect: vi.fn(),
	};
	return { context, fills };
}

describe('Arcade view', () => {
	let frames: FrameRequestCallback[];
	let time: number;

	/** Runs the animation frames that the game asks for, 16 ms apart. */
	async function advance(ms: number) {
		for (let elapsed = 0; elapsed < ms && frames.length > 0; elapsed += 16) {
			const pending = frames;
			frames = [];
			time += 16;
			for (const frame of pending) frame(time);
		}
		await nextTick();
	}

	const render = () => renderBuiltinView('builtin:arcade', listPage);
	const state = (view: ReturnType<typeof render>) =>
		view.getByTestId('arcade').getAttribute('data-state');
	const press = (key = ' ') => window.dispatchEvent(new KeyboardEvent('keydown', { key }));

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(NOW);
		frames = [];
		time = 0;
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => {
			frames.push(frame);
			return frames.length;
		});
		vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
			frames = [];
		});
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('waits for the player, with a score of zero', () => {
		const view = render();

		expect(state(view)).toBe('idle');
		expect(view.getByTestId('arcade-score').textContent).toBe('Score: 0');
		expect(view.getByTestId('arcade-best').textContent).toBe('Best: 0');
		expect(view.getByTestId('arcade-play').textContent?.trim()).toBe('Play');
		expect(frames).toHaveLength(0);
	});

	it('starts from the play button and counts the score as it runs', async () => {
		const view = render();

		await fireEvent.click(view.getByTestId('arcade-play'));
		await advance(1000);

		expect(state(view)).toBe('running');
		expect(view.queryByTestId('arcade-overlay')).toBeNull();
		expect(view.getByTestId('arcade-score').textContent).toBe('Score: 12');
	});

	it.each([' ', 'ArrowUp'])('jumps on "%s" and lands again', async (key) => {
		const view = render();
		press(key);
		await advance(100);
		expect(view.getByTestId('arcade').getAttribute('data-jumping')).toBe('false');

		press(key);
		await advance(100);
		expect(view.getByTestId('arcade').getAttribute('data-jumping')).toBe('true');

		await advance(600);
		expect(view.getByTestId('arcade').getAttribute('data-jumping')).toBe('false');
	});

	it('jumps when the player taps the game', async () => {
		const view = render();
		press();
		await advance(100);

		await fireEvent.pointerDown(view.getByTestId('arcade-canvas'));
		await advance(50);

		expect(view.getByTestId('arcade').getAttribute('data-jumping')).toBe('true');
	});

	it('ends when the dinosaur runs into a node, keeps the best score and plays again', async () => {
		const view = render();
		press();

		for (let i = 0; i < 100 && state(view) !== 'over'; i += 1) await advance(160);

		expect(state(view)).toBe('over');
		expect(view.getByTestId('arcade-game-over').textContent).toBe('Game over');
		const score = view.getByTestId('arcade-score').textContent?.replace('Score: ', '');
		expect(Number(score)).toBeGreaterThan(0);
		expect(view.getByTestId('arcade-best').textContent).toBe(`Best: ${score}`);
		expect(frames).toHaveLength(0);

		await fireEvent.click(view.getByTestId('arcade-play'));

		expect(state(view)).toBe('running');
		expect(view.getByTestId('arcade-score').textContent).toBe('Score: 0');
		expect(view.getByTestId('arcade-best').textContent).toBe(`Best: ${score}`);
	});

	it('pauses when the page is hidden, and resumes', async () => {
		const view = render();
		press();
		await advance(100);
		const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);

		document.dispatchEvent(new Event('visibilitychange'));
		await nextTick();

		expect(state(view)).toBe('paused');
		expect(frames).toHaveLength(0);
		expect(view.getByTestId('arcade-play').textContent?.trim()).toBe('Resume');

		hidden.mockReturnValue(false);
		await fireEvent.click(view.getByTestId('arcade-play'));
		expect(state(view)).toBe('running');
		expect(frames).toHaveLength(1);
	});

	it('pauses when the frame loses focus', async () => {
		const view = render();
		press();
		await advance(100);

		window.dispatchEvent(new Event('blur'));
		await nextTick();

		expect(state(view)).toBe('paused');
	});

	it('stops drawing when it closes during a game', async () => {
		const view = render();
		press();
		await advance(100);
		expect(frames).toHaveLength(1);

		view.unmount();

		expect(frames).toHaveLength(0);
	});

	it('stops listening to keys when it closes', () => {
		const view = render();

		view.unmount();
		// A key that the game still heard would start a game and ask for a frame.
		press();

		expect(frames).toHaveLength(0);
	});

	it('removes every listener that it added when it closes', () => {
		const added: Array<[EventTarget, string, unknown]> = [];
		for (const target of [window, document]) {
			const original = target.addEventListener.bind(target);
			vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => {
				added.push([target, type, listener]);
				original(type, listener, options);
			});
		}
		const removeFromWindow = vi.spyOn(window, 'removeEventListener');
		const removeFromDocument = vi.spyOn(document, 'removeEventListener');
		const view = render();
		const gameListeners = added.filter(([, type]) =>
			['keydown', 'blur', 'visibilitychange'].includes(type),
		);
		expect(gameListeners.map(([, type]) => type).sort()).toEqual([
			'blur',
			'keydown',
			'visibilitychange',
		]);

		view.unmount();

		for (const [target, type, listener] of gameListeners) {
			const remove = target === window ? removeFromWindow : removeFromDocument;
			expect(remove, type).toHaveBeenCalledWith(type, listener);
		}
	});

	it('draws with the colors of the theme', async () => {
		const { context, fills } = recordingContext();
		vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(
			context as unknown as CanvasRenderingContext2D,
		);
		// On the body, where the tokens of the system theme are.
		document.body.style.setProperty('--background--brand', 'rgb(1, 2, 3)');

		render();

		expect(fills).toContain('rgb(1, 2, 3)');
		expect(context.fillRect).toHaveBeenCalled();
		document.body.style.removeProperty('--background--brand');
	});

	it('shows a focus ring for keyboard focus only', async () => {
		const view = render();
		const canvas = view.getByTestId('arcade-canvas');
		const matches = vi.spyOn(canvas, 'matches').mockReturnValue(true);

		await fireEvent.focus(canvas);
		expect(canvas.getAttribute('data-focus-ring')).toBe('true');
		expect(canvas.style.outline).toContain('solid');

		await fireEvent.blur(canvas);
		expect(canvas.getAttribute('data-focus-ring')).toBe('false');

		matches.mockReturnValue(false);
		await fireEvent.focus(canvas);
		expect(canvas.getAttribute('data-focus-ring')).toBe('false');
		expect(canvas.style.outline).toBe('none');
	});

	it('only translates keys that the host sends it, in every state', async () => {
		const view = render();
		press();
		for (let i = 0; i < 100 && state(view) !== 'over'; i += 1) await advance(160);
		press();
		await advance(100);
		window.dispatchEvent(new Event('blur'));
		await nextTick();

		expect(state(view)).toBe('paused');
		for (const key of view.usedKeys) expect(Object.keys(view.strings), key).toContain(key);
		expect(view.usedKeys).toContain('uiExtensions.arcade.gameOver');
		expect(view.usedKeys).toContain('uiExtensions.arcade.resume');
	});
});
