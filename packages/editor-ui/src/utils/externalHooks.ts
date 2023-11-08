import type { IDataObject } from 'n8n-workflow';
import { useWebhooksStore } from '@/stores/webhooks.store';
import type {
	ExternalHooks,
	ExternalHooksKey,
	ExternalHooksGenericContext,
	ExtractExternalHooksMethodPayloadFromKey,
} from '@/types/externalHooks';

export async function runExternalHook<T extends ExternalHooksKey>(
	eventName: T,
	metadata?: ExtractExternalHooksMethodPayloadFromKey<T>,
) {
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
