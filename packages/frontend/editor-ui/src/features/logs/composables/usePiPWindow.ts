import { IsInPiPWindowSymbol } from '@/constants';
import { useProvideTooltipAppendTo } from '@n8n/design-system/composables/useTooltipAppendTo';
import {
	computed,
	type ComputedRef,
	onBeforeUnmount,
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

	provide(IsInPiPWindowSymbol, isPoppedOut);
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

	onBeforeUnmount(() => {
		isUnmounting.value = true;
		pipWindow.value?.close();
	});

	return { canPopOut, isPoppedOut, pipWindow };
}
