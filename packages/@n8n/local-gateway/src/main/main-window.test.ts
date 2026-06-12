const mocks = vi.hoisted(() => {
	const dock = {
		visible: true,
		isVisible: vi.fn((): boolean => dock.visible),
		show: vi.fn(async (): Promise<void> => {
			dock.visible = true;
			await Promise.resolve();
		}),
		hide: vi.fn((): void => {
			dock.visible = false;
		}),
		setIcon: vi.fn(),
	};

	class FakeBrowserWindow {
		static instances: FakeBrowserWindow[] = [];

		private readonly handlers = new Map<string, (...args: unknown[]) => void>();

		visible = false;
		minimized = false;
		focused = false;

		webContents = { send: vi.fn(), on: vi.fn() };
		loadURL = vi.fn(async () => {});
		loadFile = vi.fn(async () => {});

		show = vi.fn(() => {
			this.visible = true;
			this.focused = true;
			this.emit('show');
		});

		hide = vi.fn(() => {
			this.visible = false;
			this.emit('hide');
		});

		restore = vi.fn(() => {
			this.minimized = false;
		});

		focus = vi.fn();

		constructor(readonly options: Record<string, unknown>) {
			FakeBrowserWindow.instances.push(this);
		}

		on(event: string, handler: (...args: unknown[]) => void) {
			this.handlers.set(event, handler);
		}

		emit(event: string, ...args: unknown[]) {
			this.handlers.get(event)?.(...args);
		}

		isVisible() {
			return this.visible;
		}

		isMinimized() {
			return this.minimized;
		}

		isFocused() {
			return this.focused;
		}

		isDestroyed() {
			return false;
		}
	}

	const appHandlers = new Map<string, () => void>();

	return {
		dock,
		['FakeBrowserWindow']: FakeBrowserWindow,
		appHandlers,
		app: {
			dock,
			on: (event: string, handler: () => void) => appHandlers.set(event, handler),
			getAppPath: () => '/app',
		},
	};
});

vi.mock('electron', () => ({
	app: mocks.app,
	['BrowserWindow']: mocks.FakeBrowserWindow,
	nativeTheme: { shouldUseDarkColors: true },
}));

// The module holds singleton state (window instance, quitting flag) — re-import per test.
async function loadMainWindow() {
	vi.resetModules();
	return await import('./main-window.js');
}

function getWindow() {
	const window = mocks.FakeBrowserWindow.instances[0];
	if (!window) throw new Error('no window created');
	return window;
}

async function flushMicrotasks() {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
}

describe('main-window', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.FakeBrowserWindow.instances = [];
		mocks.dock.visible = true;
		mocks.appHandlers.clear();
	});

	it('creates a single non-resizable, non-maximizable, 630px wide window', async () => {
		const { showMainWindow } = await loadMainWindow();
		showMainWindow('preload', 'renderer');
		showMainWindow('preload', 'renderer');

		expect(mocks.FakeBrowserWindow.instances).toHaveLength(1);
		expect(getWindow().options).toMatchObject({
			width: 630,
			resizable: false,
			maximizable: false,
			fullscreenable: false,
		});
	});

	it('hides the window and the Dock entry on close instead of destroying it', async () => {
		const { showMainWindow } = await loadMainWindow();
		showMainWindow('preload', 'renderer');
		const window = getWindow();

		const event = { preventDefault: vi.fn() };
		window.emit('close', event);

		expect(event.preventDefault).toHaveBeenCalled();
		expect(window.hide).toHaveBeenCalled();
		expect(mocks.dock.hide).toHaveBeenCalled();
	});

	it('lets close through once the app is quitting', async () => {
		const { showMainWindow } = await loadMainWindow();
		showMainWindow('preload', 'renderer');
		const window = getWindow();

		mocks.appHandlers.get('before-quit')?.();
		const event = { preventDefault: vi.fn() };
		window.emit('close', event);

		expect(event.preventDefault).not.toHaveBeenCalled();
		expect(window.hide).not.toHaveBeenCalled();
	});

	it('keeps the Dock entry on a hide event (macOS also emits it for occluded windows)', async () => {
		const { showMainWindow } = await loadMainWindow();
		showMainWindow('preload', 'renderer');

		getWindow().hide();

		expect(mocks.dock.hide).not.toHaveBeenCalled();
	});

	it('restores the Dock entry and icon before showing a reopened window', async () => {
		const { showMainWindow } = await loadMainWindow();
		showMainWindow('preload', 'renderer');
		const window = getWindow();
		window.emit('close', { preventDefault: vi.fn() });
		vi.clearAllMocks();

		showMainWindow('preload', 'renderer');
		expect(window.show).not.toHaveBeenCalled();
		await flushMicrotasks();

		expect(mocks.dock.show).toHaveBeenCalled();
		expect(window.show).toHaveBeenCalled();
		expect(mocks.dock.setIcon.mock.invocationCallOrder[0]).toBeLessThan(
			window.show.mock.invocationCallOrder[0],
		);
	});

	it('never hides a visible, focused window', async () => {
		const { showMainWindow } = await loadMainWindow();
		showMainWindow('preload', 'renderer');
		const window = getWindow();
		vi.clearAllMocks();

		showMainWindow('preload', 'renderer');

		expect(window.hide).not.toHaveBeenCalled();
		expect(window.show).toHaveBeenCalled();
	});

	it('restores a minimized window before showing it', async () => {
		const { showMainWindow } = await loadMainWindow();
		showMainWindow('preload', 'renderer');
		const window = getWindow();
		window.minimized = true;
		vi.clearAllMocks();

		showMainWindow('preload', 'renderer');

		expect(window.restore).toHaveBeenCalled();
		expect(window.restore.mock.invocationCallOrder[0]).toBeLessThan(
			window.show.mock.invocationCallOrder[0],
		);
	});

	it('broadcasts windowActiveChanged on show, focus, and hide', async () => {
		const { showMainWindow } = await loadMainWindow();
		showMainWindow('preload', 'renderer');
		const window = getWindow();
		expect(window.webContents.send).toHaveBeenLastCalledWith('windowActiveChanged', true);

		window.hide();
		expect(window.webContents.send).toHaveBeenLastCalledWith('windowActiveChanged', false);

		window.emit('focus');
		expect(window.webContents.send).toHaveBeenLastCalledWith('windowActiveChanged', true);
	});
});
