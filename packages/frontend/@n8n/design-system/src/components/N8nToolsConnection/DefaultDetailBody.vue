<script setup lang="ts">
import { computed } from 'vue';
import N8nText from '../N8nText';
import { useI18n } from '@n8n/i18n';
import type { ToolConnectionItem } from './types';

const props = defineProps<{
	item: ToolConnectionItem;
}>();

const i18n = useI18n();

const hasContent = computed(() => Boolean(props.item.longDescription));
</script>

<template>
	<div :class="$style.container" data-test-id="tools-connection-default-detail-body">
		<N8nText v-if="hasContent" step="sm">
			{{ item.longDescription }}
		</N8nText>
		<div v-else :class="$style.placeholder" data-test-id="tools-connection-detail-placeholder">
			<N8nText color="text-light" step="sm">
				{{ i18n.baseText('tools.connection.detail.noAdditionalDetails') }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
}

.placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
	min-height: 160px;
}
</style>
