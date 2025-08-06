import { ref, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { ElLoading as Loading } from 'element-plus';

interface LoadingService {
	text: string;
	close: () => void;
}

export function useLoadingService() {
	const i18n = useI18n();
	const loadingService = ref<LoadingService | null>(null);

	function startLoading(text?: string) {
		if (loadingService.value !== null) {
			return;
		}

		loadingService.value = Loading.service({
			lock: true,
			text: text || i18n.baseText('genericHelpers.loading'),
			background: 'var(--color-dialog-overlay-background)',
		}) as unknown as LoadingService;
	}

	function setLoadingText(text: string) {
		if (loadingService.value) {
			loadingService.value.text = text;
		}
	}

	function stopLoading() {
		if (loadingService.value) {
			loadingService.value.close();
			loadingService.value = null;
		}
	}

	const isLoading = computed(() => loadingService.value !== null);

	return {
		loadingService,
		isLoading,
		startLoading,
		setLoadingText,
		stopLoading,
	};
}
