<script lang="ts" setup>
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import AnimatedCollapsibleContent from './AnimatedCollapsibleContent.vue';
import { computed, toRef } from 'vue';
import type { ArtifactInfo } from '../agentTimeline.utils';
import { useThread } from '../instanceAi.store';
import { useTimelineGrouping } from '../useTimelineGrouping';
import AgentTimeline from './AgentTimeline.vue';
import ArtifactCard from './ArtifactCard.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import ResponseGroup from './ResponseGroup.vue';
import TimelineStepButton from './TimelineStepButton.vue';
import TimelineStepChevron from './TimelineStepChevron.vue';

const props = withDefaults(
	defineProps<{
		agentNode: InstanceAiAgentNode;
		isRoot?: boolean;
	}>(),
	{
		isRoot: false,
	},
);

const i18n = useI18n();
const thread = useThread();

const hasReasoning = computed(() => props.agentNode.reasoning.length > 0);

const segments = useTimelineGrouping(toRef(props, 'agentNode'));

/** Whether to show grouped/collapsed view (root + grouping available). */
const showGrouped = computed(() => props.isRoot && segments.value !== null);

/** Index of the last response-group segment (for isLast prop). */
const lastGroupIdx = computed(() => {
	if (!segments.value) return -1;
	for (let i = segments.value.length - 1; i >= 0; i--) {
		if (segments.value[i].kind === 'response-group') return i;
	}
	return -1;
});

function resolveArtifactName(artifact: ArtifactInfo): string {
	const entry = thread.producedArtifacts.get(artifact.resourceId);
	return entry?.name ?? artifact.name;
}
</script>

<template>
	<!-- eslint-disable vue/no-multiple-template-root -->

	<!-- Reasoning (collapsible, root agent only) -->
	<CollapsibleRoot v-if="isRoot && hasReasoning" v-slot="{ open: isOpen }">
		<CollapsibleTrigger as-child>
			<TimelineStepButton>
				<template #icon>
					<TimelineStepChevron :open="isOpen" />
				</template>
				{{ i18n.baseText('instanceAi.message.reasoning') }}
			</TimelineStepButton>
		</CollapsibleTrigger>
		<AnimatedCollapsibleContent :class="$style.reasoningPanel">
			<div :class="$style.reasoningScroll">
				<span :class="$style.reasoningContent">{{ props.agentNode.reasoning }}</span>
			</div>
		</AnimatedCollapsibleContent>
	</CollapsibleRoot>

	<!-- Completed with responseId grouping: collapsed response groups + artifacts + trailing text -->
	<template v-if="showGrouped">
		<template v-for="(segment, idx) in segments" :key="idx">
			<ResponseGroup
				v-if="segment.kind === 'response-group'"
				:group="segment"
				:agent-node="props.agentNode"
				:is-last="idx === lastGroupIdx"
			/>

			<!-- Artifacts from child agents in this group, rendered in-place after the group -->
			<template v-if="segment.kind === 'response-group' && segment.artifacts.length > 0">
				<ArtifactCard
					v-for="artifact in segment.artifacts"
					:key="artifact.resourceId"
					:type="artifact.type"
					:name="resolveArtifactName(artifact)"
					:resource-id="artifact.resourceId"
					:project-id="artifact.projectId"
					:archived="thread.producedArtifacts.get(artifact.resourceId)?.archived"
					:class="$style.artifactCard"
				/>
			</template>

			<!-- Trailing text (the actual answer) — always visible -->
			<N8nText v-if="segment.kind === 'trailing-text'" size="large">
				<InstanceAiMarkdown :content="segment.content" />
			</N8nText>
		</template>
	</template>

	<!-- Active / no grouping available: show timeline directly -->
	<AgentTimeline v-else :agent-node="props.agentNode" />
</template>

<style lang="scss" module>
.artifactCard {
	max-width: 90%;
	margin: var(--spacing--sm) 0;

	+ .artifactCard {
		margin-top: 0;
	}
}

.reasoningPanel {
	padding-left: var(--spacing--2xs);
	border-left: var(--border);
	margin-left: var(--spacing--xs);
	max-width: 90%;
	min-width: 0;
	overflow-x: hidden;
}

.reasoningScroll {
	margin-top: var(--spacing--2xs);
	max-height: 200px;
	overflow-x: hidden;
	overflow-y: auto;
	padding-bottom: var(--spacing--2xs);
	scrollbar-width: thin;
	scrollbar-color: light-dark(var(--color--neutral-300), var(--color--neutral-700)) transparent;
}

.reasoningContent {
	display: block;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text--tint-1);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	word-break: break-word;
}
</style>
