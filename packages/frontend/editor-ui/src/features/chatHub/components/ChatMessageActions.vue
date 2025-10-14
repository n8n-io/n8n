<script setup lang="ts">
import { N8nIconButton } from '@n8n/design-system';

const { role } = defineProps<{ role: 'user' | 'assistant' }>();

const emit = defineEmits<{
	copy: [];
	edit: [];
	regenerate: [];
}>();

function handleCopy() {
	emit('copy');
}

function handleEdit() {
	emit('edit');
}

function handleRegenerate() {
	emit('regenerate');
}
</script>

<template>
	<div :class="$style.actions">
		<N8nIconButton icon="copy" type="tertiary" size="small" text @click="handleCopy" />
		<N8nIconButton icon="pen" type="tertiary" size="small" text @click="handleEdit" />
		<N8nIconButton
			v-if="role === 'assistant'"
			icon="refresh-cw"
			type="tertiary"
			size="small"
			text
			@click="handleRegenerate"
		/>
	</div>
</template>

<style lang="scss" module>
.actions {
	display: flex;
	align-items: center;
}
</style>
