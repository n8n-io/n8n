import { onMounted, onUnmounted, Ref } from 'vue';
import { isVisible, off, on } from '../utils';

export function useClickOutside(props: {
	elementRef: Ref<HTMLElement | null>;
	fn: (event: Event) => void;
}) {
	const binding = (event: Event) => {
		if (!props.elementRef.value) {
			return;
		}

		const target = event.target as HTMLElement;

		if (!isVisible(props.elementRef.value) || !target) {
			return;
		}

		if (props.elementRef.value === target || props.elementRef.value.contains(target)) {
			return;
		}

		props.fn(event);
	};

	onMounted(() => {
		if (typeof window !== 'undefined') {
			on(window.document, 'mousedown', binding);
		}
	});

	onUnmounted(() => {
		if (typeof window !== 'undefined') {
			off(window.document, 'mousedown', binding);
		}
	});
}
