// The module's only public entry. The shell imports the descriptor from here via
// `modules.manifest.ts`; anything else the shell (or a test) needs must be exported
// here too — deep paths into `src/` are not part of the contract.
export { PageModule } from './page.module';
export { PAGE_SHORT_LINK_VIEW, PROJECT_PAGES_VIEW } from './page.constants';
export { usePageStore } from './page.store';
export {
	getPageBacklinks,
	getPageById,
	listAllPages,
	listNodeReferences,
	listReferencingPages,
} from './page.api';
export { getPagePermissions, type PagePermissions } from './page.permissions';
export { default as PageEditor } from './components/PageEditor.vue';
export type { PageSaveStatus } from './composables/usePageDocument';
export { default as ResourceChip } from './resources/ResourceChip.vue';
export { usePageResourceStore, type ResourceResolution } from './resources/resource.store';
export { toAbsoluteUrl, toInstanceRelativePath } from './resources/resourceUrl';
export type { InstanceLocation } from './resources/resourceUrl';
export { useInstanceLocation } from './composables/useInstanceLocation';
export { usePageTourStart } from './composables/usePageTourStart';
export {
	DEFAULT_SLASH_COMMANDS,
	insertMarkdownAtSelection,
	type SlashCommand,
	type SlashCommandContext,
} from './editor/slashCommands';
export { splitTitleEmoji, type TitleParts } from './resources/titleEmoji';
