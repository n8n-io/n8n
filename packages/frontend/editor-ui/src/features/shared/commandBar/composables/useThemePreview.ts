import { onScopeDispose } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { applyThemeWithTransition, isValidTheme } from '@/app/stores/ui.utils';
import type { CommandBarItem, ThemeCommandBarItem } from '../types';

function isThemeCommandBarItem(item: CommandBarItem): item is ThemeCommandBarItem {
	return (
		'theme' in item &&
		typeof item.theme === 'string' &&
		(item.theme === 'system' || isValidTheme(item.theme))
	);
}

/**
 * Previews the theme of the highlighted command bar item.
 * A preview only changes the body attributes. The store and localStorage keep the saved theme,
 * so the select handler of the item is the only place that saves a theme.
 */
export function useThemePreview() {
	const uiStore = useUIStore();
	let isPreviewing = false;
	let restoreFrame: number | undefined;

	function cancelRestore() {
		if (restoreFrame === undefined) return;
		cancelAnimationFrame(restoreFrame);
		restoreFrame = undefined;
	}

	function restore() {
		cancelRestore();
		if (!isPreviewing) return;
		isPreviewing = false;
		// After a select, the store already holds the new theme, so this does not undo it.
		applyThemeWithTransition(uiStore.theme);
	}

	// The bar can report no highlight before the next row. Wait one frame,
	// so the saved theme does not paint between two previews.
	function scheduleRestore() {
		if (!isPreviewing || restoreFrame !== undefined) return;
		restoreFrame = requestAnimationFrame(restore);
	}

	function highlight(item: CommandBarItem | null) {
		if (item && isThemeCommandBarItem(item)) {
			cancelRestore();
			isPreviewing = true;
			applyThemeWithTransition(item.theme);
			return;
		}
		scheduleRestore();
	}

	// The bar can unmount while it is open.
	onScopeDispose(restore);

	return { highlight };
}
