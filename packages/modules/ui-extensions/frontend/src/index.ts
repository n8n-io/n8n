// The module's only public entry. The shell imports the descriptor from here via
// `modules.manifest.ts`; anything else the shell (or a test) needs must be exported
// here too — deep paths into `src/` are not part of the contract.
export { UiExtensionsModule } from './ui-extensions.module';
export { useSidePanelStore } from './ui-extensions.store';
export { SIDE_PANEL_RAIL_WIDTH, UI_EXTENSION_PAGE_VIEW } from './ui-extensions.constants';
export { UI_EXTENSIONS_HOST_KEY } from './ui-extensions.types';
export type {
	SidePanelView,
	UiExtensionsHost,
	ViewOpenTarget,
	ViewRuntimeAssets,
} from './ui-extensions.types';

/** The side panel. Loaded lazily, so the shell bundle does not carry it. */
export const loadSidePanel = async () => await import('./components/SidePanel.vue');

/** The group of pages in the main sidebar. Loaded lazily, like the panel. */
export const loadPagesNav = async () => await import('./components/UiExtensionPagesNav.vue');
