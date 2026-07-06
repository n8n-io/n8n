<script lang="ts" setup>
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { computed, toRef } from 'vue';
import type { ArtifactInfo } from '../agentTimeline.utils';
import { useThread } from '../instanceAi.store';
import { useTimelineGrouping } from '../useTimelineGrouping';
import AgentTimeline from './AgentTimeline.vue';
import ArtifactCard from './ArtifactCard.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import ReasoningBlock from './ReasoningBlock.vue';
import ResponseGroup from './ResponseGroup.vue';

const props = withDefaults(
	defineProps<{
		agentNode: InstanceAiAgentNode;
		isRoot?: boolean;
	}>(),
	{
		isRoot: false,
	},
);

const thread = useThread();

/**
 * Legacy fallback: trees persisted before reasoning became a timeline entry
 * carry only the aggregated `reasoning` string. Render it as a single block
 * at the top; newer trees interleave reasoning blocks in the timeline.
 */
const legacyReasoningEntry = computed(() => {
	if (props.agentNode.reasoning.length === 0) return null;
	if (props.agentNode.timeline.some((entry) => entry.type === 'reasoning')) return null;
	return { content: props.agentNode.reasoning };
});

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

	<!-- Reasoning fallback for pre-timeline data (collapsible, root agent only) -->
	<ReasoningBlock v-if="isRoot && legacyReasoningEntry" :entry="legacyReasoningEntry" />

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
</style>
