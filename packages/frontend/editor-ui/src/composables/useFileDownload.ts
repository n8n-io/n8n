import { ref, readonly } from 'vue';
import { BROWSER_ID_STORAGE_KEY } from '@n8n/constants';
import { useRootStore } from '@n8n/stores/useRootStore';

export function useFileDownload() {
	const isDownloading = ref(false);
	const error = ref<Error | null>(null);
	const rootStore = useRootStore();

	/**
	 * Get or generate a browser ID for request tracking
	 */
	function getBrowserId(): string {
		let browserId = localStorage.getItem(BROWSER_ID_STORAGE_KEY);
		if (!browserId) {
			browserId = crypto.randomUUID();
			localStorage.setItem(BROWSER_ID_STORAGE_KEY, browserId);
		}
		return browserId;
	}

	/**
	 * Download a file from a URL with automatic auth handling for internal URLs
	 * @param url - The URL to download from
	 * @param filename - Optional filename override
	 * @param additionalHeaders - Optional additional headers to include
	 */
	async function downloadFile(
		url: string,
		filename?: string,
		additionalHeaders?: Record<string, string>,
	): Promise<void> {
		error.value = null; // Clear previous errors
		isDownloading.value = true;

		try {
			const headers: Record<string, string> = { ...additionalHeaders };

			if (url.startsWith('/')) {
				headers['browser-id'] = getBrowserId();
				headers['push-ref'] = rootStore.restApiContext.pushRef;
			}

			const response = await fetch(url, { headers });
			if (!response.ok) {
				throw new Error(`Download failed: ${response.statusText}`);
			}

			const contentDisposition = response.headers.get('content-disposition');
			const responseFilename =
				contentDisposition
					?.split(';')
					.find((part) => part.trim().startsWith('filename='))
					?.split('=')[1]
					?.replace(/['"]/g, '') || null;

			const downloadFilename = filename || responseFilename || 'download';

			const blob = await response.blob();
			const blobUrl = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = blobUrl;
			a.download = downloadFilename;
			a.click();
			URL.revokeObjectURL(blobUrl);
		} catch (err) {
			error.value = err instanceof Error ? err : new Error('Download failed');
			throw err; // Re-throw for component handling
		} finally {
			isDownloading.value = false;
		}
	}

	return {
		isDownloading: readonly(isDownloading),
		error: readonly(error),
		downloadFile,
	};
}
