import robot from '@jitsi/robotjs';

import { MouseKeyboardModule } from './index';
import {
	mouseMoveTool,
	mouseClickTool,
	mouseDoubleClickTool,
	mouseDragTool,
	mouseScrollTool,
	keyboardTypeTool,
	keyboardKeyTapTool,
	keyboardShortcutTool,
} from './mouse-keyboard';

jest.mock('@jitsi/robotjs', () => ({
	__esModule: true,
	default: {
		moveMouse: jest.fn(),
		mouseClick: jest.fn(),
		mouseToggle: jest.fn(),
		dragMouse: jest.fn(),
		scrollMouse: jest.fn(),
		typeString: jest.fn(),
		typeStringDelayed: jest.fn(),
		keyTap: jest.fn(),
		getMousePos: jest.fn(),
	},
}));

const mockRobot = robot as jest.Mocked<typeof robot>;

const DUMMY_CONTEXT = { dir: '/test/base' };
const OK_RESULT = { content: [{ type: 'text' as const, text: 'ok' }] };

afterEach(() => {
	jest.clearAllMocks();
});

describe('mouse_move', () => {
	it('calls moveMouse with the specified coordinates', () => {
		const result = mouseMoveTool.execute({ x: 100, y: 200 }, DUMMY_CONTEXT);

		expect(mockRobot.moveMouse).toHaveBeenCalledWith(100, 200);
		expect(result).toEqual(OK_RESULT);
	});
});

describe('mouse_click', () => {
	it.each([
		['left', 100, 50],
		['right', 300, 400],
		['middle', 0, 0],
	] as const)('moves then clicks with %s button', (button, x, y) => {
		const result = mouseClickTool.execute({ x, y, button }, DUMMY_CONTEXT);

		expect(mockRobot.moveMouse).toHaveBeenCalledWith(x, y);
		expect(mockRobot.mouseClick).toHaveBeenCalledWith(button);
		expect(result).toEqual(OK_RESULT);
	});

	it('defaults to left button when no button is specified', () => {
		void mouseClickTool.execute({ x: 10, y: 20 }, DUMMY_CONTEXT);

		expect(mockRobot.mouseClick).toHaveBeenCalledWith('left');
	});
});

describe('mouse_double_click', () => {
	it('calls mouseClick with left button and double=true', () => {
		const result = mouseDoubleClickTool.execute({ x: 50, y: 75 }, DUMMY_CONTEXT);

		expect(mockRobot.moveMouse).toHaveBeenCalledWith(50, 75);
		expect(mockRobot.mouseClick).toHaveBeenCalledWith('left', true);
		expect(result).toEqual(OK_RESULT);
	});
});

describe('mouse_drag', () => {
	it('moves, toggles down, drags, toggles up in order', () => {
		const callOrder: string[] = [];
		(mockRobot.moveMouse as jest.Mock).mockImplementation(() => callOrder.push('moveMouse'));
		(mockRobot.mouseToggle as jest.Mock).mockImplementation((dir: string) =>
			callOrder.push(`toggle-${dir}`),
		);
		(mockRobot.dragMouse as jest.Mock).mockImplementation(() => callOrder.push('dragMouse'));

		const result = mouseDragTool.execute(
			{ fromX: 10, fromY: 20, toX: 100, toY: 200 },
			DUMMY_CONTEXT,
		);

		expect(mockRobot.moveMouse).toHaveBeenCalledWith(10, 20);
		expect(mockRobot.mouseToggle).toHaveBeenNthCalledWith(1, 'down');
		expect(mockRobot.dragMouse).toHaveBeenCalledWith(100, 200);
		expect(mockRobot.mouseToggle).toHaveBeenNthCalledWith(2, 'up');
		expect(callOrder).toEqual(['moveMouse', 'toggle-down', 'dragMouse', 'toggle-up']);
		expect(result).toEqual(OK_RESULT);
	});
});

describe('mouse_scroll', () => {
	it.each([
		['up', 3, 0, -3],
		['down', 5, 0, 5],
		['left', 2, -2, 0],
		['right', 4, 4, 0],
	] as const)(
		'direction %s with amount %i passes dx=%i dy=%i to scrollMouse',
		(direction, amount, expectedDx, expectedDy) => {
			const result = mouseScrollTool.execute({ x: 50, y: 50, direction, amount }, DUMMY_CONTEXT);

			expect(mockRobot.moveMouse).toHaveBeenCalledWith(50, 50);
			expect(mockRobot.scrollMouse).toHaveBeenCalledWith(expectedDx, expectedDy);
			expect(result).toEqual(OK_RESULT);
		},
	);
});

describe('keyboard_type', () => {
	it('calls typeStringDelayed with the provided text', async () => {
		const result = await keyboardTypeTool.execute({ text: 'Hello, World!' }, DUMMY_CONTEXT);

		expect(mockRobot.typeStringDelayed).toHaveBeenCalledWith('Hello, World!', expect.any(Number));
		expect(result).toEqual(OK_RESULT);
	});

	it('waits for delayMs before typing', async () => {
		jest.useFakeTimers();

		const promise = keyboardTypeTool.execute({ text: 'delayed', delayMs: 500 }, DUMMY_CONTEXT);

		// typeStringDelayed should not have been called yet
		expect(mockRobot.typeStringDelayed).not.toHaveBeenCalled();

		jest.advanceTimersByTime(500);
		await promise;

		expect(mockRobot.typeStringDelayed).toHaveBeenCalledWith('delayed', expect.any(Number));

		jest.useRealTimers();
	});

	it('types immediately when delayMs is 0', async () => {
		const result = await keyboardTypeTool.execute({ text: 'instant', delayMs: 0 }, DUMMY_CONTEXT);

		expect(mockRobot.typeStringDelayed).toHaveBeenCalledWith('instant', expect.any(Number));
		expect(result).toEqual(OK_RESULT);
	});

	it('types immediately when delayMs is omitted', async () => {
		const result = await keyboardTypeTool.execute({ text: 'no delay' }, DUMMY_CONTEXT);

		expect(mockRobot.typeStringDelayed).toHaveBeenCalledWith('no delay', expect.any(Number));
		expect(result).toEqual(OK_RESULT);
	});
});

describe('keyboard_key_tap', () => {
	it('passes the key directly to keyTap', () => {
		const result = keyboardKeyTapTool.execute({ key: 'enter' }, DUMMY_CONTEXT);

		expect(mockRobot.keyTap).toHaveBeenCalledWith('enter');
		expect(result).toEqual(OK_RESULT);
	});

	it('normalizes "return" alias to "enter"', () => {
		const result = keyboardKeyTapTool.execute({ key: 'return' }, DUMMY_CONTEXT);

		expect(mockRobot.keyTap).toHaveBeenCalledWith('enter');
		expect(result).toEqual(OK_RESULT);
	});

	it('normalizes "esc" alias to "escape"', () => {
		const result = keyboardKeyTapTool.execute({ key: 'esc' }, DUMMY_CONTEXT);

		expect(mockRobot.keyTap).toHaveBeenCalledWith('escape');
		expect(result).toEqual(OK_RESULT);
	});
});

describe('keyboard_shortcut', () => {
	it.each([
		[['ctrl', 'c'], 'c', ['control']],
		[['ctrl', 'shift', 'z'], 'z', ['control', 'shift']],
		[['enter'], 'enter', []],
		[['cmd', 'alt', 'delete'], 'delete', ['command', 'alt']],
	] as const)(
		'keys %p → taps %s with normalized modifiers %p',
		(keys, expectedKey, expectedModifiers) => {
			const result = keyboardShortcutTool.execute({ keys: [...keys] }, DUMMY_CONTEXT);

			expect(mockRobot.keyTap).toHaveBeenCalledWith(expectedKey, expectedModifiers);
			expect(result).toEqual(OK_RESULT);
		},
	);
});

describe('MouseKeyboardModule.isSupported', () => {
	const originalWaylandDisplay = process.env.WAYLAND_DISPLAY;
	const originalDisplay = process.env.DISPLAY;

	afterEach(() => {
		// Restore env vars
		if (originalWaylandDisplay === undefined) {
			delete process.env.WAYLAND_DISPLAY;
		} else {
			process.env.WAYLAND_DISPLAY = originalWaylandDisplay;
		}
		if (originalDisplay === undefined) {
			delete process.env.DISPLAY;
		} else {
			process.env.DISPLAY = originalDisplay;
		}
		jest.resetModules();
	});

	it('returns false when WAYLAND_DISPLAY is set and DISPLAY is not', async () => {
		process.env.WAYLAND_DISPLAY = 'wayland-0';
		delete process.env.DISPLAY;

		const result = await MouseKeyboardModule.isSupported();

		expect(result).toBe(false);
	});

	it('returns true when robot loads successfully', async () => {
		delete process.env.WAYLAND_DISPLAY;
		process.env.DISPLAY = ':0';

		// The mock is already set up with getMousePos returning undefined (no throw)
		const result = await MouseKeyboardModule.isSupported();

		expect(result).toBe(true);
	});

	it('returns false when robot native bindings fail to load', async () => {
		delete process.env.WAYLAND_DISPLAY;
		process.env.DISPLAY = ':0';

		let result: boolean | undefined;

		await jest.isolateModulesAsync(async () => {
			jest.doMock('@jitsi/robotjs', () => ({
				__esModule: true,
				default: {
					getMousePos: () => {
						throw new Error('Native module error');
					},
				},
			}));

			const { MouseKeyboardModule: IsolatedModule } = await import('./index');
			result = await IsolatedModule.isSupported();
		});

		expect(result).toBe(false);
	});
});
