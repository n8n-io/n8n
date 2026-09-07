import { ModuleActivation, type ToolModule } from '../types';
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
	name: 'MouseKeyboard',
	category: 'mouse-keyboard',
	permissionGroup: 'computer',
	async activate() {
		if (process.env.WAYLAND_DISPLAY && !process.env.DISPLAY) {
			return ModuleActivation.unsupported('Wayland without X11 compatibility layer');
		}
		try {
			const robot = await import('@jitsi/robotjs');
			robot.default.getMousePos();
			return ModuleActivation.supported([
				mouseMoveTool,
				mouseClickTool,
				mouseDoubleClickTool,
				mouseDragTool,
				mouseScrollTool,
				keyboardTypeTool,
				keyboardKeyTapTool,
				keyboardShortcutTool,
			]);
		} catch (error) {
			return ModuleActivation.unsupported(error instanceof Error ? error.message : String(error));
		}
	},
};
