<script setup lang="ts">
import { truncate } from '@n8n/utils/string/truncate';
import { N8nHeading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { type ChatModelDto } from '@n8n/api-types';
import { computed } from 'vue';
import { isLlmProviderModel } from '../chat.utils';
import ChatAgentAvatar from './ChatAgentAvatar.vue';
import ChatSuggestedPrompts from './ChatSuggestedPrompts.vue';

const props = defineProps<{
	selectedAgent: ChatModelDto | null;
}>();

const emit = defineEmits<{
	'select-prompt': [prompt: string];
}>();

const i18n = useI18n();

const isAgentModel = computed(
	() => props.selectedAgent && !isLlmProviderModel(props.selectedAgent.model),
);
</script>

<template>
	<div key="greetings" :class="$style.greetings">
		<template v-if="isAgentModel && selectedAgent">
			<div :class="$style.agentCard">
				<ChatAgentAvatar :agent="selectedAgent" size="lg" :class="$style.agentIcon" />
				<N8nHeading tag="h2" size="xlarge" :class="$style.agentName">
					{{ truncate(selectedAgent.name, 40) }}
				</N8nHeading>
				<p v-if="selectedAgent.description" :class="$style.agentDescription">
					{{ selectedAgent.description }}
				</p>
				<ChatSuggestedPrompts
					v-if="selectedAgent.suggestedPrompts?.length"
					:class="$style.suggestions"
					:prompts="selectedAgent.suggestedPrompts"
					@select="emit('select-prompt', $event)"
				/>
			</div>
		</template>
		<template v-else>
			<div :class="$style.header">
				<template v-if="selectedAgent">
					<N8nHeading tag="h2">{{ i18n.baseText('chatHub.chat.greeting') }}</N8nHeading>
					<ChatAgentAvatar :agent="selectedAgent" size="md" :class="$style.inlineIcon" />
					<N8nHeading bold>{{ truncate(selectedAgent.name, 40) }}</N8nHeading>
				</template>
				<template v-else>
					<N8nHeading tag="h2">{{ i18n.baseText('chatHub.chat.greeting.fallback') }}</N8nHeading>
				</template>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.greetings {
	display: flex;
	flex-direction: column;
	align-items: center;
	align-self: center;
}

.agentCard {
	display: flex;
	flex-direction: column;
	align-items: center;
	max-width: 640px;
	text-align: center;
}

.agentIcon {
	font-size: 40px;

	/* Override avatar sizes for the large greeting display */
	span {
		width: 40px;
		height: 40px;
		font-size: 40px;
	}
}

.agentName {
	margin-top: var(--spacing--2xs);
	color: var(--color--neutral-900);
	font-size: 24px;
	font-weight: 600;
	line-height: 32px;
}

.agentDescription {
	display: -webkit-box;
	line-clamp: 9;
	-webkit-line-clamp: 8;
	-webkit-box-orient: vertical;
	overflow: hidden;
	color: var(--color--neutral-700);
	font-size: var(--font-size--sm);
}

.suggestions {
	margin-top: var(--spacing--md);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.inlineIcon {
	flex-shrink: 0;
	margin-block: -4px;
}
</style>
