<script lang="ts" setup>
import { computed } from 'vue';
import type { ApiKeyOwner } from '@n8n/api-types';
import { N8nAvatar, N8nText } from '@n8n/design-system';

const props = defineProps<{
	owner: ApiKeyOwner;
}>();

const displayName = computed(() => {
	const parts = [props.owner.firstName, props.owner.lastName].filter(Boolean);
	return parts.length ? parts.join(' ') : props.owner.email;
});
</script>

<template>
	<div :class="$style.container" data-test-id="api-key-owner-cell">
		<N8nAvatar :first-name="owner.firstName ?? ''" :last-name="owner.lastName ?? ''" size="small" />
		<div :class="$style.text">
			<N8nText size="small" :compact="true">{{ displayName }}</N8nText>
			<N8nText size="xsmall" color="text-light" :compact="true">{{ owner.email }}</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.text {
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;

	span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}
</style>
