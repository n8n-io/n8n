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
import AgentPersonalisationIcon from './AgentPersonalisationIcon.vue';

const emit = defineEmits<{ select: [template: AgentTemplate] }>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.intro" data-test-id="instance-ai-agent-intro">
		<div :class="$style.introHeader">
			<N8nHeading tag="h2" bold>
				{{ i18n.baseText('agents.builder.templates.title') }}
			</N8nHeading>
			<N8nText color="text-light">
				{{ i18n.baseText('agents.builder.templates.subtitle') }}
			</N8nText>
		</div>
		<ul :class="$style.examples">
			<li
				v-for="(template, index) in AGENT_TEMPLATES"
				:key="template.id"
				:class="$style.example"
				:style="{ '--intro-index': index + 1 }"
				:data-test-id="`agent-template-${template.id}`"
				role="button"
				tabindex="0"
				@click="emit('select', template)"
				@keydown.enter.prevent="emit('select', template)"
				@keydown.space.prevent
				@keyup.space.prevent="emit('select', template)"
			>
				<span :class="$style.exampleIcon" :data-test-id="`agent-template-icon-${template.id}`">
					<AgentPersonalisationIcon
						:personalisation="{ icon: template.icon, gradient: template.gradient }"
						:size="40"
					/>
				</span>
				<span :class="$style.exampleText">
					<N8nText :class="$style.exampleLabel">
						{{ i18n.baseText(template.labelKey) }}
					</N8nText>
					<N8nText
						color="text-light"
						:class="$style.exampleDescription"
						:title="i18n.baseText(template.descriptionKey)"
					>
						{{ i18n.baseText(template.descriptionKey) }}
					</N8nText>
				</span>
				<N8nIcon icon="arrow-right" color="text-light" size="medium" :class="$style.exampleArrow" />
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;
@use '@n8n/design-system/css/mixins/motion';

.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.introHeader,
.example {
	@include motion.fade-in-up;
	animation-delay: calc(var(--intro-index, 0) * var(--duration--snappy) / 4);
	animation-fill-mode: backwards;
}

.introHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.examples {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.example {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	color: var(--color--text);
	text-align: left;
	cursor: pointer;
	padding: var(--spacing--2xs);
	height: var(--height--3xl);
	margin-inline: calc(var(--spacing--xs) * -1);
	border-radius: var(--radius--md);
	border: 1px solid transparent;

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		@include focus.focus-ring-with-border;
		background-color: var(--background--hover);
	}
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
}

.exampleLabel {
	font-weight: var(--font-weight--medium);
}

.exampleDescription {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.exampleArrow {
	flex-shrink: 0;
	margin-inline-end: var(--spacing--4xs);
	opacity: 0;
}
.example:hover .exampleArrow {
	opacity: 1;
}
</style>
