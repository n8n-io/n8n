<script lang="ts" setup>
import { N8nAiActivityStep } from '@n8n/design-system';
import { computed } from 'vue';

import type { AgentsChatHostEvent } from '@/features/ai/shared/agentsChat/types';

import { parseStatusHostEvent } from './assistantHostEvents';

const props = defineProps<{ event: AgentsChatHostEvent }>();

const message = computed(() => parseStatusHostEvent(props.event));
</script>

<template>
	<N8nAiActivityStep
		v-if="message"
		:label="message"
		:has-content="false"
		data-test-id="assistant-agent-status"
	/>
</template>
