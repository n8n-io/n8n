<script setup lang="ts">
import { N8nEmptyState } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { InboxSelection } from '../inbox.constants';

// AST-1518 replaces this rollout-gated integration point with the report and actions.
defineProps<{ selection: Extract<InboxSelection, { type: 'self_healing_result' }> }>();
defineEmits<{ changed: [] }>();
const i18n = useI18n();
</script>

<template>
	<N8nEmptyState
		:heading="i18n.baseText('inbox.resultUnavailable.title')"
		:description="i18n.baseText('inbox.resultUnavailable.body')"
		data-test-id="inbox-self-healing-detail"
		:data-result-id="selection.id"
	/>
</template>
