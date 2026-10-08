<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useStorage } from '@vueuse/core';
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { HOVER_DELAY } from '@/app/constants';
import AssistantSectionHeader from './AssistantSectionHeader.vue';

const WORKSPACE_OPEN_KEY = 'n8n:sidebar:workspace-open';

const props = defineProps<{
	collapsed: boolean;
	/** The sidebar item of the current page, when the Workspace holds it. */
	activeItemId?: string;
}>();

/** True while the sidebar shows the sections that Simple mode keeps in the Workspace. */
const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();
const title = computed(() => i18n.baseText('experienceMode.workspace'));

// The choice stays in this browser, like the other sidebar sections. When the storage
// is blocked, the choice lasts for this page only. `useStorage` without a storage also
// catches an error from the `localStorage` lookup itself.
const storedOpen = useStorage(WORKSPACE_OPEN_KEY, false, undefined, {
	writeDefaults: false,
	onError: () => {},
});

// A page that the Workspace holds opens it, so that the sidebar shows where the user is.
// This does not change the stored choice: the next visit starts as the user left it.
const revealed = ref(false);
watch(
	() => props.activeItemId,
	(itemId) => {
		if (itemId) revealed.value = true;
	},
	{ immediate: true },
);

// The parent starts closed. Give it the shown state, also when another tab changes it.
watch(
	() => storedOpen.value || revealed.value,
	(value) => {
		open.value = value;
	},
	{ immediate: true },
);

function setOpen(value: boolean) {
	revealed.value = false;
	storedOpen.value = value;
	open.value = value;
}
</script>

<template>
	<!-- The collapsed sidebar shows icons only, so the toggle is an icon with a tooltip. -->
	<div v-if="props.collapsed" :class="$style.compact">
		<N8nTooltip :content="title" placement="right" :show-after="HOVER_DELAY.SHOW" as-child>
			<N8nIconButton
				variant="ghost"
				size="small"
				icon="grid-2x2"
				icon-size="large"
				:aria-label="title"
				:aria-expanded="open"
				data-test-id="simple-workspace-toggle"
				@click="setOpen(!open)"
			/>
		</N8nTooltip>
	</div>
	<div v-else :class="$style.section" data-test-id="simple-workspace">
		<AssistantSectionHeader
			:collapsed="!open"
			:title="title"
			@update:collapsed="(collapsed) => setOpen(!collapsed)"
		/>
	</div>
</template>

<style lang="scss" module>
// The same inset as the Chats and Automations sections, so that the titles line up.
.section {
	padding: var(--spacing--3xs) var(--spacing--3xs) 0;
}

.compact {
	padding: var(--spacing--3xs);
}
</style>
