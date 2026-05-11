/**
 * Fast check if file path starts with a windows drive letter, e.g. 'C:/' or 'C:\\'
 */
export function isWindowsFilePath(str: string) {
	return /^[a-zA-Z]:[\\/]/.test(str);
}
