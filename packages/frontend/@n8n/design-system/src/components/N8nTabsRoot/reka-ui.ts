/**
 * Local re-export shim for reka-ui Tabs primitives.
 *
 * Keep Tabs* imports behind this folder so product packages use the
 * design-system exports instead of importing from `reka-ui` directly.
 */
export { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';

export type {
	TabsContentProps,
	TabsListProps,
	TabsRootEmits,
	TabsRootProps,
	TabsTriggerProps,
} from 'reka-ui';
