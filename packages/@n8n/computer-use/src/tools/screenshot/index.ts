import { ModuleActivation, type ToolModule } from '../types';
import { screenshotRegionTool, screenshotTool } from './screenshot';

export const ScreenshotModule: ToolModule = {
	name: 'Screenshot',
	category: 'screenshot',
	permissionGroup: 'computer',
	async activate() {
		try {
			const { Monitor } = await import('node-screenshots');
			if (Monitor.all().length === 0) {
				return ModuleActivation.unsupported('No monitors detected');
			}
			return ModuleActivation.supported([screenshotTool, screenshotRegionTool]);
		} catch (error) {
			return ModuleActivation.unsupported(error instanceof Error ? error.message : String(error));
		}
	},
};
