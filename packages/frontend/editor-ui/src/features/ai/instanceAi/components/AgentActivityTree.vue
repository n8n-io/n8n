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

const segments = useTimelineGrouping(toRef(props, 'agentNode'));

/** Whether to show grouped view (root + grouping available). */
const showGrouped = computed(() => props.isRoot && segments.value !== null);

function resolveArtifactName(artifact: ArtifactInfo): string {
	const entry = thread.producedArtifacts.get(artifact.resourceId);
	return entry?.name ?? artifact.name;
}
</script>

<template>
	<!-- eslint-disable vue/no-multiple-template-root -->

	<!-- Completed with responseId grouping: flat trace strips + artifacts + trailing text -->
	<template v-if="showGrouped">
		<template v-for="(segment, idx) in segments" :key="idx">
			<AgentTimeline
				v-if="segment.kind === 'response-group'"
				:agent-node="props.agentNode"
				:visible-entries="segment.entries"
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
