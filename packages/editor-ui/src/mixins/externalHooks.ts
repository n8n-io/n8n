import { IExternalHooks } from '@/Interface';
import { IDataObject } from 'n8n-workflow';
import Vue from 'vue';

export interface ExternalHookFn<T extends IDataObject> {
	(metadata: T): Promise<void> | void;
}
export type ExternalHooks = Record<string, Record<string, Array<ExternalHookFn<never>>>>;

declare global {
	interface Window {
		n8nExternalHooks?: ExternalHooks;
	}
}

export function extendExternalHooks(hooks: ExternalHooks) {
	if (window.n8nExternalHooks === undefined) {
		window.n8nExternalHooks = {};
	}

	for (const resource of Object.keys(hooks)) {
		if (window.n8nExternalHooks[resource] === undefined) {
			window.n8nExternalHooks[resource] = {};
		}

		for (const operator of Object.keys(hooks[resource])) {
			if (window.n8nExternalHooks[resource][operator] === undefined) {
				window.n8nExternalHooks[resource][operator] = [];
			}

			window.n8nExternalHooks[resource][operator].push(...hooks[resource][operator]);
		}
	}
}

export async function runExternalHook(eventName: string, metadata?: IDataObject) {
	if (!window.n8nExternalHooks) {
		return;
	}

	const [resource, operator] = eventName.split('.');

	if (window.n8nExternalHooks[resource]?.[operator]) {
		const hookMethods = window.n8nExternalHooks[resource][operator];

		for (const hookMethod of hookMethods) {
			await hookMethod(metadata as IDataObject as never);
		}
	}
}

export const externalHooks = Vue.extend({
	methods: {
		$externalHooks(): IExternalHooks {
			return {
				run: async (eventName: string, metadata?: IDataObject): Promise<void> => {
					await runExternalHook.call(this, eventName, metadata);
				},
			};
		},
	},
});
