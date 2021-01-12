import Vue from "vue";
import { IExternalHooks, IExternalHooksMetadata } from "@/Interface";

export async function onExternalHookEvent(
	eventName: string,
	metadata: IExternalHooksMetadata,
) {
	// @ts-ignore
	const hookMethod = window.externalHooks[eventName];
	if (hookMethod) {
		hookMethod(metadata);
	}
}

export const externalHooks = Vue.extend({
	methods: {
		externalHooks(): IExternalHooks {
			return {
				onExternalHookEvent,
			};
		},
	},
});
