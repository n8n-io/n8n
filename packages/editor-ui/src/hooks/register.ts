import { extendExternalHooks } from '@/mixins/externalHooks';

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
