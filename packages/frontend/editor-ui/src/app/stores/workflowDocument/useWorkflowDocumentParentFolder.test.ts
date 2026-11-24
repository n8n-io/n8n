import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentParentFolder } from './useWorkflowDocumentParentFolder';
import type { ResourceParentFolder } from '@/features/core/folders/folders.types';

const mockFolder: ResourceParentFolder = {
	id: 'folder-1',
	name: 'My Folder',
	parentFolderId: null,
};

const mockNestedFolder: ResourceParentFolder = {
	id: 'folder-2',
	name: 'Nested Folder',
	parentFolderId: 'folder-1',
};

function createParentFolder() {
	return useWorkflowDocumentParentFolder();
}

describe('useWorkflowDocumentParentFolder', () => {
	describe('initial state', () => {
		it('should start with null parentFolder', () => {
			const { parentFolder } = createParentFolder();
			expect(parentFolder.value).toBeNull();
		});
	});

	describe('setParentFolder', () => {
		it('should set parentFolder and fire event hook', () => {
			const { parentFolder, setParentFolder, onParentFolderChange } = createParentFolder();
			const hookSpy = vi.fn();
			onParentFolderChange(hookSpy);

			setParentFolder(mockFolder);

			expect(parentFolder.value).toEqual(mockFolder);
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: mockFolder,
			});
		});

		it('should clear parentFolder when set to null', () => {
			const { parentFolder, setParentFolder } = createParentFolder();
			setParentFolder(mockFolder);

			setParentFolder(null);

			expect(parentFolder.value).toBeNull();
		});

		it('should replace existing parentFolder', () => {
			const { parentFolder, setParentFolder } = createParentFolder();
			setParentFolder(mockFolder);

			setParentFolder(mockNestedFolder);

			expect(parentFolder.value).toEqual(mockNestedFolder);
		});

		it('should fire event hook on every call', () => {
			const { setParentFolder, onParentFolderChange } = createParentFolder();
			const hookSpy = vi.fn();
			onParentFolderChange(hookSpy);

			setParentFolder(mockFolder);
			setParentFolder(null);

			expect(hookSpy).toHaveBeenCalledTimes(2);
		});
	});
});
