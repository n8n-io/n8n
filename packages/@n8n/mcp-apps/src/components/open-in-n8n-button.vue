<script setup lang="ts">
import { N8nButton, N8nIcon } from '@n8n/design-system';

import { useI18n } from '@mcp-apps/i18n';

withDefaults(
	defineProps<{
		label?: string;
		variant?: 'solid' | 'subtle';
		size?: 'small' | 'medium';
	}>(),
	{
		variant: 'subtle',
		size: 'small',
	},
);

const emit = defineEmits<{
	click: [];
}>();

const { t } = useI18n();
</script>

<template>
	<N8nButton :variant="variant" :size="size" @click="emit('click')">
		{{ label ?? t('workflowPreview.openButton') }}
		<template #icon>
			<N8nIcon icon="arrow-up-right" />
		</template>
	</N8nButton>
</template>
