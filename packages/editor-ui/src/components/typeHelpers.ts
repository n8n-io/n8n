import { EditorTheme } from "@/Interface";

export function isEditorTheme(theme: unknown): theme is EditorTheme {
	return typeof theme === 'string' && ['light', 'dark'].includes(theme);
}
