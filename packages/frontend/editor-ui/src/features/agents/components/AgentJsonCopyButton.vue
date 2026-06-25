<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useClipboard } from '@/app/composables/useClipboard';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		content: string;
		disabled?: boolean;
		testId?: string;
	}>(),
	{
		disabled: false,
		testId: undefined,
	},
);

const i18n = useI18n();
const clipboard = useClipboard();
const copied = ref(false);
let copiedResetTimer: ReturnType<typeof setTimeout> | null = null;

const label = computed(() =>
	copied.value
		? i18n.baseText('agents.builder.editor.copied')
		: i18n.baseText('agents.builder.editor.copy'),
);

async function copyJson() {
	if (!props.content || props.disabled) return;
	await clipboard.copy(props.content);
	copied.value = true;

	if (copiedResetTimer) clearTimeout(copiedResetTimer);
	copiedResetTimer = setTimeout(() => {
		copied.value = false;
		copiedResetTimer = null;
	}, 1500);
}

onBeforeUnmount(() => {
	if (copiedResetTimer) clearTimeout(copiedResetTimer);
});
</script>

<template>
	<span :class="$style.wrapper" v-bind="$attrs">
		<N8nTooltip :content="label" placement="bottom" :show-after="300">
			<N8nIconButton
				:icon="copied ? 'check' : 'copy'"
				variant="subtle"
				size="xmini"
				:aria-label="label"
				:disabled="props.disabled || !props.content"
				:data-testid="props.testId"
				@click="copyJson"
			/>
		</N8nTooltip>
	</span>
</template>

<style module>
.wrapper {
	display: inline-flex;
}
</style>
