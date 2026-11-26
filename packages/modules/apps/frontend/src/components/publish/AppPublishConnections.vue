<script setup lang="ts">
import type { AppPublishPreviewResource } from '@n8n/api-types';
import { N8nCallout, N8nIcon } from '@n8n/design-system';

import { BINDING_KINDS } from '../configure/connections/bindingKinds';

defineProps<{
	theme: 'info' | 'warning';
	message: string;
	resources: AppPublishPreviewResource[];
}>();
</script>

<template>
	<N8nCallout :theme="theme" :class="$style.callout">
		<span :class="$style.message">{{ message }}</span>
		<!-- Spans with display: block, because the callout renders its content inside a span. -->
		<span :class="$style.list" role="list">
			<span
				v-for="resource in resources"
				:key="resource.key"
				:class="$style.item"
				role="listitem"
				:data-test-id="`app-publish-connection-${resource.key}`"
			>
				<N8nIcon :icon="BINDING_KINDS[resource.kind].icon" :size="14" :class="$style.icon" />
				<span :class="$style.name">{{ resource.name }}</span>
			</span>
		</span>
	</N8nCallout>
</template>

<style lang="scss" module>
.message {
	display: block;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin-top: var(--spacing--3xs);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	color: var(--text-color);
}

.icon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: var(--font-weight--medium);
}
</style>
