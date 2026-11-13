import { onScopeDispose, shallowReactive, watch } from 'vue';

/** Keep image preview URLs until their files leave the attachment list. */
export function useAttachmentPreviews(files: () => readonly File[]) {
	const previews = shallowReactive(new Map<File, string>());

	watch(
		files,
		(currentFiles) => {
			const retainedFiles = new Set(currentFiles);
			for (const [file, url] of previews) {
				if (!retainedFiles.has(file)) {
					URL.revokeObjectURL(url);
					previews.delete(file);
				}
			}

			for (const file of currentFiles) {
				if (file.type.startsWith('image/') && !previews.has(file)) {
					previews.set(file, URL.createObjectURL(file));
				}
			}
		},
		{ deep: true, immediate: true, flush: 'sync' },
	);

	onScopeDispose(() => {
		for (const url of previews.values()) {
			URL.revokeObjectURL(url);
		}
		previews.clear();
	});

	function previewUrl(file: File): string | undefined {
		return previews.get(file);
	}

	return { previewUrl };
}
