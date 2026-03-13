import { SessionManager } from '../session-manager';
import type { BrowserToolkit, Config, ToolDefinition } from '../types';
import { createInspectionTools } from './inspection';
import { createInteractionTools } from './interaction';
import { createNavigationTools } from './navigation';
import { createSessionTools } from './session';
import { createStateTools } from './state';
import { createTabTools } from './tabs';
import { createWaitTools } from './wait';

export function createBrowserTools(config?: Partial<Config>): BrowserToolkit {
	const sessionManager = new SessionManager(config);

	const tools: ToolDefinition[] = [
		...createSessionTools(sessionManager),
		...createTabTools(sessionManager),
		...createNavigationTools(sessionManager),
		...createInteractionTools(sessionManager),
		...createInspectionTools(sessionManager),
		...createWaitTools(sessionManager),
		...createStateTools(sessionManager),
	];

	return { tools, sessionManager };
}
