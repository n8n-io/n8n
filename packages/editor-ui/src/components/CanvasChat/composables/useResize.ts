import type { Ref } from 'vue';
import { ref, computed, onMounted, onBeforeUnmount, watchEffect } from 'vue';
import type { ResizeData } from 'n8n-design-system/components/N8nResizeWrapper/ResizeWrapper.vue';
import { useDebounce } from '@/composables/useDebounce';
import type { IChatResizeStyles } from '../types/chat';
import { watch } from 'fs';

export function useResize(container: Ref<HTMLElement | undefined>) {
	console.log('🚀 ~ useResize ~ container:', container);
	const chatWidth = ref(0);
	const maxWidth = ref(0);
	const minHeight = ref(0);
	const maxHeight = ref(0);
	const height = ref(0);

	const rootStyles = computed<IChatResizeStyles>(() => ({
		'--panel-height': `${height.value}px`,
		'--chat-width': `${chatWidth.value}px`,
	}));

	function onResize(data: ResizeData) {
		if (data.height < minHeight.value) {
			data.height = minHeight.value;
			return;
		}

		if (data.height > maxHeight.value) {
			data.height = maxHeight.value;
			return;
		}
		height.value = data.height;
	}

	function onResizeDebounced(data: ResizeData) {
		void useDebounce().callDebounced(onResize, { debounceTime: 10, trailing: true }, data);
	}

	function onResizeChat(data: ResizeData) {
		// Maximum width is 90% of the container width
		if (data.width > maxWidth.value * 0.9) {
			data.width = maxWidth.value;
			return;
		}

		// Minimum width is 30% of the container width
		if (data.width < maxWidth.value * 0.3) {
			data.width = maxWidth.value * 0.2;
			return;
		}

		chatWidth.value = data.width;
	}

	function onWindowResize() {
		if (container.value) {
			const { width } = container.value.getBoundingClientRect();
			maxWidth.value = width;

			if (chatWidth.value === 0) {
				onResizeChat({ width: maxWidth.value * 0.5 });
			}
		}

		// Min height is 30% of the window height
		minHeight.value = window.innerHeight * 0.2;
		maxHeight.value = window.innerHeight * 0.75;
		if (height.value === 0) {
			onResize({ height: minHeight.value });
		}
	}
	watchEffect(() => {
		if (container.value) {
			onWindowResize();
		}
	});
	onMounted(() => {
		window.addEventListener('resize', onWindowResize);
	});

	onBeforeUnmount(() => {
		window.removeEventListener('resize', onWindowResize);
	});

	return {
		height,
		chatWidth,
		rootStyles,
		onResize,
		onResizeDebounced,
		onResizeChat,
	};
}
