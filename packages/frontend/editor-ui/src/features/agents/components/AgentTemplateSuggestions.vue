<script lang="ts" setup>
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { AGENT_TEMPLATES, type AgentTemplate } from '../agentTemplates';

const emit = defineEmits<{
	select: [template: AgentTemplate];
}>();

const i18n = useI18n();

function onSelect(template: AgentTemplate) {
	emit('select', template);
}
</script>

<template>
	<div :class="$style.container" data-testid="agent-template-suggestions">
		<div :class="$style.heading">
			<div :class="$style.title">
				{{ i18n.baseText('agents.builder.templates.heading') }}
			</div>
			<div :class="$style.subtitle">
				{{ i18n.baseText('agents.builder.templates.subtitle') }}
			</div>
		</div>
		<div :class="$style.buttonRow">
			<button
				v-for="(template, index) in AGENT_TEMPLATES"
				:key="template.id"
				type="button"
				:class="$style.templateButton"
				:style="{ animationDelay: `${index * 50}ms` }"
				:data-test-id="`agent-template-${template.id}`"
				@click="onSelect(template)"
			>
				<N8nIcon :icon="template.icon" :size="12" :class="$style.templateIcon" />
				<span>{{ i18n.baseText(template.labelKey) }}</span>
			</button>
		</div>
	</div>
</template>

<style module lang="scss">
@use '../../ai/shared/styles/prompt-suggestion-buttons' as promptSuggestions;

.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--sm) var(--spacing--md);
}

.heading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	text-align: center;
}

.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--text-color);
	padding: 5px 0;
}

.subtitle {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}

.buttonRow {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.templateButton {
	@include promptSuggestions.prompt-suggestion-button;
}

.templateIcon {
	@include promptSuggestions.prompt-suggestion-icon;

	.templateButton:hover &,
	.templateButton:focus-visible & {
		opacity: 1;
	}
}
</style>
