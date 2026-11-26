<script setup lang="ts">
import { inject } from 'vue';
import { N8nBadge } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { NodeVersionNewParameterKey } from '@/app/constants';

defineProps<{ path: string }>();

const i18n = useI18n();
const isNewParameter = inject(NodeVersionNewParameterKey, undefined);
</script>

<template>
	<N8nBadge
		v-if="isNewParameter?.(path)"
		variant="info"
		size="xxsmall"
		data-test-id="parameter-new-tag"
		>{{ i18n.baseText('generic.new') }}</N8nBadge
	>
</template>
