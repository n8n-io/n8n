import type { Router } from 'vue-router';

export type ModuleCleanupFn = () => void | Promise<void>;

/**
 * Context handed to a module's post-login `setup(ctx)` hook. Kept intentionally
 * small; grow it as modules need more, rather than exposing stores directly.
 */
export interface ModuleSetupContext {
	router: Router;
	/**
	 * Register a teardown callback to run when the authenticated session ends
	 * (e.g. on logout). Cleanups run in reverse registration order.
	 */
	registerCleanup: (fn: ModuleCleanupFn) => void;
}
