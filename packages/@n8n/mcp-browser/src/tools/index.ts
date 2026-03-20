import { BrowserConnection } from '../connection';
import type { BrowserToolkit, Config, ToolDefinition } from '../types';
import { createInspectionTools } from './inspection';
import { createInteractionTools } from './interaction';
import { createNavigationTools } from './navigation';
import { createSessionTools } from './session';
import { createStateTools } from './state';
import { createTabTools } from './tabs';
import { createWaitTools } from './wait';

export function createBrowserTools(config?: Partial<Config>): BrowserToolkit {
	const connection = new BrowserConnection(config);

	const tools: ToolDefinition[] = [
		...createSessionTools(connection),
		...createTabTools(connection),
		...createNavigationTools(connection),
		...createInteractionTools(connection),
		...createInspectionTools(connection),
		...createWaitTools(connection),
		...createStateTools(connection),
	];

	return { tools, connection };
}
