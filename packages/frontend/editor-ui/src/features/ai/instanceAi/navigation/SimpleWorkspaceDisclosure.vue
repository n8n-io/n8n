<script lang="ts" setup>
import { computed, watch } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { HOVER_DELAY } from '@/app/constants';
import AssistantSectionHeader from './AssistantSectionHeader.vue';

const WORKSPACE_OPEN_KEY = 'n8n:sidebar:workspace-open';

const props = defineProps<{ collapsed: boolean }>();

/** True while the sidebar shows the sections that Simple mode keeps in the Workspace. */
const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();
const title = computed(() => i18n.baseText('experienceMode.workspace'));

// The choice stays in this browser, like the other sidebar sections. When the storage
// is blocked, the choice lasts for this page only.
const storedOpen = useLocalStorage(WORKSPACE_OPEN_KEY, false, {
	writeDefaults: false,
	onError: () => {},
});

// The parent starts closed. Give it the stored choice, also when another tab changes it.
watch(
	storedOpen,
	(value) => {
		open.value = value;
	},
	{ immediate: true },
);

function setOpen(value: boolean) {
	open.value = value;
	storedOpen.value = value;
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
