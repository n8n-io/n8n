import type { ResizeData } from '@n8n/design-system';
import { ref, watch, type Ref } from 'vue';

/**
 * Min/max/default for one resizable column. The floors match the fixed
 * widths the layout used before it became resizable, so a column can never
 * shrink past what its own content needs. Caps keep any one column from
 * eating the canvas.
 */
interface ColumnBounds {
	min: number;
	max: number;
	default: number;
}

const STORAGE_PREFIX = 'n8n-ui-builder-panel-width-';

export const PALETTE_BOUNDS: ColumnBounds = { min: 160, max: 320, default: 200 };
export const PAGES_OUTLINE_BOUNDS: ColumnBounds = { min: 180, max: 400, default: 220 };
export const INSPECTOR_BOUNDS: ColumnBounds = { min: 240, max: 480, default: 320 };

function readStoredWidth(name: string, bounds: ColumnBounds): number {
	const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${name}`);
	const parsed = raw === null ? NaN : Number(raw);

	if (!Number.isFinite(parsed) || parsed <= 0) return bounds.default;

	return Math.min(Math.max(parsed, bounds.min), bounds.max);
}

/**
 * A single resizable column's width, read from `localStorage` on creation and
 * written back on every change so it survives a reload.
 */
function useStoredWidth(name: string, bounds: ColumnBounds): Ref<number> {
	const width = ref(readStoredWidth(name, bounds));

	watch(width, (value) => {
		window.localStorage.setItem(`${STORAGE_PREFIX}${name}`, String(value));
	});

	return width;
}

/**
 * Owns the pixel widths of the builder's resizable columns (palette,
 * pages+outline, inspector). The canvas column is deliberately not tracked
 * here: it fills whatever space the others leave behind.
 *
 * `N8nResizeWrapper` holds no state itself, so each `on*Resize` handler below
 * is what turns its `resize` event into the width the template actually uses.
 */
export function useUiBuilderLayout() {
	const paletteWidth = useStoredWidth('palette', PALETTE_BOUNDS);
	const pagesOutlineWidth = useStoredWidth('pages-outline', PAGES_OUTLINE_BOUNDS);
	const inspectorWidth = useStoredWidth('inspector', INSPECTOR_BOUNDS);

	return {
		paletteWidth,
		pagesOutlineWidth,
		inspectorWidth,
		paletteBounds: PALETTE_BOUNDS,
		pagesOutlineBounds: PAGES_OUTLINE_BOUNDS,
		inspectorBounds: INSPECTOR_BOUNDS,
		onPaletteResize: ({ width }: ResizeData) => (paletteWidth.value = width),
		onPagesOutlineResize: ({ width }: ResizeData) => (pagesOutlineWidth.value = width),
		onInspectorResize: ({ width }: ResizeData) => (inspectorWidth.value = width),
	};
}
