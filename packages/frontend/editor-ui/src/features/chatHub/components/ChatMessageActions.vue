<script setup lang="ts">
import type { ChatHubMessageType } from '@n8n/api-types';
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const i18n = useI18n();

const { type, justCopied } = defineProps<{
	type: ChatHubMessageType;
	justCopied: boolean;
}>();

const emit = defineEmits<{
	copy: [];
	edit: [];
	regenerate: [];
}>();

const copyTooltip = computed(() => {
	return justCopied ? i18n.baseText('generic.copied') : i18n.baseText('generic.copy');
});

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
		<N8nTooltip placement="bottom" :show-after="300">
			<Transition name="fade" mode="out-in">
				<N8nIconButton
					:key="justCopied ? 'check' : 'copy'"
					:icon="justCopied ? 'check' : 'copy'"
					type="tertiary"
					size="medium"
					text
					@click="handleCopy"
				/>
			</Transition>
			<template #content>{{ copyTooltip }}</template>
		</N8nTooltip>
		<N8nTooltip placement="bottom" :show-after="300">
			<N8nIconButton icon="pen" type="tertiary" size="medium" text @click="handleEdit" />
			<template #content>Edit</template>
		</N8nTooltip>
		<N8nTooltip v-if="type === 'ai'" placement="bottom" :show-after="300">
			<N8nIconButton
				icon="refresh-cw"
				type="tertiary"
				size="medium"
				text
				@click="handleRegenerate"
			/>
			<template #content>Regenerate</template>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.actions {
	display: flex;
	align-items: center;

	& g,
	& path {
		color: var(--color--text--tint-1);
		stroke-width: 2.5;
	}
}
</style>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
