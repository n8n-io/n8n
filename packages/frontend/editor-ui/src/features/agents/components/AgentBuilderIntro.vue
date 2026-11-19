<script lang="ts" setup>
/**
 * Welcome state for the agent builder's embedded assistant panel: says what
 * the assistant does (builds and configures the agent, rather than only
 * chatting about it) and offers one-click starter templates. The host owns
 * the apply; this component only emits the chosen template.
 */
import { N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentTemplate } from '../agentTemplates';
import AgentTemplateList from './AgentTemplateList.vue';

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
		<AgentTemplateList @select="emit('select', $event)" />
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.introHeader {
	@include motion.fade-in-up;
	animation-delay: calc(var(--intro-index, 0) * var(--duration--snappy) / 4);
	animation-fill-mode: backwards;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
