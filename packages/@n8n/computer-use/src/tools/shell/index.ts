import type { ToolModule } from '../types';
import { processTools } from './process/process-tools';
import { shellExecuteTool } from './shell-execute';

export const ShellModule: ToolModule = {
	isSupported() {
		return true;
	},
	definitions: [shellExecuteTool, ...processTools],
};
