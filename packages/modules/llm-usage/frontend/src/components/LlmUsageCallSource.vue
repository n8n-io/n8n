<script setup lang="ts">
import { N8nLink, N8nText } from '@n8n/design-system';

import type { CallSource } from '../llm-usage.source';

defineProps<{ source: CallSource }>();
</script>

<template>
	<div :class="$style.source">
		<N8nLink
			v-if="source.to"
			:to="source.to"
			theme="text"
			size="small"
			:class="$style.ellipsis"
			data-test-id="llm-usage-call-link"
		>
			{{ source.title }}
		</N8nLink>
		<N8nText v-else size="small" color="text-light" :class="$style.ellipsis">
			{{ source.title }}
		</N8nText>
		<N8nText v-if="source.detail" size="xsmall" color="text-light" :class="$style.ellipsis">
			{{ source.detail }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.source {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.ellipsis {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
