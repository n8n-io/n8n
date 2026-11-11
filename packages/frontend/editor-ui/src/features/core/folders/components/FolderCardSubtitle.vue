<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import TimeAgo from '@/app/components/TimeAgo.vue';

withDefaults(
	defineProps<{
		resourceCount: number;
		resourceLabel: string;
		subFolderCount: number;
		createdAt: number | string;
		updatedAt: number | string;
		testIdPrefix?: string;
	}>(),
	{ testIdPrefix: 'folder-card' },
);

const i18n = useI18n();
</script>

<template>
	<div :class="$style.subtitle" :data-test-id="`${testIdPrefix}-subtitle`">
		<N8nText
			v-if="resourceCount > 0"
			:class="[$style.infoCell, $style.count]"
			size="small"
			color="text-light"
			:data-test-id="`${testIdPrefix}-resource-count`"
		>
			{{ resourceLabel }}
		</N8nText>
		<N8nText
			v-if="subFolderCount > 0"
			:class="[$style.infoCell, $style.count]"
			size="small"
			color="text-light"
			:data-test-id="`${testIdPrefix}-folder-count`"
		>
			{{ i18n.baseText('generic.folderCount', { interpolate: { count: subFolderCount } }) }}
		</N8nText>
		<N8nText
			:class="$style.infoCell"
			size="small"
			color="text-light"
			:data-test-id="`${testIdPrefix}-last-updated`"
		>
			{{ i18n.baseText('workerList.item.lastUpdated') }}
			<TimeAgo :date="String(updatedAt)" />
		</N8nText>
		<N8nText
			:class="[$style.infoCell, $style.created]"
			size="small"
			color="text-light"
			:data-test-id="`${testIdPrefix}-created`"
		>
			{{ i18n.baseText('workflows.item.created') }}
			<TimeAgo :date="String(createdAt)" />
		</N8nText>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/breakpoints';

.subtitle {
	width: 100%;
}

.count {
	white-space: nowrap;
}

.infoCell + .infoCell::before {
	content: '|';
	margin: 0 var(--spacing--4xs);
}

@include breakpoints.breakpoint('sm-and-down') {
	.created {
		display: none;
	}
}
</style>
