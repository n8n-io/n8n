import { ref, readonly } from 'vue';
import { BROWSER_ID_STORAGE_KEY } from '@n8n/constants';

export function useFileDownload() {
	const isDownloading = ref(false);

	function getBrowserId(): string {
		let browserId = localStorage.getItem(BROWSER_ID_STORAGE_KEY);
		if (!browserId) {
			browserId = crypto.randomUUID();
			localStorage.setItem(BROWSER_ID_STORAGE_KEY, browserId);
		}
		return browserId;
	}

	async function downloadFile(
		url: string,
		filename?: string,
		additionalHeaders?: Record<string, string>,
	): Promise<void> {
		isDownloading.value = true;

		try {
			const headers: Record<string, string> = { ...additionalHeaders };

			if (url.startsWith('/')) {
				headers['browser-id'] = getBrowserId();
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
		} finally {
			isDownloading.value = false;
		}
	}

	return {
		isDownloading: readonly(isDownloading),
		downloadFile,
	};
}
