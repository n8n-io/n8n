<script lang="ts" setup>
import type { InstanceAiRunDebugWorkflowCodeSnapshot, ReadableSegment } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { getToolCallIdFromMetadata, isWorkflowCodeToolName } from '../utils/workflow-code-match';
import InstanceAiDebugJsonPanel from './InstanceAiDebugJsonPanel.vue';
import InstanceAiDebugWorkflowCodeSnapshot from './InstanceAiDebugWorkflowCodeSnapshot.vue';

const props = defineProps<{
	segments: ReadableSegment[];
	workflowSnapshotsByToolCallId?: ReadonlyMap<string, InstanceAiRunDebugWorkflowCodeSnapshot>;
}>();

const i18n = useI18n();

function getWorkflowSnapshot(
	segment: Extract<ReadableSegment, { type: 'tool-call' | 'tool-result' }>,
): InstanceAiRunDebugWorkflowCodeSnapshot | undefined {
	if (!isWorkflowCodeToolName(segment.name) || !props.workflowSnapshotsByToolCallId) {
		return undefined;
	}

	const toolCallId = getToolCallIdFromMetadata(segment.metadata);
	if (!toolCallId) {
		return undefined;
	}

	return props.workflowSnapshotsByToolCallId.get(toolCallId);
}
</script>

<template>
	<div :class="$style.root">
		<template v-for="(segment, index) in segments" :key="`${segment.type}-${index}`">
			<p v-if="segment.type === 'text'" :class="$style.text">{{ segment.text }}</p>

			<div v-else-if="segment.type === 'reasoning'" :class="$style.inlineBlock">
				<div :class="$style.inlineHeader">
					<span :class="$style.kindLabel">
						{{ i18n.baseText('instanceAi.debug.runDebug.reasoning') }}
					</span>
				</div>
				<p :class="$style.text">{{ segment.text }}</p>
			</div>

			<div v-else-if="segment.type === 'tool-call'" :class="$style.inlineBlock">
				<div :class="$style.inlineHeader">
					<span :class="$style.kindLabel">
						{{ i18n.baseText('instanceAi.debug.runDebug.toolCall') }}
					</span>
					<span :class="$style.nameLabel">{{ segment.name }}</span>
				</div>
				<InstanceAiDebugJsonPanel
					v-if="segment.payload !== undefined"
					:value="segment.payload"
					:label="i18n.baseText('instanceAi.debug.runDebug.toolInput')"
				/>
				<InstanceAiDebugJsonPanel
					v-if="segment.metadata"
					:value="segment.metadata"
					:label="i18n.baseText('instanceAi.debug.runDebug.metadata')"
				/>
			</div>

			<div v-else-if="segment.type === 'tool-result'" :class="$style.inlineBlock">
				<div :class="$style.inlineHeader">
					<span :class="$style.kindLabel">
						{{ i18n.baseText('instanceAi.debug.runDebug.toolResult') }}
					</span>
					<span v-if="segment.name" :class="$style.nameLabel">{{ segment.name }}</span>
				</div>
				<InstanceAiDebugJsonPanel
					v-if="segment.payload !== undefined"
					:value="segment.payload"
					:label="i18n.baseText('instanceAi.debug.runDebug.toolOutput')"
				/>
				<InstanceAiDebugWorkflowCodeSnapshot
					v-if="getWorkflowSnapshot(segment)"
					variant="inline"
					:snapshot="getWorkflowSnapshot(segment)!"
				/>
				<InstanceAiDebugJsonPanel
					v-if="segment.metadata"
					:value="segment.metadata"
					:label="i18n.baseText('instanceAi.debug.runDebug.metadata')"
				/>
			</div>

			<InstanceAiDebugJsonPanel
				v-else
				:value="segment.payload"
				:label="segment.label ?? i18n.baseText('instanceAi.debug.runDebug.json')"
			/>
		</template>
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.text {
	margin: 0;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	color: var(--color--text);
}

.inlineBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.inlineHeader {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
}

.kindLabel {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.nameLabel {
	font-size: var(--font-size--3xs);
	font-family: monospace;
	color: var(--color--text);
}
</style>
