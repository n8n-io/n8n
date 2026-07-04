<script setup lang="ts">
import { computed } from 'vue';

import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineOptions({ inheritAttrs: false });

interface Props {
	tooltip?: boolean;
	tooltipText?: string;
}

const props = withDefaults(defineProps<Props>(), {
	tooltip: true,
	tooltipText: undefined,
});

const i18n = useI18n();

const content = computed(() => props.tooltipText ?? i18n.baseText('credentials.private.tooltip'));
</script>

<template>
	<N8nTooltip as-child :disabled="!tooltip" placement="top">
		<template #content>{{ content }}</template>
		<N8nIcon v-bind="$attrs" data-test-id="private-credential-icon" icon="user-round-key" />
	</N8nTooltip>
</template>
