import { observeInstanceAiResponseRender } from '../instanceAi.responseTiming';

describe('observeInstanceAiResponseRender', () => {
	let visibility: DocumentVisibilityState;
	let frame: FrameRequestCallback | undefined;

	beforeEach(() => {
		visibility = 'visible';
		frame = undefined;
		vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
		vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
			frame = callback;
			return 1;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('resolves on the next frame in a visible tab', async () => {
		const rendered = observeInstanceAiResponseRender();
		await vi.waitFor(() => expect(frame).toBeDefined());
		frame?.(0);

		await expect(rendered).resolves.toMatchObject({ tabVisible: true });
	});

	it('resolves as hidden when the tab goes hidden before the next frame', async () => {
		const rendered = observeInstanceAiResponseRender();
		await vi.waitFor(() => expect(frame).toBeDefined());
		visibility = 'hidden';
		document.dispatchEvent(new Event('visibilitychange'));

		await expect(rendered).resolves.toMatchObject({ tabVisible: false });
	});

	it('does not wait for a frame in a hidden tab', async () => {
		visibility = 'hidden';

		await expect(observeInstanceAiResponseRender()).resolves.toMatchObject({ tabVisible: false });
		expect(frame).toBeUndefined();
	});
});
