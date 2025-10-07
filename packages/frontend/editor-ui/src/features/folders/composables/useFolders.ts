import {
	FOLDER_NAME_ILLEGAL_CHARACTERS_REGEX,
	FOLDER_NAME_MAX_LENGTH,
	FOLDER_NAME_ONLY_DOTS_REGEX,
	ILLEGAL_FOLDER_CHARACTERS,
} from '../folders.constants';
import { useI18n } from '@n8n/i18n';
import { useFoldersStore } from '../folders.store';
import { computed } from 'vue';
import type { DragTarget, DropTarget } from '../folders.types';

export function isDropTarget(target: DragTarget | DropTarget): target is DropTarget {
	return target.type === 'folder' || target.type === 'project';
}

export function isValidResourceType(value: string): value is 'folder' | 'workflow' | 'project' {
	return ['folder', 'workflow', 'project'].includes(value);
}

export function useFolders() {
	const i18n = useI18n();

	const foldersStore = useFoldersStore();

	const isDragging = computed(() => {
		return foldersStore.draggedElement !== null;
	});

	function validateFolderName(folderName: string): true | string {
		if (FOLDER_NAME_ILLEGAL_CHARACTERS_REGEX.test(folderName)) {
			return i18n.baseText('folders.invalidName.invalidCharacters.message', {
				interpolate: {
					illegalChars: ILLEGAL_FOLDER_CHARACTERS.join(' '),
				},
			});
		}

		if (FOLDER_NAME_ONLY_DOTS_REGEX.test(folderName)) {
			return i18n.baseText('folders.invalidName.only.dots.message');
		}

		if (folderName.startsWith('.')) {
			return i18n.baseText('folders.invalidName.starts.with.dot..message');
		}

		if (folderName.trim() === '') {
			return i18n.baseText('folders.invalidName.empty.message');
		}

		if (folderName.length > FOLDER_NAME_MAX_LENGTH) {
			return i18n.baseText('folders.invalidName.tooLong.message', {
				interpolate: {
					maxLength: FOLDER_NAME_MAX_LENGTH,
				},
			});
		}
		return true;
	}

	/**
	 * Drag and drop methods
	 */
	function onDragStart(el: HTMLElement): void {
		const eventTarget = el.closest('[data-target]') as HTMLElement;
		if (!eventTarget) return;

		const dragTarget = getDragAndDropTarget(eventTarget);
		if (!dragTarget) return;

		if (dragTarget.type === 'folder' || dragTarget.type === 'workflow') {
			foldersStore.draggedElement = {
				type: dragTarget.type,
				id: dragTarget.id,
				name: dragTarget.name,
			};
		}
	}

	function onDragEnd(): void {
		foldersStore.draggedElement = null;
		foldersStore.activeDropTarget = null;
	}

	function onDragEnter(event: MouseEvent): void {
		const eventTarget = event.target as HTMLElement;
		if (!eventTarget || !isDragging.value) return;
		event.preventDefault();
		event.stopPropagation();
		const dragTarget = getDragAndDropTarget(eventTarget);
		if (!dragTarget || dragTarget.type !== 'folder') return;

		foldersStore.activeDropTarget = {
			type: dragTarget.type,
			id: dragTarget.id,
			name: dragTarget.name,
		};
	}

	function resetDropTarget(): void {
		foldersStore.activeDropTarget = null;
	}

	/**
	 * Get the drag or drop target element from the event target
	 * @param el
	 */
	function getDragAndDropTarget(el: HTMLElement): DragTarget | DropTarget | null {
		const dragTarget = el.closest('[data-target]') as HTMLElement;
		if (!dragTarget) return null;
		const targetResource = dragTarget.dataset.target;
		const targetId = dragTarget.dataset.resourceid;
		const targetName = dragTarget.dataset.resourcename;

		if (!targetResource || !targetId || !targetName || !isValidResourceType(targetResource))
			return null;

		return {
			type: targetResource,
			id: targetId,
			name: targetName,
		};
	}

	/**
	 * Handle the drop event by getting the dragged resource and drop target
	 * @param event
	 */
	function handleDrop(event: MouseEvent): {
		draggedResource?: DragTarget;
		dropTarget?: DropTarget;
	} {
		const eventTarget = event.target as HTMLElement;
		if (!eventTarget || !isDragging.value) return {};
		event.preventDefault();

		// Save previous dragged element before cancelling the drag event
		const draggedResourceId = foldersStore.draggedElement?.id;
		const draggedResourceType = foldersStore.draggedElement?.type;
		const draggedResourceName = foldersStore.draggedElement?.name;
		if (!draggedResourceId || !draggedResourceType || !draggedResourceName) return {};
		onDragEnd();

		const dropTarget = getDragAndDropTarget(eventTarget);
		if (!dropTarget || !isDropTarget(dropTarget)) return {};

		return {
			draggedResource: {
				type: draggedResourceType,
				id: draggedResourceId,
				name: draggedResourceName,
			},
			dropTarget: {
				type: dropTarget.type,
				id: dropTarget.id,
				name: dropTarget.name,
			},
		};
	}

	return {
		validateFolderName,
		onDragStart,
		onDragEnd,
		onDragEnter,
		resetDropTarget,
		handleDrop,
	};
}
