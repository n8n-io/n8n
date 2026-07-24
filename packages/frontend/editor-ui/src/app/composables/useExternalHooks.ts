import type { IDataObject } from 'n8n-workflow';
import type {
	ExternalHooks,
	ExternalHooksKey,
	ExternalHooksGenericContext,
	ExtractExternalHooksMethodPayloadFromKey,
} from '@/app/types/externalHooks';
import { useWebhooksStore } from '@/app/stores/webhooks.store';
import { setExternalHooks } from '@n8n/composables/useExternalHooks';

/**
 * Concrete runner. Loosely typed to match the `@n8n/composables` contract so it
 * can be registered for package-side consumers; the exported {@link runExternalHook}
 * wrapper below re-adds per-event type-checking for direct call sites.
 */
async function runExternalHookInternal(eventName: string, metadata?: unknown): Promise<void> {
	if (!window.n8nExternalHooks) {
		return;
	}

	const store = useWebhooksStore();

	const [resource, operator] = eventName.split('.') as [
		keyof ExternalHooks,
		keyof ExternalHooks[keyof ExternalHooks],
	];

	const context = window.n8nExternalHooks[resource] as ExternalHooksGenericContext;
	if (context?.[operator]) {
		const hookMethods = context[operator];

		for (const hookMethod of hookMethods) {
			await hookMethod(store, metadata as IDataObject);
		}
	}
}

export async function runExternalHook<T extends ExternalHooksKey>(
	eventName: T,
	metadata?: ExtractExternalHooksMethodPayloadFromKey<T>,
): Promise<void> {
	await runExternalHookInternal(eventName, metadata);
}

// Register the concrete runner so package-side `useExternalHooks`
// (`@n8n/composables`) can resolve it from any context. Runs on first import;
// `editor-ui` imports this module during bootstrap, before any consumer runs.
setExternalHooks({ run: runExternalHookInternal });

export function useExternalHooks() {
	return {
		run: runExternalHook,
	};
}
