import { extendExternalHooks } from '@/mixins/externalHooks';

let cloudHooksInitialized = false;
export async function initializeCloudHooks() {
	if (cloudHooksInitialized) {
		return;
	}

	const { n8nCloudHooks } = await import('@/hooks/cloud');
	extendExternalHooks(n8nCloudHooks);
	cloudHooksInitialized = true;
}
