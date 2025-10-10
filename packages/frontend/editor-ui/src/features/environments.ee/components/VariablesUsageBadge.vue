<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useClipboard } from '@/composables/useClipboard';

import { N8nTooltip } from '@n8n/design-system';
const i18n = useI18n();
const clipboard = useClipboard();
const { showMessage } = useToast();

const props = defineProps<{
	name: string;
}>();

const usage = computed(() => `$vars.${props.name}`);

const handleClick = () => {
	void clipboard.copy(usage.value);
	showMessage({
		title: i18n.baseText('variables.row.usage.copiedToClipboard'),
		type: 'success',
	});
};
</script>

<template>
	<N8nTooltip placement="top">
		<span class="usageSyntax" @click="handleClick">{{ usage }}</span>
		<template #content>
			{{ i18n.baseText('variables.row.usage.copyToClipboard') }}
		</template>
	</N8nTooltip>
</template>

<style lang="scss" scoped>
.usageSyntax {
	cursor: pointer;
	background: var(--color-variables-usage-syntax-bg);
	color: var(--color-variables-usage-font);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--sm);
}
</style>
