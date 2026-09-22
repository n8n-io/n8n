<script lang="ts" setup>
/**
 * Welcome state for the agent builder's embedded assistant panel: says what
 * the assistant does (builds and configures the agent, rather than only
 * chatting about it) and offers one-click starter templates. The host owns
 * the apply; this component only emits the chosen template.
 */
import { N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { AGENT_TEMPLATES, type AgentTemplate } from '../agentTemplates';

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
			<button
				v-for="template in AGENT_TEMPLATES"
				:key="template.id"
				type="button"
				:class="$style.example"
				:data-test-id="`agent-template-${template.id}`"
				@click="emit('select', template)"
			>
				<span :class="$style.exampleIcon" :data-test-id="`agent-template-icon-${template.id}`">
					<N8nIcon :icon="template.icon" size="small" />
				</span>
				<span :class="$style.exampleText">
					<N8nText size="small" :class="$style.exampleLabel">
						{{ i18n.baseText(template.labelKey) }}
					</N8nText>
					<N8nText size="xsmall" :class="$style.exampleDescription">
						{{ i18n.baseText(template.descriptionKey) }}
					</N8nText>
				</span>
				<span :class="$style.exampleArrow" aria-hidden="true">
					<N8nIcon icon="arrow-up" size="xsmall" />
				</span>
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.subtitle {
	color: var(--color--text--tint-1);
}

.examples {
	display: flex;
	flex-direction: column;
	margin-top: var(--spacing--xs);
}

.example {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) 0;
	border: 0;
	border-bottom: var(--border-width) dashed var(--border-color);
	background: transparent;
	color: var(--color--text);
	text-align: left;
	cursor: pointer;

	&:last-child {
		border-bottom: 0;
	}

	&:hover,
	&:focus-visible {
		.exampleArrow {
			border-color: var(--color--primary);
			color: var(--color--primary);
		}
	}
}

.exampleIcon {
	flex: 0 0 auto;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	border-radius: 50%;
	background: var(--color--primary--tint-3);
	color: var(--color--primary);
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

.exampleArrow {
	flex: 0 0 auto;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--md);
	height: var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: 50%;
	color: var(--color--text--tint-1);
	transition:
		border-color 0.12s ease,
		color 0.12s ease;
}
</style>
