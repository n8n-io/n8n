import { ref, toValue, type MaybeRef } from 'vue';
import { isFileAcceptedByAccept } from '@/features/ai/shared/utils/fileAccept';

export function useFileDrop(
	canAcceptFiles: MaybeRef<boolean>,
	onFilesDropped: (files: File[]) => void,
	acceptedTypes?: MaybeRef<string[]>,
) {
	const isDragging = ref(false);
	const isDraggingUnsupported = ref(false);

	function handleDragEnter(e: DragEvent) {
		if (!toValue(canAcceptFiles)) {
			return;
		}

		if (e.dataTransfer?.types.includes('Files')) {
			isDragging.value = true;

			const accepted = toValue(acceptedTypes);
			if (accepted && e.dataTransfer.items) {
				const fileItems = Array.from(e.dataTransfer.items).filter((item) => item.kind === 'file');
				isDraggingUnsupported.value =
					fileItems.length > 0 &&
					fileItems.every(
						(item) =>
							item.type !== '' && !isFileAcceptedByAccept('', item.type, accepted.join(',')),
					);
			}
		}
	}

	function handleDragLeave(e: DragEvent) {
		if (!toValue(canAcceptFiles)) {
			return;
		}

		const target = e.currentTarget as HTMLElement;
		const relatedTarget = e.relatedTarget as Node | null;

		if (relatedTarget && target.contains(relatedTarget)) {
			return;
		}

		isDragging.value = false;
		isDraggingUnsupported.value = false;
	}

	function handleDragOver(e: DragEvent) {
		if (!toValue(canAcceptFiles) || !e.dataTransfer?.types.includes('Files')) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();
	}

	function handleDrop(e: DragEvent) {
		if (!e.dataTransfer?.types.includes('Files')) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();
		isDragging.value = false;
		isDraggingUnsupported.value = false;

		if (!toValue(canAcceptFiles)) {
			return;
		}

		const files = e.dataTransfer.files;
		if (!files || files.length === 0) {
			return;
		}

		onFilesDropped(Array.from(files));
	}

	function handlePaste(e: ClipboardEvent) {
		if (!toValue(canAcceptFiles) || !e.clipboardData) {
			return;
		}

		const files = Array.from(e.clipboardData.files);
		if (files.length === 0) {
			for (const item of Array.from(e.clipboardData.items)) {
				if (item.kind !== 'file') continue;
				const file = item.getAsFile();
				if (file) files.push(file);
			}
		}

		if (files.length > 0) {
			e.preventDefault();
			onFilesDropped(files);
		}
	}

	return {
		isDragging,
		isDraggingUnsupported,
		handleDragEnter,
		handleDragLeave,
		handleDragOver,
		handleDrop,
		handlePaste,
	};
}
