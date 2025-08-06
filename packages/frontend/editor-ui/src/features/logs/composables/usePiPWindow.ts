import { PiPWindowSymbol } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { applyThemeToBody } from '@/stores/ui.utils';
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

interface UsePiPWindowOptions {
	initialWidth?: number;
	initialHeight?: number;
	container: Readonly<ShallowRef<HTMLElement | null>>;
	content: Readonly<ShallowRef<HTMLElement | null>>;
	shouldPopOut: ComputedRef<boolean>;
	onRequestClose: () => void;
}

interface UsePiPWindowReturn {
	isPoppedOut: ComputedRef<boolean>;
	canPopOut: ComputedRef<boolean>;
	pipWindow?: Ref<Window | undefined>;
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

/**
 * A composable that allows to pop out given content in document PiP (picture-in-picture) window
 */
export function usePiPWindow({
	container,
	content,
	initialHeight,
	initialWidth,
	shouldPopOut,
	onRequestClose,
}: UsePiPWindowOptions): UsePiPWindowReturn {
	const pipWindow = ref<Window>();
	const isUnmounting = ref(false);
	const canPopOut = computed(
		() =>
			!!window.documentPictureInPicture /* Browser supports the API */ &&
			window.parent === window /* Not in iframe */,
	);
	const isPoppedOut = computed(() => !!pipWindow.value);
	const tooltipContainer = computed(() =>
		isPoppedOut.value ? (content.value ?? undefined) : undefined,
	);
	const uiStore = useUIStore();
	const observer = new MutationObserver((mutations) => {
		if (pipWindow.value) {
			syncStyleMutations(pipWindow.value, mutations);
		}
	});

	// Copy over dynamic styles to PiP window to support lazily imported modules
	observer.observe(document.head, { childList: true, subtree: true });

	provide(PiPWindowSymbol, pipWindow);
	useProvideTooltipAppendTo(tooltipContainer);

	async function showPip() {
		if (!content.value) {
			return;
		}

		pipWindow.value =
			pipWindow.value ??
			(await window.documentPictureInPicture?.requestWindow({
				width: initialWidth,
				height: initialHeight,
				disallowReturnToOpener: true,
			}));

		// Copy style sheets over from the initial document
		// so that the content looks the same.
		[...document.styleSheets].forEach((styleSheet) => {
			try {
				const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
				const style = document.createElement('style');

				style.textContent = cssRules;
				pipWindow.value?.document.head.appendChild(style);
			} catch (e) {
				const link = document.createElement('link');

				link.rel = 'stylesheet';
				link.type = styleSheet.type;
				link.media = styleSheet.media as unknown as string;
				link.href = styleSheet.href as string;
				pipWindow.value?.document.head.appendChild(link);
			}
		});

		// Move the content to the Picture-in-Picture window.
		pipWindow.value?.document.body.append(content.value);
		pipWindow.value?.addEventListener('pagehide', () => !isUnmounting.value && onRequestClose());
	}

	function hidePiP() {
		pipWindow.value?.close();
		pipWindow.value = undefined;

		if (content.value) {
			container.value?.appendChild(content.value);
		}
	}

	// `requestAnimationFrame()` to make sure the content is already rendered
	watch(shouldPopOut, (value) => (value ? requestAnimationFrame(showPip) : hidePiP()), {
		immediate: true,
	});

	// It seems "prefers-color-scheme: dark" media query matches in PiP window by default
	// So we're enforcing currently applied theme in the main window by setting data-theme in PiP's body element
	watch(
		[() => uiStore.appliedTheme, pipWindow],
		([theme, pip]) => {
			if (pip) {
				applyThemeToBody(theme, pip);
			}
		},
		{ immediate: true },
	);

	onScopeDispose(() => {
		observer.disconnect();
	});

	onBeforeUnmount(() => {
		isUnmounting.value = true;
		pipWindow.value?.close();
	});

	return { canPopOut, isPoppedOut, pipWindow };
}
