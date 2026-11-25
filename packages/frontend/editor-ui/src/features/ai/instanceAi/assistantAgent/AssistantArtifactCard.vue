<script setup lang="ts">
import { computed, inject } from 'vue';

import { formatArtifactMetadata } from '@/features/ai/instanceAi/artifactCardMetadata';
import { useArtifactThread } from '@/features/ai/instanceAi/artifactThread';
import ArtifactCard from '@/features/ai/instanceAi/components/ArtifactCard.vue';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import { ASSISTANT_ARTIFACT_CARDS } from './assistantArtifactCards';

const props = defineProps<{ toolCall: ToolCall }>();

const thread = useArtifactThread();
const cards = inject(ASSISTANT_ARTIFACT_CARDS, undefined);

const artifact = computed(() => cards?.value.get(props.toolCall.toolCallId));
// The registry has the latest name and the archived state.
const entry = computed(() =>
	artifact.value ? thread.producedArtifacts.get(artifact.value.resourceId) : undefined,
);
const metadata = computed(() =>
	formatArtifactMetadata(
		props.toolCall.endTime === undefined
			? undefined
			: new Date(props.toolCall.endTime).toISOString(),
	),
);
</script>

<template>
	<ArtifactCard
		v-if="artifact"
		:type="artifact.type"
		:name="entry?.name ?? artifact.name"
		:resource-id="artifact.resourceId"
		:project-id="artifact.projectId"
		:archived="entry?.archived"
		:metadata="metadata"
	/>
</template>
