import Vue from "vue";
import { IExternalHooks, IExternalHooksMetadata } from "@/Interface";

export async function runExternalHook(
	eventName: string,
	// tslint:disable-next-line: no-any
	state: any,
	metadata?: IExternalHooksMetadata,
) {
	// @ts-ignore
	if (!window.externalHooks) {
		return;
	}

	const [resource, operator] = eventName.split(".");

	// @ts-ignore
	if (window.externalHooks[resource] && window.externalHooks[resource][operator]) {
		// @ts-ignore
		const hookMethods = window.externalHooks[resource][operator];
		for (const hookmethod of hookMethods) {
			hookmethod(state, metadata);
		}
	}
}

export const externalHooks = Vue.extend({
	methods: {
		externalHooks(): IExternalHooks {
			return {
				onExternalHookEvent: (eventName: string, metadata?: IExternalHooksMetadata): void => {
					runExternalHook(eventName, this.$store.state, metadata);
				},
			};
		},
	},
});
