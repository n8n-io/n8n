<script setup lang="ts">
import { truncate } from '@n8n/utils/string/truncate';
import { N8nHeading } from '@n8n/design-system';
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
			<N8nHeading tag="h2">{{ i18n.baseText('chatHub.chat.greeting') }}</N8nHeading>
			<ChatAgentAvatar :agent="selectedAgent" size="md" :class="$style.icon" />
			<N8nHeading bold>{{ truncate(selectedAgent.name, 40) }}</N8nHeading>
		</template>
		<template v-else>
			<N8nHeading tag="h2">{{ i18n.baseText('chatHub.chat.greeting.fallback') }}</N8nHeading>
		</template>
	</div>
</template>

<style lang="scss" module>
.greetings {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	align-self: center;
}

.icon {
	flex-shrink: 0;
	margin-block: -4px;
}
</style>
