import { z } from 'zod';

import { getPrimaryMonitor } from '../monitor-utils';
import type { ToolDefinition } from '../types';

const IS_MACOS = process.platform === 'darwin';
const IS_WINDOWS = process.platform === 'win32';

// ── Key normalization ─────────────────────────────────────────────────────────

/**
 * Map common human-facing aliases to the exact key names robotjs accepts.
 * robotjs key names: https://github.com/jitsi/robotjs/blob/master/src/keypress.c
 * robotjs is strict: unrecognised names throw "Invalid key flag specified".
 */
function normalizeKey(key: string): string {
	const k = key.toLowerCase();
	const aliases: Record<string, string> = {
		// Modifier aliases
		cmd: 'command',
		meta: 'command',
		super: 'command',
		win: 'command',
		windows: 'command',
		ctrl: 'control',
		option: 'alt', // macOS ⌥
		// Action key aliases
		return: 'enter', // robotjs uses "enter", not "return"
		esc: 'escape',
		del: 'delete',
		pgup: 'pageup',
		pgdn: 'pagedown',
		ins: 'insert',
		caps: 'capslock',
	};
	return aliases[k] ?? k;
}

// ── OS-aware description strings ──────────────────────────────────────────────

const MODIFIER_KEY_NAMES = IS_MACOS
	? '"command" (⌘, aliases: "cmd", "meta", "super"), "shift", "alt" (⌥, alias: "option"), "control" (alias: "ctrl")'
	: IS_WINDOWS
		? '"control" (alias: "ctrl"), "shift", "alt", "command" (Win key, aliases: "win", "windows", "super")'
		: '"control" (alias: "ctrl"), "shift", "alt", "command"';

const SHORTCUT_EXAMPLE = IS_MACOS
	? '["command","t"] for ⌘T, ["command","shift","z"] for ⌘⇧Z'
	: '["control","t"] for Ctrl+T, ["control","shift","z"] for Ctrl+Shift+Z';

// ── Mouse tools ──────────────────────────────────────────────────────────────

const screenSizeParams = {
	screenWidth: z
		.number()
		.int()
		.optional()
		.describe(
			'Width of the screen as the agent perceived it from the screenshot (pixels). ' +
				'Use the actual pixel width of the screenshot image you received.',
		),
	screenHeight: z
		.number()
		.int()
		.optional()
		.describe(
			'Height of the screen as the agent perceived it from the screenshot (pixels). ' +
				'Use the actual pixel height of the screenshot image you received.',
		),
};

/**
 * Scale agent coordinates to real monitor coordinates.
 *
 * The agent calculates positions based on the screenshot it receives.
 * When `screenWidth`/`screenHeight` are provided they represent the
 * image dimensions the agent used. We map those back to the real
 * logical monitor resolution using the same primary-monitor dimensions
 * that the screenshot tool uses.
 */
async function scaleCoord(
	x: number,
	y: number,
	screenWidth: number | undefined,
	screenHeight: number | undefined,
): Promise<{ x: number; y: number }> {
	if (!screenWidth || !screenHeight) return { x, y };
	const monitor = await getPrimaryMonitor();
	return {
		x: Math.round((x * monitor.width()) / screenWidth),
		y: Math.round((y * monitor.height()) / screenHeight),
	};
}

const mouseMoveSchema = z.object({
	x: z.number().int().describe('Target X coordinate in pixels'),
	y: z.number().int().describe('Target Y coordinate in pixels'),
	...screenSizeParams,
});

const COMPUTER_RESOURCE = {
	toolGroup: 'computer' as const,
	resource: '*',
	description: 'Access screen/input devices',
};

export const mouseMoveTool: ToolDefinition<typeof mouseMoveSchema> = {
	name: 'mouse_move',
	description: 'Move the mouse cursor to the specified screen coordinates',
	inputSchema: mouseMoveSchema,
	annotations: {},
	getAffectedResources() {
		return [COMPUTER_RESOURCE];
	},
	async execute({ x, y, screenWidth, screenHeight }) {
		const { default: robot } = await import('@jitsi/robotjs');
		const scaled = await scaleCoord(x, y, screenWidth, screenHeight);
		robot.moveMouse(scaled.x, scaled.y);
		return { content: [{ type: 'text', text: 'ok' }] };
	},
};

const mouseClickSchema = z.object({
	x: z.number().int().describe('X coordinate to click'),
	y: z.number().int().describe('Y coordinate to click'),
	button: z.enum(['left', 'right', 'middle']).optional().describe('Mouse button (default: left)'),
	...screenSizeParams,
});

export const mouseClickTool: ToolDefinition<typeof mouseClickSchema> = {
	name: 'mouse_click',
	description: 'Move the mouse to the specified coordinates and click',
	inputSchema: mouseClickSchema,
	annotations: {},
	getAffectedResources() {
		return [COMPUTER_RESOURCE];
	},
	async execute({ x, y, button = 'left', screenWidth, screenHeight }) {
		const { default: robot } = await import('@jitsi/robotjs');
		const scaled = await scaleCoord(x, y, screenWidth, screenHeight);
		robot.moveMouse(scaled.x, scaled.y);
		robot.mouseClick(button);
		return { content: [{ type: 'text', text: 'ok' }] };
	},
};

const mouseDoubleClickSchema = z.object({
	x: z.number().int().describe('X coordinate to double-click'),
	y: z.number().int().describe('Y coordinate to double-click'),
	...screenSizeParams,
});

export const mouseDoubleClickTool: ToolDefinition<typeof mouseDoubleClickSchema> = {
	name: 'mouse_double_click',
	description: 'Move the mouse to the specified coordinates and double-click',
	inputSchema: mouseDoubleClickSchema,
	annotations: {},
	getAffectedResources() {
		return [COMPUTER_RESOURCE];
	},
	async execute({ x, y, screenWidth, screenHeight }) {
		const { default: robot } = await import('@jitsi/robotjs');
		const scaled = await scaleCoord(x, y, screenWidth, screenHeight);
		robot.moveMouse(scaled.x, scaled.y);
		robot.mouseClick('left', true);
		return { content: [{ type: 'text', text: 'ok' }] };
	},
};

const mouseDragSchema = z.object({
	fromX: z.number().int().describe('Starting X coordinate'),
	fromY: z.number().int().describe('Starting Y coordinate'),
	toX: z.number().int().describe('Target X coordinate'),
	toY: z.number().int().describe('Target Y coordinate'),
	...screenSizeParams,
});

export const mouseDragTool: ToolDefinition<typeof mouseDragSchema> = {
	name: 'mouse_drag',
	description: 'Click-drag from one coordinate to another',
	inputSchema: mouseDragSchema,
	annotations: {},
	getAffectedResources() {
		return [COMPUTER_RESOURCE];
	},
	async execute({ fromX, fromY, toX, toY, screenWidth, screenHeight }) {
		const { default: robot } = await import('@jitsi/robotjs');
		const scaledFrom = await scaleCoord(fromX, fromY, screenWidth, screenHeight);
		const scaledTo = await scaleCoord(toX, toY, screenWidth, screenHeight);
		robot.moveMouse(scaledFrom.x, scaledFrom.y);
		robot.mouseToggle('down');
		robot.dragMouse(scaledTo.x, scaledTo.y);
		robot.mouseToggle('up');
		return { content: [{ type: 'text', text: 'ok' }] };
	},
};

const mouseScrollSchema = z.object({
	x: z.number().int().describe('X coordinate to scroll at'),
	y: z.number().int().describe('Y coordinate to scroll at'),
	direction: z.enum(['up', 'down', 'left', 'right']).describe('Scroll direction'),
	amount: z.number().int().describe('Number of scroll ticks'),
	...screenSizeParams,
});

export const mouseScrollTool: ToolDefinition<typeof mouseScrollSchema> = {
	name: 'mouse_scroll',
	description: 'Scroll at the specified screen coordinates',
	inputSchema: mouseScrollSchema,
	annotations: {},
	getAffectedResources() {
		return [COMPUTER_RESOURCE];
	},
	async execute({ x, y, direction, amount, screenWidth, screenHeight }) {
		const { default: robot } = await import('@jitsi/robotjs');
		const scaled = await scaleCoord(x, y, screenWidth, screenHeight);
		robot.moveMouse(scaled.x, scaled.y);
		// robotjs scrollMouse(x, y): positive x = right, positive y = down
		const dx = direction === 'right' ? amount : direction === 'left' ? -amount : 0;
		const dy = direction === 'down' ? amount : direction === 'up' ? -amount : 0;
		robot.scrollMouse(dx, dy);
		return { content: [{ type: 'text', text: 'ok' }] };
	},
};

// ── Keyboard tools ───────────────────────────────────────────────────────────

const keyboardTypeSchema = z.object({
	text: z.string().describe('Text to type'),
	delayMs: z
		.number()
		.int()
		.optional()
		.describe(
			'Milliseconds to wait before typing. Use this when the target input field needs time to ' +
				'gain focus after a prior action (e.g. opening a new tab). Default: 0 (type immediately).',
		),
});

export const keyboardTypeTool: ToolDefinition<typeof keyboardTypeSchema> = {
	name: 'keyboard_type',
	description: 'Type a string of text using the keyboard',
	inputSchema: keyboardTypeSchema,
	annotations: {},
	getAffectedResources() {
		return [COMPUTER_RESOURCE];
	},
	async execute({ text, delayMs }) {
		const { default: robot } = await import('@jitsi/robotjs');
		if (delayMs) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
		robot.typeStringDelayed(text, 60 * 4);
		return { content: [{ type: 'text', text: 'ok' }] };
	},
};

const keyboardKeyTapSchema = z.object({
	key: z
		.string()
		.describe(
			'Key to press. Special keys: "enter", "escape", "tab", "backspace", "delete", "space", ' +
				'"up", "down", "left", "right", "home", "end", "pageup", "pagedown", "insert", ' +
				'"capslock", "printscreen", "menu", "f1"–"f24". ' +
				'Numpad: "numpad_0"–"numpad_9", "numpad_+", "numpad_-", "numpad_*", "numpad_/", "numpad_.", "numpad_lock". ' +
				'Media: "audio_mute", "audio_vol_up", "audio_vol_down", "audio_play", "audio_stop", "audio_pause", "audio_prev", "audio_next". ' +
				'Aliases: "esc"→"escape", "del"→"delete", "pgup"→"pageup", "pgdn"→"pagedown", "ins"→"insert", "return"→"enter", "caps"→"capslock". ' +
				'For single characters just pass the character directly (e.g. "a", "1", ".").',
		),
});

export const keyboardKeyTapTool: ToolDefinition<typeof keyboardKeyTapSchema> = {
	name: 'keyboard_key_tap',
	description: 'Press and release a single key. Use keyboard_shortcut for key combinations.',
	inputSchema: keyboardKeyTapSchema,
	annotations: {},
	getAffectedResources() {
		return [COMPUTER_RESOURCE];
	},
	async execute({ key }) {
		const { default: robot } = await import('@jitsi/robotjs');
		robot.keyTap(normalizeKey(key));
		return { content: [{ type: 'text', text: 'ok' }] };
	},
};

const keyboardShortcutSchema = z.object({
	keys: z
		.array(z.string())
		.min(1)
		.describe(
			'Keys in the shortcut. Last element is tapped; all preceding are held as modifiers. ' +
				`Modifier names: ${MODIFIER_KEY_NAMES}. ` +
				`Examples: ${SHORTCUT_EXAMPLE}.`,
		),
});

export const keyboardShortcutTool: ToolDefinition<typeof keyboardShortcutSchema> = {
	name: 'keyboard_shortcut',
	description: `Press a keyboard shortcut (e.g. ${IS_MACOS ? '⌘C, ⌘⇧Z' : 'Ctrl+C, Ctrl+Shift+Z'})`,
	inputSchema: keyboardShortcutSchema,
	annotations: {},
	getAffectedResources() {
		return [COMPUTER_RESOURCE];
	},
	async execute({ keys }) {
		const { default: robot } = await import('@jitsi/robotjs');
		const modifiers = keys.slice(0, -1).map(normalizeKey);
		const key = normalizeKey(keys.at(-1)!);
		robot.keyTap(key, modifiers);
		return { content: [{ type: 'text', text: 'ok' }] };
	},
};
