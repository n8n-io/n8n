import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { PopOutWindowKey } from '@/constants';
import { useProvideTooltipAppendTo } from '@n8n/design-system/composables/useTooltipAppendTo';
import {
	computed,
	type ComputedRef,
	onBeforeUnmount,
	onScopeDispose,
	provide,
	type Ref,
	ref,
	type ShallowRef,
	watch,
} from 'vue';

interface UsePopOutWindowOptions {
	title: ComputedRef<string>;
	initialWidth?: number;
	initialHeight?: number;
	container: Readonly<ShallowRef<HTMLElement | null>>;
	content: Readonly<ShallowRef<HTMLElement | null>>;
	shouldPopOut: ComputedRef<boolean>;
	onRequestClose: () => void;
}

interface UsePopOutWindowReturn {
	isPoppedOut: ComputedRef<boolean>;
	canPopOut: ComputedRef<boolean>;
	popOutWindow?: Ref<Window | undefined>;
}

function isStyle(node: Node): node is HTMLElement {
	return (
		node instanceof HTMLStyleElement ||
		(node instanceof HTMLLinkElement && node.rel === 'stylesheet')
	);
}

function syncStyleMutations(destination: Window, mutations: MutationRecord[]) {
	const currentStyles = destination.document.head.querySelectorAll('style, link[rel="stylesheet"]');

	for (const mutation of mutations) {
		for (const node of mutation.addedNodes) {
			if (isStyle(node)) {
				destination.document.head.appendChild(node.cloneNode(true));
			}
		}

		for (const node of mutation.removedNodes) {
			if (isStyle(node)) {
				for (const found of currentStyles) {
					if (found.isEqualNode(node)) {
						found.remove();
					}
				}
			}
		}
	}
}

function copyFavicon(source: Window, target: Window) {
	const iconUrl = source.document.querySelector('link[rel=icon]')?.getAttribute('href');

	if (iconUrl) {
		const link = target.document.createElement('link');

		link.setAttribute('rel', 'icon');
		link.setAttribute('href', iconUrl);

		target.document.head.appendChild(link);
	}
}

/**
 * A composable that allows to pop out given content in child window
 */
export function usePopOutWindow({
	title,
	container,
	content,
	initialHeight,
	initialWidth,
	shouldPopOut,
	onRequestClose,
}: UsePopOutWindowOptions): UsePopOutWindowReturn {
	const popOutWindow = ref<Window>();
	const isUnmounting = ref(false);
	const canPopOut = computed(() => window.parent === window /* Not in iframe */);
	const isPoppedOut = computed(() => !!popOutWindow.value);
	const tooltipContainer = computed(() =>
		isPoppedOut.value ? (content.value ?? undefined) : undefined,
	);
	const observer = new MutationObserver((mutations) => {
		if (popOutWindow.value) {
			syncStyleMutations(popOutWindow.value, mutations);
		}
	});
	const documentTitle = useDocumentTitle(popOutWindow);

	// Copy over dynamic styles to child window to support lazily imported modules
	observer.observe(document.head, { childList: true, subtree: true });

	provide(PopOutWindowKey, popOutWindow);
	useProvideTooltipAppendTo(tooltipContainer);

	async function showPopOut() {
		if (!content.value) {
			return;
		}

		if (!popOutWindow.value) {
			// Chrome ignores these options but effective in Firefox
			const options = `popup=yes,width=${initialWidth},height=${initialHeight},left=100,top=100,toolbar=no,menubar=no,scrollbars=yes,resizable=yes`;

			popOutWindow.value = window.open('', '_blank', options) ?? undefined;
		}

		if (!popOutWindow.value) {
			return;
		}

		copyFavicon(window, popOutWindow.value);

		for (const styleSheet of [...document.styleSheets]) {
			try {
				const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
				const style = document.createElement('style');

				style.textContent = cssRules;
				popOutWindow.value.document.head.appendChild(style);
			} catch (e) {
				const link = document.createElement('link');

				link.rel = 'stylesheet';
				link.type = styleSheet.type;
				link.media = styleSheet.media as unknown as string;
				link.href = styleSheet.href as string;
				popOutWindow.value.document.head.appendChild(link);
			}
		}

		// Move the content to child window.
		popOutWindow.value.document.body.append(content.value);
		popOutWindow.value.addEventListener('pagehide', () => !isUnmounting.value && onRequestClose());
	}

	function hidePopOut() {
		popOutWindow.value?.close();
		popOutWindow.value = undefined;

		if (content.value) {
			container.value?.appendChild(content.value);
		}
	}

	// `requestAnimationFrame()` to make sure the content is already rendered
	watch(shouldPopOut, (value) => (value ? requestAnimationFrame(showPopOut) : hidePopOut()), {
		immediate: true,
	});

	watch(
		[title, popOutWindow],
		([newTitle, win]) => {
			if (win) {
				documentTitle.set(newTitle);
			}
		},
		{ immediate: true },
	);

	onScopeDispose(() => {
		observer.disconnect();
	});

	onBeforeUnmount(() => {
		isUnmounting.value = true;
		if (popOutWindow.value) {
			popOutWindow.value.close();
			onRequestClose();
		}
	});

	return { canPopOut, isPoppedOut, popOutWindow };
}
