import { Jf as toValue, Nf as init_reactivity_esm_bundler, Vf as ref } from "./vendor-Hx42-oQF.js";
import { Ra as isFileAcceptedByAccept } from "./app-D5flEmb-.js";
//#region src/features/ai/shared/composables/useFileDrop.ts
init_reactivity_esm_bundler();
function useFileDrop(canAcceptFiles, onFilesDropped, acceptedTypes) {
	const isDragging = ref(false);
	const isDraggingUnsupported = ref(false);
	function handleDragEnter(e) {
		if (!toValue(canAcceptFiles)) return;
		if (e.dataTransfer?.types.includes("Files")) {
			isDragging.value = true;
			const accepted = toValue(acceptedTypes);
			if (accepted && e.dataTransfer.items) {
				const fileItems = Array.from(e.dataTransfer.items).filter((item) => item.kind === "file");
				isDraggingUnsupported.value = fileItems.length > 0 && fileItems.every((item) => item.type !== "" && !isFileAcceptedByAccept("", item.type, accepted.join(",")));
			}
		}
	}
	function handleDragLeave(e) {
		if (!toValue(canAcceptFiles)) return;
		const target = e.currentTarget;
		const relatedTarget = e.relatedTarget;
		if (relatedTarget && target.contains(relatedTarget)) return;
		isDragging.value = false;
		isDraggingUnsupported.value = false;
	}
	function handleDragOver(e) {
		if (!toValue(canAcceptFiles) || !e.dataTransfer?.types.includes("Files")) return;
		e.preventDefault();
		e.stopPropagation();
	}
	function handleDrop(e) {
		if (!e.dataTransfer?.types.includes("Files")) return;
		e.preventDefault();
		e.stopPropagation();
		isDragging.value = false;
		isDraggingUnsupported.value = false;
		if (!toValue(canAcceptFiles)) return;
		const files = e.dataTransfer.files;
		if (!files || files.length === 0) return;
		onFilesDropped(Array.from(files));
	}
	function handlePaste(e) {
		if (!toValue(canAcceptFiles) || !e.clipboardData) return;
		const files = Array.from(e.clipboardData.files);
		if (files.length === 0) for (const item of Array.from(e.clipboardData.items)) {
			if (item.kind !== "file") continue;
			const file = item.getAsFile();
			if (file) files.push(file);
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
		handlePaste
	};
}
//#endregion
export { useFileDrop as t };
