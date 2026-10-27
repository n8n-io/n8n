import { hasInjectionContext, inject, type InjectionKey } from 'vue';

/**
 * The external-hooks contract consumed across the frontend. External hooks are
 * an extension point: enterprise/embed builds register handlers on
 * `window.n8nExternalHooks`, and `run` dispatches a named event to them.
 *
 * This package owns the *type* only; the concrete runner lives in the
 * application (`editor-ui`) and is registered at bootstrap via
 * {@link setExternalHooks} / provided through {@link ExternalHooksKey}. Keeping
 * the contract here lets `useExternalHooks` return a working runner without the
 * package importing application code (notably the webhooks store).
 *
 * The contract is intentionally loose (`eventName: string`, `metadata:
 * unknown`): the strongly-typed event map stays in `editor-ui`, and the
 * application's public wrapper preserves per-event type-checking for call
 * sites that import it directly.
 */
export interface ExternalHooks {
	run(eventName: string, metadata?: unknown): Promise<void>;
}

/**
 * Injection key for the external-hooks runner. The application may provide it
 * (e.g. a pop-out window with its own runner); `useExternalHooks` reads it when
 * called inside an injection context and otherwise falls back to the registered
 * singleton.
 */
export const ExternalHooksKey: InjectionKey<ExternalHooks> = Symbol('ExternalHooks');

/**
 * Null-object runner used when no concrete runner has been registered (e.g. in
 * tests, or before bootstrap). External hooks are best-effort and must never
 * throw or block the UI, so `run` resolves to a no-op.
 */
const noopExternalHooks: ExternalHooks = {
	async run() {},
};

let registeredExternalHooks: ExternalHooks | undefined;

/**
 * Register the application's external-hooks runner. Called once at bootstrap by
 * `editor-ui` so package-side `useExternalHooks` can resolve it from any
 * context, including outside of component setup (routers, stores, plain
 * modules).
 */
export function setExternalHooks(instance: ExternalHooks | undefined): void {
	registeredExternalHooks = instance;
}

/**
 * Returns the active external-hooks runner. Resolution order: a
 * component-provided runner (via {@link ExternalHooksKey}), then the
 * app-registered singleton (via {@link setExternalHooks}), then a no-op fallback.
 */
export function useExternalHooks(): ExternalHooks {
	const injected = hasInjectionContext() ? inject(ExternalHooksKey, null) : null;
	return injected ?? registeredExternalHooks ?? noopExternalHooks;
}
