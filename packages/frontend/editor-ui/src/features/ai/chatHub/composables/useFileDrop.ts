import { ref, toValue, type MaybeRef } from 'vue';

export function useFileDrop(
	canAcceptFiles: MaybeRef<boolean>,
	onFilesDropped: (files: File[]) => void,
) {
	const isDragging = ref(false);

	function handleDragEnter(e: DragEvent) {
		if (!toValue(canAcceptFiles)) {
			return;
		}

		// Check if dragging files (not text or other content)
		if (e.dataTransfer?.types.includes('Files')) {
			isDragging.value = true;
		}
	}

	function handleDragLeave(e: DragEvent) {
		if (!toValue(canAcceptFiles)) {
			return;
		}

		// Only hide overlay if leaving the component
		const target = e.currentTarget as HTMLElement;
		const relatedTarget = e.relatedTarget as Node | null;

		if (relatedTarget && target.contains(relatedTarget)) {
			return;
		}

		isDragging.value = false;
	}

	function handleDragOver(e: DragEvent) {
		if (!toValue(canAcceptFiles)) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging.value = false;

		if (!toValue(canAcceptFiles)) {
			return;
		}

		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) {
			return;
		}

		onFilesDropped(Array.from(files));
	}

	function handlePaste(e: ClipboardEvent) {
		if (!toValue(canAcceptFiles)) {
			return;
		}

		const items = e.clipboardData?.items;
		if (!items) {
			return;
		}

		let hasFiles = false;
		const files: File[] = [];

		for (const item of Array.from(items)) {
			if (item.kind === 'file') {
				const file = item.getAsFile();
				if (file) {
					files.push(file);
					hasFiles = true;
				}
			}
		}

		// Prevent default paste behavior if files were found
		if (hasFiles) {
			e.preventDefault();
			onFilesDropped(files);
		}
	}

	return {
		isDragging,
		handleDragEnter,
		handleDragLeave,
		handleDragOver,
		handleDrop,
		handlePaste,
	};
}
