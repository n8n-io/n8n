import type { PartialDeep } from 'type-fest';
import type { ExternalHooks, ExternalHooksGenericContext } from '@/types';

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

let cloudHooksInitialized = false;
export async function initializeCloudHooks() {
	if (cloudHooksInitialized) {
		return;
	}

	try {
		const { n8nCloudHooks } = await import('@/hooks/cloud');
		extendExternalHooks(n8nCloudHooks);
	} catch (error) {
		throw new Error(`Failed to extend external hooks: ${error.message}`);
	} finally {
		cloudHooksInitialized = true;
	}
}
