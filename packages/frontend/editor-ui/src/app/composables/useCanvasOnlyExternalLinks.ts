import { useEventListener } from '@vueuse/core';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { toValue, type MaybeRefOrGetter } from 'vue';

import { openSafeUrl } from '@/app/utils/htmlUtils';

function shouldOpenInNewTab(href: string | null): boolean {
	return href !== null && href !== '' && !href.startsWith('#') && !href.startsWith('javascript:');
}

/**
 * Makes any link clicked inside the Node Details View open in a new tab, if
 * N8N_CANVAS_ONLY is enabled.
 */
export function useCanvasOnlyExternalLinks(root: MaybeRefOrGetter<HTMLElement | null | undefined>) {
	const settingsStore = useSettingsStore();

	const onClick = (event: MouseEvent) => {
		if (event.defaultPrevented) {
			return;
		}

		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}

		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		const anchor = target.closest('a');
		if (!anchor || !shouldOpenInNewTab(anchor.getAttribute('href'))) {
			return;
		}

		event.preventDefault();
		openSafeUrl(anchor.href);
	};

	useEventListener(
		() => (settingsStore.isCanvasOnly ? toValue(root) : undefined),
		'click',
		onClick,
		{ capture: true },
	);
}
