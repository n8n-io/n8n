import type { IDataObject } from 'n8n-workflow';
import type {
	ExternalHookStore,
	ExternalHooks,
	ExternalHooksKey,
	ExternalHooksGenericContext,
	ExtractExternalHooksMethodPayloadFromKey,
} from '@/app/types/externalHooks';
import { useWebhooksStore } from '@/app/stores/webhooks.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';

export async function runExternalHook<T extends ExternalHooksKey>(
	eventName: T,
	metadata?: ExtractExternalHooksMethodPayloadFromKey<T>,
) {
	if (!window.n8nExternalHooks) {
		return;
	}

	const webhooksStore = useWebhooksStore();
	const { workflowId } = useWorkflowsStore();
	// NDV state is per-workflow — only include it when a workflow is loaded.
	// External hooks firing outside a workflow page get the webhooks store without NDV keys.
	const store: ExternalHookStore = workflowId
		? Object.assign({}, webhooksStore, useNDVStore(createWorkflowDocumentId(workflowId)))
		: webhooksStore;

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

export function useExternalHooks() {
	return {
		run: runExternalHook,
	};
}
