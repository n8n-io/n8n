/**
 * Matches a design-system folder on posix and windows paths.
 * Pass each folder under `src`, for example `components/N8nSwitch`.
 */
export function designSystemComponentPath(...folders: readonly string[]): RegExp {
	const separator = '[/\\\\]';
	const body = folders.map((folder) => folder.split('/').join(separator)).join('|');
	return new RegExp(`${separator}design-system${separator}src${separator}(?:${body})${separator}`);
}
