<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

import { N8nEmptyState } from '@n8n/design-system';
type Props = {
	resourceType?: 'workflows' | 'credentials';
};

const i18n = useI18n();

const { resourceType = 'workflows' } = defineProps<Props>();
</script>

<template>
	<N8nEmptyState
		data-test-id="empty-shared-action-box"
		:heading="i18n.baseText(`workflows.empty.shared-with-me.${resourceType}.heading`)"
		:description="i18n.baseText(`workflows.empty.shared-with-me.${resourceType}.description`)"
	/>
</template>
