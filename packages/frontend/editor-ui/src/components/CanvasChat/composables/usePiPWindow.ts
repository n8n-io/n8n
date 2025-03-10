import { useTelemetry } from '@/composables/useTelemetry';
import {
	computed,
	type ComputedRef,
	onBeforeUnmount,
	onMounted,
	type Ref,
	ref,
	type ShallowRef,
} from 'vue';

/**
 * A composable that allows to pop out given content in document PiP (picture-in-picture) window
 */
export function usePiPWindow(
	container: Readonly<ShallowRef<HTMLDivElement | null>>,
	content: Readonly<ShallowRef<HTMLDivElement | null>>,
): {
	isPoppedOut: ComputedRef<boolean>;
	canPopOut: ComputedRef<boolean>;
	pipWindow?: Ref<Window | undefined>;
	onPopOut?: () => void;
} {
	const pipWindow = ref<Window>();
	const canPopOut = computed(() => !!window.documentPictureInPicture);
	const isPoppedOut = computed(() => !!pipWindow.value);
	const telemetry = useTelemetry();

	function showPip() {
		if (!content.value) {
			return;
		}

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
				pipWindow.value?.document.head.appendChild(link);
			}
		});

		// Move the content to the Picture-in-Picture window.
		pipWindow.value?.document.body.append(content.value);
		pipWindow.value?.addEventListener('pagehide', () => {
			telemetry.track('User toggled log view', { new_state: 'attached' });

			pipWindow.value = undefined;

			if (content.value) {
				container.value?.appendChild(content.value);
			}
		});
	}

	async function onPopOut() {
		telemetry.track('User toggled log view', { new_state: 'floating' });

		pipWindow.value = await window.documentPictureInPicture?.requestWindow();

		showPip();
	}

	onMounted(() => {
		// If PiP window is already open, render in PiP
		if (window.documentPictureInPicture?.window) {
			pipWindow.value = window.documentPictureInPicture.window;
			showPip();
		}
	});

	onBeforeUnmount(() => {
		if (content.value) {
			// Make the PiP window blank but keep it open
			pipWindow.value?.document.body.removeChild(content.value);
		}
	});

	return { canPopOut, isPoppedOut, pipWindow, onPopOut };
}
