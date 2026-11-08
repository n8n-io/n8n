export { default as N8nTabs } from './Tabs.vue';

/**
 * Headless tab context for custom tab markup.
 * `N8nTabs` renders a styled strip from an options list.
 * Use these parts when that strip cannot hold the tab controls.
 */
export {
	TabsContent as N8nTabsContent,
	TabsList as N8nTabsList,
	TabsRoot as N8nTabsRoot,
	TabsTrigger as N8nTabsTrigger,
} from './reka-ui';

export type {
	TabsContentProps as N8nTabsContentProps,
	TabsListProps as N8nTabsListProps,
	TabsRootEmits as N8nTabsRootEmits,
	TabsRootProps as N8nTabsRootProps,
	TabsTriggerProps as N8nTabsTriggerProps,
} from './reka-ui';
