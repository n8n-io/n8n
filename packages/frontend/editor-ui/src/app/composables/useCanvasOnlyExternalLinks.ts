import { useSettingsStore } from '@n8n/stores/settings.store';
import { toValue, watch, type MaybeRefOrGetter } from 'vue';

import { openSafeUrl } from '@/app/utils/htmlUtils';

function isActionLink(anchor: HTMLAnchorElement): boolean {
	return Boolean(anchor.dataset.key || anchor.dataset.action);
}

function shouldOpenInNewTab(href: string | null): boolean {
	return href !== null && href !== '' && !href.startsWith('#') && !href.startsWith('javascript:');
}

/**
 * In canvas-only embeds, open tutorial/documentation links inside the node
 * details view in a new tab so they do not navigate the iframe.
 */
export function useCanvasOnlyExternalLinks(root: MaybeRefOrGetter<HTMLElement | null | undefined>) {
	const settingsStore = useSettingsStore();

	const onClick = (event: MouseEvent) => {
		if (!settingsStore.isCanvasOnly || event.defaultPrevented) {
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
		if (!anchor || isActionLink(anchor) || !shouldOpenInNewTab(anchor.getAttribute('href'))) {
			return;
		}

		event.preventDefault();
		openSafeUrl(anchor.href);
	};

	watch(
		[() => settingsStore.isCanvasOnly, () => toValue(root)],
		([canvasOnly, el], _, onCleanup) => {
			if (!canvasOnly || !el) {
				return;
			}

			el.addEventListener('click', onClick, true);
			onCleanup(() => el.removeEventListener('click', onClick, true));
		},
		{ immediate: true },
	);
}
