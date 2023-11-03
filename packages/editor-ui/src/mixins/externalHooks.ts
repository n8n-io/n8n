import type { IExternalHooks } from '@/Interface';
import type { IDataObject } from 'n8n-workflow';
import type { PartialDeep } from 'type-fest';
import type { ExternalHooks, ExternalHooksGenericContext } from '@/types';
import { defineComponent } from 'vue';
import { runExternalHook } from '@/utils';

export function extendExternalHooks(hooks: PartialDeep<ExternalHooks>) {
	if (typeof window.n8nExternalHooks === 'undefined') {
		window.n8nExternalHooks = {};
	}

	for (const resource of Object.keys(hooks) as Array<keyof ExternalHooks>) {
		if (typeof window.n8nExternalHooks[resource] === 'undefined') {
			window.n8nExternalHooks[resource] = {};
		}

		const context = hooks[resource] as ExternalHooksGenericContext;
		for (const operator of Object.keys(context)) {
			if (typeof context[operator] === 'undefined') {
				context[operator] = [];
			}

			context[operator].push(...context[operator]);
		}
	}
}

export const externalHooks = defineComponent({
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
