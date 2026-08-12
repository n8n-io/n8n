// Route and view identifiers
export const FILES_VIEW = 'files';
export const PROJECT_FILES = 'project-files';
export const PROJECT_FILES_PREVIEW = 'project-files-preview';
export const FILES_STORE = 'filesStore';

export const FILES_MODULE_NAME = 'file-storage';

export const FILE_CARD_ACTIONS = {
	PREVIEW: 'preview',
	DOWNLOAD: 'download',
	REPLACE: 'replace',
	RENAME: 'rename',
	DELETE: 'delete',
	FAVORITE: 'favorite',
} as const;

export const RENAME_FILE_MODAL_KEY = 'renameFileModal';
export const REPLACE_FILE_MODAL_KEY = 'replaceFileModal';
export const UPLOAD_CONFLICT_MODAL_KEY = 'uploadConflictModal';
