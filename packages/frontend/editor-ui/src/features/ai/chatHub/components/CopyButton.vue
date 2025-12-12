<script setup lang="ts">
import { computed, ref } from 'vue';
import { useClipboard } from '@/app/composables/useClipboard';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';

const { content } = defineProps<{ content: string }>();

const i18n = useI18n();
const clipboard = useClipboard();
const justCopied = ref(false);
const copyTooltip = computed(() => {
	return justCopied.value ? i18n.baseText('generic.copied') : i18n.baseText('generic.copy');
});

async function handleCopy() {
	await clipboard.copy(content);
	justCopied.value = true;
	setTimeout(() => {
		justCopied.value = false;
	}, 1000);
}
</script>

<template>
	<N8nTooltip placement="bottom" :show-after="300">
		<N8nIconButton
			:icon="justCopied ? 'check' : 'copy'"
			type="tertiary"
			size="medium"
			text
			:class="$style.button"
			tabindex="0"
			@click="handleCopy"
		/>
		<template #content>{{ copyTooltip }}</template>
	</N8nTooltip>
</template>

<style lang="scss" module>
.button {
	& g,
	& path {
		color: var(--color--text--tint-1);
		stroke-width: 2.5;
	}
}
</style>
