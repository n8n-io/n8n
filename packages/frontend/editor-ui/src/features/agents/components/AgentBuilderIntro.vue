<script lang="ts" setup>
/**
 * Welcome state for the agent builder's embedded assistant panel: says what
 * the assistant does (builds and configures the agent, rather than only
 * chatting about it) and offers one-click starter templates. The host owns
 * the apply; this component only emits the chosen template.
 */
import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { AGENT_TEMPLATES, type AgentTemplate } from '../agentTemplates';
import AgentPersonalisationIcon from './AgentPersonalisationIcon.vue';

const emit = defineEmits<{ select: [template: AgentTemplate] }>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.intro" data-test-id="instance-ai-agent-intro">
		<N8nHeading tag="h2" size="large" bold>
			{{ i18n.baseText('agents.builder.templates.title') }}
		</N8nHeading>
		<N8nText size="small" :class="$style.subtitle">
			{{ i18n.baseText('agents.builder.templates.subtitle') }}
		</N8nText>
		<div :class="$style.examples">
			<div
				v-for="template in AGENT_TEMPLATES"
				:key="template.id"
				:class="$style.example"
				:data-test-id="`agent-template-${template.id}`"
				@click="emit('select', template)"
			>
				<span :class="$style.exampleIcon" :data-test-id="`agent-template-icon-${template.id}`">
					<AgentPersonalisationIcon
						:personalisation="{ icon: template.icon, gradient: template.gradient }"
						:size="32"
					/>
				</span>
				<span :class="$style.exampleText">
					<N8nText size="small" :class="$style.exampleLabel">
						{{ i18n.baseText(template.labelKey) }}
					</N8nText>
					<N8nText size="xsmall" :class="$style.exampleDescription">
						{{ i18n.baseText(template.descriptionKey) }}
					</N8nText>
				</span>
				<N8nButton
					variant="ghost"
					size="medium"
					icon="arrow-right"
					icon-only
					:aria-label="i18n.baseText(template.labelKey)"
					@click.stop="emit('select', template)"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
}

.subtitle {
	color: var(--color--text--tint-1);
}

.examples {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
}

.example {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--text);
	text-align: left;
	cursor: pointer;
	padding: var(--spacing--2xs) 0;
}

.exampleIcon {
	flex: 0 0 auto;
	display: inline-flex;
}

.exampleText {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.exampleLabel {
	font-weight: var(--font-weight--medium);
}

.exampleDescription {
	color: var(--color--text--tint-1);
}
</style>
