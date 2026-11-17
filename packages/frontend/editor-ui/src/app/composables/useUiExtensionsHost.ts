import { isUiExtensionOpenableUrl } from '@n8n/api-types';
import type {
	UiExtensionsHost,
	ViewOpenTarget,
	ViewRuntimeAssets,
} from '@n8n/frontend-module-ui-extensions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, shallowRef } from 'vue';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useUiExtensionOverviewData } from '@/app/composables/useUiExtensionOverviewData';

/**
 * What the side panel and the sidebar pages get from the editor: the view
 * runtime, the locale, the overview data and the open actions. App.vue provides
 * it, so the panel and the page route share one runtime load.
 */
export function useUiExtensionsHost(): UiExtensionsHost {
	const router = useRouter();
	const rootStore = useRootStore();

	const runtime = shallowRef<ViewRuntimeAssets | null>(null);
	let runtimeLoad: Promise<void> | null = null;

	/**
	 * The view runtime is a separate bundle that the frame loads from a string.
	 * It is about 1 MB, so it loads only when a panel or a page needs it.
	 */
	function loadRuntime() {
		runtimeLoad ??= (async () => {
			try {
				const [{ default: js }, { default: css }] = await Promise.all([
					import('@n8n/ui-extension-runtime/runtime.iife.js?raw'),
					import('@n8n/ui-extension-runtime/runtime.css?raw'),
				]);
				runtime.value = { js, css };
			} catch {
				// A failed chunk load can work on the next try.
				runtimeLoad = null;
			}
		})();
	}

	/** A built-in view or page asks to open a run, a workflow or a page in a service. */
	function open(target: ViewOpenTarget) {
		if (target.kind === 'execution') {
			void router.push({
				name: VIEWS.EXECUTION_PREVIEW,
				params: { workflowId: target.workflowId, executionId: target.executionId },
			});
			return;
		}
		if (target.kind === 'workflow') {
			void router.push({ name: VIEWS.WORKFLOW, params: { workflowId: target.workflowId } });
			return;
		}
		if (isUiExtensionOpenableUrl(target.url))
			window.open(target.url, '_blank', 'noopener,noreferrer');
	}

	return {
		runtime,
		locale: computed(() => rootStore.defaultLocale),
		useOverviewData: useUiExtensionOverviewData,
		open,
		loadRuntime,
	};
}
