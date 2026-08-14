<script setup lang="ts">
import { computed } from 'vue';
import { N8nText } from '@n8n/design-system';
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
		<p v-if="hasContent" :class="$style.description">
			{{ item.longDescription }}
		</p>
		<div v-else :class="$style.placeholder" data-test-id="tools-connection-detail-placeholder">
			<N8nText color="text-light">
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

.description {
	margin: 0;
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
}

.placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
	min-height: 160px;
}
</style>
