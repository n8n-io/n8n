<script setup lang="ts" generic="Tab extends string">
import {
	N8nDialogDescription,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nTabs,
} from '@n8n/design-system';
import type { TabOptions } from '@n8n/design-system';

/** The header of the skill review dialogs: the title, the source line and the tabs. */
defineProps<{
	title: string;
	/** The source, such as `owner/repository · main`. */
	source: string;
	tabs: Array<TabOptions<Tab>>;
}>();

const activeTab = defineModel<Tab>('activeTab', { required: true });

defineSlots<{
	/** More details after the source line, each one after a separator. */
	details?: () => unknown;
}>();
</script>

<template>
	<N8nDialogHeader :class="$style.header">
		<div :class="$style.main">
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
			<N8nDialogDescription :class="$style.source">
				<N8nIcon icon="git-branch" size="small" />
				<span data-test-id="skill-review-source">{{ source }}</span>
				<slot name="details" />
			</N8nDialogDescription>
			<N8nTabs
				v-if="tabs.length > 0"
				v-model="activeTab"
				:options="tabs"
				:class="$style.tabs"
				data-test-id="skill-review-tabs"
			/>
		</div>
	</N8nDialogHeader>
</template>

<style lang="scss" module>
/* The tabs sit on the header divider. */
.header {
	border-bottom: var(--border);
	padding-block-end: 0;
}

/* One column, so the title, the source and the tabs stack beside the close button. */
.main {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
	width: 100%;
}

.source {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin: 0;
	color: var(--text-color--subtler);
}

.tabs {
	margin-top: var(--spacing--2xs);
}
</style>
