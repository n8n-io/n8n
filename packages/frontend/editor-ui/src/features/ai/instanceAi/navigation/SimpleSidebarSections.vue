<script lang="ts" setup>
import { computed, watch } from 'vue';
import { N8nMenuItem } from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system';
import { useInstanceAiAvailable } from '../composables/useInstanceAiAvailability';
import AssistantAutomationsSection from './AssistantAutomationsSection.vue';
import AssistantChatsSection from './AssistantChatsSection.vue';
import SimpleWorkspaceDisclosure from './SimpleWorkspaceDisclosure.vue';
import { useAssistantListsSettled } from './useAssistantListsSettled';

/** A page that Simple mode moves from the top group into the Workspace. */
type WorkspacePage = { item: IMenuItem; testId: string };

const props = defineProps<{
	collapsed: boolean;
	/** The top-group items that Simple mode moves into the Workspace, only the ones the user can open. */
	items: readonly WorkspacePage[];
	/** The ids of the rows that the sidebar shows below these items in the Workspace (favourites, projects). */
	nestedItemIds: readonly string[];
	/** The sidebar item of the current page. */
	activeTabId?: string;
}>();

/** True while the Workspace is open. The sidebar shows its other rows only then. */
const workspaceOpen = defineModel<boolean>('workspaceOpen', { required: true });

// Show the Workspace only when it holds something, so that it never opens to nothing.
const hasWorkspaceContent = computed(
	() => props.items.length > 0 || props.nestedItemIds.length > 0,
);

// Chats and Automations load above the Workspace in the expanded sidebar. The Workspace waits
// for them, so that it does not move down below the user's pointer when they appear.
const isAssistantAvailable = useInstanceAiAvailable();
const listsSettled = useAssistantListsSettled(() => !props.collapsed && isAssistantAvailable.value);
const showWorkspace = computed(() => hasWorkspaceContent.value && listsSettled.value);

// The parent shows Favorites and Projects while the Workspace is open, so a hidden Workspace is
// closed. When it shows again, the disclosure gives the open state again.
watch(
	showWorkspace,
	(shown) => {
		if (!shown) workspaceOpen.value = false;
	},
	{ immediate: true },
);

const activeWorkspaceItemId = computed(() => {
	const activeId = props.activeTabId;
	if (!activeId) return undefined;
	const isInWorkspace =
		props.items.some(({ item }) => item.id === activeId) || props.nestedItemIds.includes(activeId);
	return isInWorkspace ? activeId : undefined;
});
</script>

<template>
	<div>
		<!-- Simple mode keeps the chats on top. Everything else is in the Workspace. -->
		<AssistantChatsSection :collapsed="props.collapsed" />
		<AssistantAutomationsSection :collapsed="props.collapsed" />
		<SimpleWorkspaceDisclosure
			v-if="showWorkspace"
			v-model:open="workspaceOpen"
			:collapsed="props.collapsed"
			:active-item-id="activeWorkspaceItemId"
		/>
		<div
			v-if="showWorkspace && workspaceOpen && props.items.length > 0"
			:class="[$style.items, { [$style.nested]: !props.collapsed }]"
		>
			<N8nMenuItem
				v-for="entry in props.items"
				:key="entry.testId"
				:item="entry.item"
				:compact="props.collapsed"
				:active="props.activeTabId === entry.item.id"
				:data-test-id="entry.testId"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.items {
	padding: var(--spacing--2xs) var(--spacing--3xs);
}

// The rows of the Workspace start one step in from its title, so that they read as its content.
// The collapsed sidebar shows icons only, so it keeps them in line.
.nested {
	padding-inline-start: calc(var(--spacing--3xs) + var(--spacing--xs));
}
</style>
