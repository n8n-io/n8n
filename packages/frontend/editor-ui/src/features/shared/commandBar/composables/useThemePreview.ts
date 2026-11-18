import { onScopeDispose } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { applyThemeWithTransition, isThemeFamily, isThemeMode } from '@/app/stores/ui.utils';
import type { ThemeSelection } from '@/Interface';
import type { CommandBarItem, ThemeCommandBarItem } from '../types';

function isThemeCommandBarItem(item: CommandBarItem): item is ThemeCommandBarItem {
	if (!('theme' in item) || typeof item.theme !== 'object' || item.theme === null) return false;

	const { mode, family } = item.theme as Partial<Record<keyof ThemeSelection, unknown>>;
	return (
		(mode !== undefined || family !== undefined) &&
		(mode === undefined || isThemeMode(mode)) &&
		(family === undefined || isThemeFamily(family))
	);
}

/**
 * Previews the theme of the highlighted command bar item.
 * A mode preview keeps the saved family. A family preview keeps the saved mode.
 * A preview only changes the body attributes. The store and localStorage keep the saved theme,
 * so the select handler of the item is the only place that saves a theme.
 */
export function useThemePreview() {
	const uiStore = useUIStore();
	const savedSelection = (): ThemeSelection => ({
		mode: uiStore.themeMode,
		family: uiStore.themeFamily,
	});
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
		applyThemeWithTransition(savedSelection());
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
			applyThemeWithTransition({ ...savedSelection(), ...item.theme });
			return;
		}
		scheduleRestore();
	}

	// The bar can unmount while it is open.
	onScopeDispose(restore);

	return { highlight };
}
