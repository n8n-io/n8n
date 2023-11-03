import type { IDataObject } from 'n8n-workflow';
import type { ExternalHooks, ExternalHooksGenericContext } from '@/types/externalHooks';
import { useWebhooksStore } from '@/stores/webhooks.store';

export async function runExternalHook(eventName: string, metadata?: IDataObject) {
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
			await hookMethod(store, metadata);
		}
	}
}
