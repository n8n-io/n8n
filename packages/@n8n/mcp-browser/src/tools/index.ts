import { SessionManager } from '../session-manager';
import type { BrowserToolkit, Config, ToolDefinition } from '../types';

import { createSessionTools } from './session';
import { createTabTools } from './tabs';
import { createNavigationTools } from './navigation';
import { createInteractionTools } from './interaction';
import { createInspectionTools } from './inspection';
import { createWaitTools } from './wait';
import { createStateTools } from './state';

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
