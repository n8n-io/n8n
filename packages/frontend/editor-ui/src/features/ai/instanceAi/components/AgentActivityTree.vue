<script lang="ts" setup>
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useElementHover } from '@vueuse/core';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import AnimatedCollapsibleContent from './AnimatedCollapsibleContent.vue';
import { computed, toRef, useTemplateRef } from 'vue';
import type { ArtifactInfo } from '../agentTimeline.utils';
import { useInstanceAiStore } from '../instanceAi.store';
import { useTimelineGrouping } from '../useTimelineGrouping';
import AgentTimeline from './AgentTimeline.vue';
import ArtifactCard from './ArtifactCard.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
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

const i18n = useI18n();
const store = useInstanceAiStore();

const hasReasoning = computed(() => props.agentNode.reasoning.length > 0);
const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const isHovered = useElementHover(triggerRef);

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
	const entry = store.producedArtifacts.get(artifact.resourceId);
	return entry?.name ?? artifact.name;
}
</script>

<template>
	<!-- eslint-disable vue/no-multiple-template-root -->

	<!-- Reasoning (collapsible, root agent only) -->
	<CollapsibleRoot v-if="isRoot && hasReasoning" v-slot="{ open: isOpen }">
		<CollapsibleTrigger as-child>
			<N8nButton ref="triggerRef" variant="ghost" size="small" :class="$style.reasoningTrigger">
				<template #icon>
					<template v-if="isHovered">
						<N8nIcon :icon="isOpen ? 'minus' : 'plus'" size="small" />
					</template>
					<N8nIcon v-else icon="brain" size="small" />
				</template>
				{{ i18n.baseText('instanceAi.message.reasoning') }}
			</N8nButton>
		</CollapsibleTrigger>
		<AnimatedCollapsibleContent>
			<N8nText tag="div" :class="$style.reasoningContent">{{ props.agentNode.reasoning }}</N8nText>
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
.reasoningTrigger {
	/* stylelint-disable-next-line @n8n/css-var-naming -- design-system token */
	color: var(--text-color--subtler);
}

.artifactCard {
	max-width: 90%;
}

.reasoningContent {
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-left: 2px solid var(--color--foreground);
	margin-left: var(--spacing--4xs);
	color: var(--color--text--tint-2);
}
</style>
