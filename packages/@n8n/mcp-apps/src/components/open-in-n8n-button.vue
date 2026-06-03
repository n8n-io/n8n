<script setup lang="ts">
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from 'vue-i18n';

import type { MessageSchema } from '../i18n';

withDefaults(
	defineProps<{
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

const { t } = useI18n<{ message: MessageSchema }>({ useScope: 'global' });
</script>

<template>
	<N8nButton :variant="variant" :size="size" @click="emit('click')">
		{{ t('workflowPreview.openButton') }}
		<template #icon>
			<N8nIcon icon="arrow-up-right" />
		</template>
	</N8nButton>
</template>
