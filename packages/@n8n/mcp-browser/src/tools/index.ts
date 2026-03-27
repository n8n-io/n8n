import { SessionManager } from '../session-manager';
import type { BrowserToolkit, Config, ToolDefinition } from '../types';
import { configSchema } from '../types';
import { createInspectionTools } from './inspection';
import { createInteractionTools } from './interaction';
import { createNavigationTools } from './navigation';
import { createSessionTools } from './session';
import { createStateTools } from './state';
import { createTabTools } from './tabs';
import { createWaitTools } from './wait';

export function createBrowserTools(config?: Partial<Config>): BrowserToolkit {
	const { toolGroupId } = configSchema.parse(config ?? {});
	const sessionManager = new SessionManager(config);

	const tools: ToolDefinition[] = [
		...createSessionTools(sessionManager, toolGroupId),
		...createTabTools(sessionManager, toolGroupId),
		...createNavigationTools(sessionManager, toolGroupId),
		...createInteractionTools(sessionManager, toolGroupId),
		...createInspectionTools(sessionManager, toolGroupId),
		...createWaitTools(sessionManager, toolGroupId),
		...createStateTools(sessionManager, toolGroupId),
	];

	return { tools, sessionManager };
}
