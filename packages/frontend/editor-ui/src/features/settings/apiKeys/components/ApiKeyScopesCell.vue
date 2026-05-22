<script lang="ts" setup>
import type { ApiKey } from '@n8n/api-types';

defineProps<{
	apiKey: ApiKey;
}>();

const emit = defineEmits<{
	open: [apiKey: ApiKey];
}>();
</script>

<template>
	<button
		type="button"
		:class="$style.button"
		:disabled="!apiKey.scopes.length"
		data-test-id="api-key-scopes-cell"
		@click.stop="emit('open', apiKey)"
	>
		{{ apiKey.scopes.length }}
	</button>
</template>

<style lang="scss" module>
.button {
	background: none;
	border: none;
	padding: 0;
	color: var(--color--text);
	font: inherit;
	cursor: pointer;

	&:hover:not(:disabled) {
		color: var(--color--primary);
	}

	&:disabled {
		color: var(--color--text--tint-1);
		cursor: default;
	}
}
</style>
