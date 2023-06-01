import { ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { Loading } from 'element-ui';

interface LoadingService {
	text: string;
	close: () => void;
}

export function useLoadingService() {
	const { i18n } = useI18n();
	const loadingService = ref<LoadingService | null>(null);

	function startLoading(text?: string) {
		if (loadingService.value !== null) {
			return;
		}

		loadingService.value = Loading.service({
			lock: true,
			text: text || i18n.baseText('genericHelpers.loading'),
			spinner: 'el-icon-loading',
			background: 'rgba(255, 255, 255, 0.8)',
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

	return {
		startLoading,
		setLoadingText,
		stopLoading,
	};
}
