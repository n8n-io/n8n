<script setup lang="ts">
import type { Page } from '@n8n/api-types';
import { useTemplateRef } from 'vue';

import PageEditorDocument from './PageEditorDocument.vue';
import type { PageSaveStatus } from '../composables/usePageDocument';
import type { SlashCommand } from '../editor/slashCommands';

/**
 * Edits one page: loads it, shows its title and content, and saves changes automatically.
 * It needs no route. Several editors of the same page can be mounted at the same time.
 */
const props = withDefaults(
	defineProps<{
		pageId: string;
		/** Optional. Without it the page loads by its id alone. */
		projectId?: string;
		/** Shows the page without editing. A user who cannot update the page always gets this. */
		readonly?: boolean;
		showTitle?: boolean;
		/** The commands of the `/` menu. Read once when a page opens. Defaults to the built-in commands. */
		slashCommands?: SlashCommand[];
	}>(),
	{ projectId: undefined, readonly: false, showTitle: true, slashCommands: undefined },
);

defineSlots<{
	/** Shown between the title and the content of a page that has loaded. */
	meta?: (props: { page: Page }) => unknown;
}>();

const emit = defineEmits<{
	/** The page was read from the server. */
	loaded: [page: Page];
	/** A change was saved. `page` holds the new version. */
	saved: [page: Page];
	/** The page changed elsewhere. `latest` replaced the local draft. */
	conflict: [latest: Page];
	/** The page does not exist or the user cannot read it. */
	notFound: [];
	saveStatus: [status: PageSaveStatus];
}>();

const document = useTemplateRef<InstanceType<typeof PageEditorDocument>>('document');

defineExpose({
	focusTitle: async () => await document.value?.focusTitle(),
	focusContent: () => document.value?.focusContent(),
	/** Saves pending changes now. */
	flush: () => document.value?.flush(),
	reload: async () => await document.value?.reload(),
});
</script>

<template>
	<!-- The key gives each page its own draft and its own pending save. -->
	<PageEditorDocument
		ref="document"
		:key="props.pageId"
		:page-id="props.pageId"
		:project-id="props.projectId"
		:readonly="props.readonly"
		:show-title="props.showTitle"
		:slash-commands="props.slashCommands"
		@loaded="emit('loaded', $event)"
		@saved="emit('saved', $event)"
		@conflict="emit('conflict', $event)"
		@not-found="emit('notFound')"
		@save-status="emit('saveStatus', $event)"
	>
		<template v-if="$slots.meta" #meta="{ page }">
			<slot name="meta" :page="page" />
		</template>
	</PageEditorDocument>
</template>
