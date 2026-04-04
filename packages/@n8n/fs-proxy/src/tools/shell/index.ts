import type { ToolModule } from '../types';
import { shellExecuteTool } from './shell-execute';

export const ShellModule: ToolModule = {
	isSupported() {
		return true;
	},
	definitions: [shellExecuteTool],
};
