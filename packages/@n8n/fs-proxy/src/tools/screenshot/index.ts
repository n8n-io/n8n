import { logger } from '../../logger';
import type { ToolModule } from '../types';
import { screenshotRegionTool, screenshotTool } from './screenshot';

export const ScreenshotModule: ToolModule = {
	async isSupported() {
		try {
			const { Monitor } = await import('node-screenshots');
			const monitors = Monitor.all();
			if (monitors.length === 0) {
				logger.info('Screenshot module not supported', { reason: 'no monitors detected' });
				return false;
			}
			return true;
		} catch (error) {
			logger.info('Screenshot module not supported', {
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	},
	definitions: [screenshotTool, screenshotRegionTool],
};
