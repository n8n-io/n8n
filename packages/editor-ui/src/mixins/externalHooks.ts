import { IExternalHooks, IRootState } from '@/Interface';
import { store } from '@/store';
import { useWebhooksStore } from '@/stores/webhooks';
import { IDataObject } from 'n8n-workflow';
import { Store } from 'pinia';
import Vue from 'vue';

export async function runExternalHook(
	eventName: string,
	store: Store,
	metadata?: IDataObject,
) {
	// @ts-ignore
	if (!window.n8nExternalHooks) {
		return;
	}

	const [resource, operator] = eventName.split('.');

	// @ts-ignore
	if (window.n8nExternalHooks[resource] && window.n8nExternalHooks[resource][operator]) {
		// @ts-ignore
		const hookMethods = window.n8nExternalHooks[resource][operator];

		for (const hookmethod of hookMethods) {
			await hookmethod(store, metadata);
		}
	}
}

export const externalHooks = Vue.extend({
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
