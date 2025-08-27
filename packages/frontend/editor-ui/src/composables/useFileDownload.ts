import { ref, readonly } from 'vue';
import type { RawAxiosRequestHeaders, AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { BROWSER_ID_STORAGE_KEY } from '@n8n/constants';

export function useFileDownload() {
	const isDownloading = ref(false);
	const error = ref<Error | null>(null);
	const toast = useToast();
	const i18n = useI18n();

	const getBrowserId = () => {
		let browserId = localStorage.getItem(BROWSER_ID_STORAGE_KEY);
		if (!browserId) {
			browserId = crypto.randomUUID();
			localStorage.setItem(BROWSER_ID_STORAGE_KEY, browserId);
		}
		return browserId;
	};

	const downloadFile = async (
		baseURL: string,
		endpoint: string,
		defaultFilename = 'download',
		headers?: RawAxiosRequestHeaders,
	) => {
		isDownloading.value = true;
		error.value = null;

		try {
			const options: AxiosRequestConfig = {
				method: 'GET',
				url: endpoint,
				baseURL,
				headers: headers ?? {},
				responseType: 'blob',
			};

			if (baseURL.startsWith('/')) {
				options.headers!['browser-id'] = getBrowserId();
			}

			if (
				import.meta.env.NODE_ENV !== 'production' &&
				!baseURL.includes('api.n8n.io') &&
				!baseURL.includes('n8n.cloud')
			) {
				options.withCredentials = options.withCredentials ?? true;
			}

			const response = await axios.request(options);

			const filename =
				(response.headers['content-disposition'] as string)?.match(/filename="([^"]+)"/)?.[1] ??
				defaultFilename;

			const blob = new Blob([response.data]);
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			const downloadError = err instanceof Error ? err : new Error('Download failed');
			error.value = downloadError;
			throw downloadError;
		} finally {
			isDownloading.value = false;
		}
	};

	const downloadThirdPartyLicenses = async (baseURL: string, pushRef: string) => {
		try {
			await downloadFile(baseURL, '/third-party-licenses', 'THIRD_PARTY_LICENSES.md', {
				'push-ref': pushRef,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('about.thirdPartyLicenses.downloadError'));
		}
	};

	return {
		isDownloading: readonly(isDownloading),
		error: readonly(error),
		downloadFile,
		downloadThirdPartyLicenses,
	};
}
