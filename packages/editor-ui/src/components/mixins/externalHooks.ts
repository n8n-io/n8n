import { IExternalHooks, IRootState } from '@/Interface';
import { IDataObject } from 'n8n-workflow';
import Vue from 'vue';
import { Store } from 'vuex';

export async function runExternalHook(
	eventName: string,
	store: Store<IRootState>,
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
					await runExternalHook.call(this, eventName, this.$store, metadata);
				},
			};
		},
	},
});
