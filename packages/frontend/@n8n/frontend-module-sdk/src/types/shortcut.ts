/**
 * A global keyboard shortcut a module contributes. `keys` uses the same syntax
 * as the shell's `useKeybindings` (e.g. `'ctrl+k'`, `'ctrl+b|ctrl+c'`).
 */
export interface ModuleShortcut {
	keys: string;
	run: (event: KeyboardEvent) => void;
	disabled?: () => boolean;
}
