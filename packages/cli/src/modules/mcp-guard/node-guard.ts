import { Container } from '@n8n/di';

import { installNetInterceptor } from './net-interceptor';

/**
 * Sends the network calls of a guarded node tool to the guard. It is safe to call more than once:
 * the interceptor is installed once. Calls outside a guarded node tool are not touched.
 */
export function installNodeGuard(): () => void {
	return installNetInterceptor(async (req) => {
		// Load the guard only when a node tool makes a call. Most chats never do.
		const { HttpGuardService } = await import('./http-guard.service.js');
		return await Container.get(HttpGuardService).handle(req);
	});
}
