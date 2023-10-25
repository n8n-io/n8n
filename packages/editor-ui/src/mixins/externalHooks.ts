import type { IExternalHooks } from '@/Interface';
import type { IDataObject } from 'n8n-workflow';
import { useWebhooksStore } from '@/stores/webhooks.store';
import { defineComponent } from 'vue';
import { runExternalHook } from '@/utils';

export const externalHooks = defineComponent({
	methods: {
		$externalHooks(): IExternalHooks {
			return {
				run: async (eventName: string, metadata?: IDataObject): Promise<void> => {
					await runExternalHook.call(this, eventName, useWebhooksStore(), metadata);
				},
			};
		},
	},
});
