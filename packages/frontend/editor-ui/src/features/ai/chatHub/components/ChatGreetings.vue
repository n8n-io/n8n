<script setup lang="ts">
import { truncate } from '@n8n/utils/string/truncate';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { type ChatModelDto } from '@n8n/api-types';
import ChatAgentAvatar from './ChatAgentAvatar.vue';

defineProps<{
	selectedAgent: ChatModelDto | null;
}>();

const i18n = useI18n();
</script>

<template>
	<div key="greetings" :class="$style.greetings">
		<template v-if="selectedAgent">
			<N8nText size="large">{{ i18n.baseText('chatHub.chat.greeting') }}</N8nText>
			<ChatAgentAvatar :agent="selectedAgent" size="md" :class="$style.icon" />
			<N8nText size="large" bold>{{ truncate(selectedAgent.name, 40) }}</N8nText>
		</template>
		<template v-else>
			<N8nText size="large">{{ i18n.baseText('chatHub.chat.greeting.fallback') }}</N8nText>
		</template>
	</div>
</template>

<style lang="scss" module>
.greetings {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.icon {
	flex-shrink: 0;
	margin-block: -4px;
}
</style>
