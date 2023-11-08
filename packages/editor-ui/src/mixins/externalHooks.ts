import type { IExternalHooks } from '@/Interface';
import type { PartialDeep } from 'type-fest';
import type { ExternalHooks, ExternalHooksGenericContext } from '@/types';
import { defineComponent } from 'vue';
import { runExternalHook } from '@/utils';

export function extendExternalHooks(hooksExtension: PartialDeep<ExternalHooks>) {
	if (typeof window.n8nExternalHooks === 'undefined') {
		window.n8nExternalHooks = {};
	}

	for (const resource of Object.keys(hooksExtension) as Array<keyof ExternalHooks>) {
		if (typeof window.n8nExternalHooks[resource] === 'undefined') {
			window.n8nExternalHooks[resource] = {};
		}

		const extensionContext = hooksExtension[resource] as ExternalHooksGenericContext;
		const context = window.n8nExternalHooks[resource] as ExternalHooksGenericContext;
		for (const operator of Object.keys(extensionContext)) {
			if (typeof context[operator] === 'undefined') {
				context[operator] = [];
			}

			context[operator].push(...extensionContext[operator]);
		}
	}
}

export const externalHooks = defineComponent({
	methods: {
		$externalHooks(): IExternalHooks {
			return {
				run: runExternalHook,
			};
		},
	},
});
