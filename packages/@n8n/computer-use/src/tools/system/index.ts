import type { ToolModule } from '../types';
import { activateToolsTool } from './activate-tools';

export const SystemModule: ToolModule = {
	isSupported: () => true,
	definitions: [activateToolsTool],
};
