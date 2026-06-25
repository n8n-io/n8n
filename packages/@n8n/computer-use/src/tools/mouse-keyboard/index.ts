import { logger } from '../../logger';
import type { ToolModule } from '../types';
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

export const MouseKeyboardModule: ToolModule = {
	async isSupported() {
		// Linux Wayland: no X display available for robotjs
		if (process.env.WAYLAND_DISPLAY && !process.env.DISPLAY) {
			logger.info('Mouse/keyboard module not supported', {
				reason: 'Wayland without X11 compatibility layer',
			});
			return false;
		}
		try {
			const robot = await import('@jitsi/robotjs');
			robot.default.getMousePos();
			return true;
		} catch (error) {
			logger.info('Mouse/keyboard module not supported', {
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	},
	definitions: [
		mouseMoveTool,
		mouseClickTool,
		mouseDoubleClickTool,
		mouseDragTool,
		mouseScrollTool,
		keyboardTypeTool,
		keyboardKeyTapTool,
		keyboardShortcutTool,
	],
};
