import { IExternalHooks } from '@/Interface';
import { IDataObject } from 'n8n-workflow';
import { useWebhooksStore } from '@/stores';
import { runExternalHook } from '@/mixins/externalHooks';

export function useExternalHooks(): IExternalHooks {
	return {
		async run(eventName: string, metadata?: IDataObject): Promise<void> {
			return await runExternalHook.call(this, eventName, useWebhooksStore(), metadata);
		},
	};
}
