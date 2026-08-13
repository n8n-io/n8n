/** Matches the backend module name, so the project tab hides when it is disabled. */
export const PROJECT_FILES_MODULE_NAME = 'project-files';

// Route and view identifiers
export const PROJECT_FILES = 'project-files';
export const PROJECT_FILES_STORE = 'projectFilesStore';

export const DEFAULT_PROJECT_FILES_PAGE_SIZE = 10;
export const PROJECT_FILES_PAGE_SIZES = [10, 25, 50, 100];

export const PROJECT_FILE_ACTIONS = {
	DOWNLOAD: 'download',
	RENAME: 'rename',
	DELETE: 'delete',
} as const;

/** Fraction of the quota at which the usage line switches to a warning. */
export const PROJECT_FILES_QUOTA_WARNING_THRESHOLD = 0.8;

/**
 * Characters of a text file rendered in the preview. The server caps the file at
 * `maxPreviewSize`, but a file just under that cap still freezes the tab inside a
 * `<pre>`, so the display is cut again here.
 */
export const MAX_PREVIEW_TEXT_LENGTH = 200_000;
