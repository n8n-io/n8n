import type { IExternalHooks } from '@/Interface';
import type { IDataObject } from 'n8n-workflow';
import { useWebhooksStore } from '@/stores';
import { runExternalHook } from '@/utils';

export function useExternalHooks(): IExternalHooks {
	return {
		async run(eventName: string, metadata?: IDataObject): Promise<void> {
			return await runExternalHook(eventName, useWebhooksStore(), metadata);
		},
	};
}
