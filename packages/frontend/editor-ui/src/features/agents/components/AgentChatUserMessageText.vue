<script setup lang="ts">
import { N8nChatToken } from '@n8n/design-system';
import { splitChatTokens } from '@n8n/utils/chat-tokens';
import { computed } from 'vue';

import { chatResourceTokenIcon } from '@/features/ai/shared/utils/chatResourceTokens';

/** The text of a user message, with each inline token, such as an @-mention, as a chip in place. */
const props = defineProps<{ text: string }>();

const segments = computed(() => splitChatTokens(props.text));
</script>

<template>
	<span>
		<template v-for="(segment, index) in segments" :key="index">
			<N8nChatToken
				v-if="segment.type === 'token'"
				:label="segment.label"
				:icon="chatResourceTokenIcon(segment.href)"
				data-testid="agent-chat-message-token"
			/>
			<template v-else>{{ segment.text }}</template>
		</template>
	</span>
</template>
