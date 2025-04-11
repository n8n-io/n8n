import { type ResizeData } from '@n8n/design-system';
import { useLocalStorage } from '@vueuse/core';
import { computed, ref, watch, type Ref } from 'vue';

type GetSize = number | ((container: HTMLElement) => number);

interface UseResizerV2Options {
	container: Ref<HTMLElement | null>;
	localStorageKey: string;
	minSize?: GetSize;
	maxSize?: GetSize;
	onCollapse?: () => void;
	onFullWidth?: () => void;
}

export function useResizeV2({
	container,
	localStorageKey,
	maxSize,
	minSize,
	onCollapse,
	onFullWidth,
}: UseResizerV2Options) {
	const containerSize = ref<number | undefined>(container.value?.offsetWidth);
	const size = useLocalStorage(localStorageKey, -1);

	function resolveSize(getter?: GetSize): number | undefined {
		return typeof getter === 'number'
			? getter
			: container.value === null
				? undefined
				: getter?.(container.value);
	}

	function onResize(data: ResizeData) {
		const minSizeValue = resolveSize(minSize) ?? 0;
		const maxSizeValue = resolveSize(maxSize) ?? Number.MAX_SAFE_INTEGER;
		const newSize = data.x - (container.value?.offsetLeft ?? 0);

		size.value = Math.min(Math.max(minSizeValue, newSize), maxSizeValue);

		if (newSize < minSizeValue / 2) {
			onCollapse?.();
		}

		if (
			container.value &&
			newSize > maxSizeValue + (container.value.offsetWidth - maxSizeValue) / 2
		) {
			onFullWidth?.();
		}
	}

	watch(container, (el, _, onCleanUp) => {
		if (!el) {
			return;
		}

		const observer = new ResizeObserver(() => {
			if (size.value < 0 || containerSize.value === undefined) {
				containerSize.value = el.offsetWidth;
				return;
			}

			const minSizeValue = resolveSize(minSize) ?? 0;
			const maxSizeValue = resolveSize(maxSize) ?? Number.MAX_SAFE_INTEGER;
			const ratio = size.value / containerSize.value;
			const newSize = el.offsetWidth * ratio;

			// maintain proportion
			size.value = Math.min(Math.max(minSizeValue, newSize), maxSizeValue);

			containerSize.value = el.offsetWidth;
		});

		observer.observe(el);

		onCleanUp(() => observer.disconnect());
	});

	return {
		size: computed(() => (size.value < 0 ? undefined : size.value)),
		onResize,
	};
}
