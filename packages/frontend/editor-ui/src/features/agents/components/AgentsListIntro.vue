<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue';
import { N8nButton, N8nChatInput, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentTemplate } from '../agentTemplates';
import AgentTemplateList from './AgentTemplateList.vue';

const props = defineProps<{ disabled?: boolean }>();

const emit = defineEmits<{
	'create-blank': [];
	submit: [text: string];
	select: [template: AgentTemplate];
}>();

const i18n = useI18n();
const draft = ref('');
const chatInputRef = ref<{ focusInput: () => void } | null>(null);

onMounted(() => {
	// The chat input replaces its textarea once after mount, so a sync focus does not stick.
	void nextTick(() => {
		chatInputRef.value?.focusInput();
	});
});

function onSubmit() {
	const text = draft.value.trim();
	if (!text || props.disabled) return;
	emit('submit', text);
}

function onSelectTemplate(template: AgentTemplate) {
	if (props.disabled) return;
	emit('select', template);
}
</script>

<template>
	<div :class="$style.intro" data-test-id="agents-list-intro">
		<div :class="$style.header">
			<N8nIcon icon="bot" size="xxlarge" color="text-light" />
			<N8nHeading tag="h2" bold>
				{{ i18n.baseText('agents.builder.templates.title') }}
			</N8nHeading>
			<N8nText color="text-light">
				{{ i18n.baseText('agents.builder.templates.subtitle') }}
			</N8nText>
		</div>
		<div>
			<div :class="$style.createBlank">
				<N8nButton
					variant="ghost"
					size="small"
					:disabled="disabled"
					data-test-id="agents-list-intro-create-blank"
					@click="emit('create-blank')"
				>
					<N8nIcon icon="pencil" />
					{{ i18n.baseText('agents.list.intro.createBlank') }}
				</N8nButton>
			</div>
			<N8nChatInput
				ref="chatInputRef"
				v-model="draft"
				layout="multiline"
				:autofocus="true"
				:disabled="disabled"
				:placeholder="i18n.baseText('agents.list.intro.placeholder')"
				data-test-id="agents-list-intro-input"
				@submit="onSubmit"
			/>
		</div>
		<N8nText size="small" color="text-light" :class="$style.templatesLabel">
			{{ i18n.baseText('agents.list.intro.templatesLabel') }}
		</N8nText>
		<AgentTemplateList @select="onSelectTemplate" />
	</div>
</template>

<style lang="scss" module>
.intro {
	/* No token for this content column. 30rem is the wireframe width. */
	max-width: 30rem;
	margin-inline: auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-block: var(--spacing--xl);
}

.header {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	text-align: center;
}

.createBlank {
	display: flex;
	justify-content: flex-end;
	color: var(--color-text-subtle);
}

.templatesLabel {
	text-transform: uppercase;
}
</style>
