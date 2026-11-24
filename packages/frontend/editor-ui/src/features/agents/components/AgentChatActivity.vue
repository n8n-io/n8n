<script setup lang="ts">
/**
 * Agents-only UI around the shared activity trace.
 *
 * The shared `AiActivityTrace` renders all rows, bodies, grouping and the
 * thinking label, the same as in Instance AI. The mapping from tool calls to
 * rows lives in `useAgentActivityItems`. This component adds only the UI
 * that Agents has and Instance AI does not:
 *
 * - Host events: cards from the chat host, before the thinking text and before
 *   the row of their tool call.
 * - Policy refusals: the callout of a call that a type-availability policy
 *   blocked, with a way to contact an admin.
 * - Output files: attachments that a tool call returned, under its row.
 * - Fix with assistant: one callout that sends the failed calls of the run to
 *   the assistant.
 */
import { N8nButton, N8nCallout, N8nIcon } from '@n8n/design-system';
import { N8N_CHAT_ACTION_TOOL_NAME } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import type { AgentsChatHostEventItem } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { AiActivityTrace } from '@/features/ai/shared/components/AiActivityTrace';
import type { AgentFixWithAssistantFailure } from '../types';
import {
	toolStepRefusal,
	useAgentActivityItems,
	type AgentActivityThinking,
} from '../composables/useAgentActivityItems';
import AgentChatToolPolicyRefusal from './AgentChatToolPolicyRefusal.vue';
import AgentChatHostEvents from './AgentChatHostEvents.vue';
import AgentChatMessageAttachments from './AgentChatMessageAttachments.vue';
import { getToolOutputAttachments } from '../utils/tool-output-files';

const props = defineProps<{
	toolCalls: ToolCall[];
	thinking?: AgentActivityThinking & {
		/** Host events that show inside the thinking step. */
		hostEvents?: AgentsChatHostEventItem[];
	};
	projectId?: string;
	agentId?: string;
	canFixWithAssistant?: boolean;
	dismissedToolCallIds?: string[];
	executionId?: string;
	/** Host events that show right before the step of their call, by call. */
	hostEvents?: ReadonlyMap<string, AgentsChatHostEventItem[]>;
}>();

const emit = defineEmits<{
	fixWithAssistant: [failures: AgentFixWithAssistantFailure[]];
}>();

const i18n = useI18n();

const { activityItems, fixableFailures, toolStepLabel } = useAgentActivityItems({
	projectId: () => props.projectId,
	toolCalls: () => props.toolCalls,
});

const showFix = computed(() => Boolean(props.canFixWithAssistant && props.executionId));

const items = computed(() =>
	activityItems({ toolCalls: props.toolCalls, thinking: props.thinking, showFix: showFix.value }),
);

const failures = computed(() =>
	showFix.value ? fixableFailures(props.toolCalls, new Set(props.dismissedToolCallIds ?? [])) : [],
);

const fixableErrorTexts = computed(() => [...new Set(failures.value.map(({ error }) => error))]);

const outputFilesByToolCallId = computed(
	() =>
		new Map(
			props.toolCalls.map((tc) => [
				tc.toolCallId,
				/** The reply files of n8n Chat show on the message, not under the step. */
				tc.tool === N8N_CHAT_ACTION_TOOL_NAME ? [] : getToolOutputAttachments(tc.output),
			]),
		),
);

function outputFiles(tc: ToolCall) {
	return outputFilesByToolCallId.value.get(tc.toolCallId) ?? [];
}

function hostEventsFor(tc: ToolCall): AgentsChatHostEventItem[] {
	return props.hostEvents?.get(tc.toolCallId) ?? [];
}

function emitFixWithAssistant() {
	if (failures.value.length === 0) return;
	emit('fixWithAssistant', failures.value);
}
</script>

<template>
	<div :class="$style.activity" data-test-id="agent-chat-activity">
		<AiActivityTrace :items="items">
			<template v-if="props.thinking?.hostEvents?.length" #thinking-prepend>
				<AgentChatHostEvents :items="props.thinking.hostEvents" />
			</template>
			<template #before-tool="{ item }">
				<AgentChatHostEvents :items="hostEventsFor(item.payload)" />
			</template>
			<template #tool-error-callout="{ item }">
				<AgentChatToolPolicyRefusal
					:refusal="toolStepRefusal(item.payload)!"
					:fallback-name="toolStepLabel(item.payload)"
				/>
			</template>
			<template #after-tool="{ item }">
				<AgentChatMessageAttachments
					v-if="outputFiles(item.payload).length && projectId && agentId"
					:class="$style.outputFiles"
					:attachments="outputFiles(item.payload)"
					:project-id="projectId"
					:agent-id="agentId"
				/>
			</template>
		</AiActivityTrace>

		<Transition name="fix-callout">
			<N8nCallout
				v-if="fixableErrorTexts.length > 0"
				theme="danger"
				:class="$style.fixCallout"
				data-test-id="agent-chat-tool-fix-with-assistant-callout"
			>
				<template v-if="fixableErrorTexts.length === 1">
					{{ fixableErrorTexts[0] }}
				</template>
				<ul v-else :class="$style.errorList">
					<li v-for="error in fixableErrorTexts" :key="error">{{ error }}</li>
				</ul>
				<template #trailingContent>
					<N8nButton
						size="small"
						variant="outline"
						:class="$style.fixCalloutButton"
						data-test-id="agent-chat-tool-fix-with-assistant"
						@click="emitFixWithAssistant"
					>
						<template #icon><N8nIcon icon="sparkles" size="small" /></template>
						{{ i18n.baseText('agents.builder.preview.fixWithAssistant') }}
					</N8nButton>
				</template>
			</N8nCallout>
		</Transition>
	</div>
</template>

<style module>
.fixCallout {
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.fixCallout > :first-child {
	flex: 1 1 auto;
	min-width: 0;
}

.fixCallout :global(.n8n-text) {
	min-width: 0;
	overflow-wrap: anywhere;
}

.fixCalloutButton {
	flex-shrink: 0;
	margin-left: auto;
}

.errorList {
	margin: 0;
	padding-left: var(--spacing--sm);
}

.errorList li + li {
	margin-top: var(--spacing--4xs);
}

.outputFiles {
	margin: var(--spacing--4xs) 0 var(--spacing--2xs);
}
</style>

<style lang="scss">
.fix-callout-leave-active {
	transition: opacity var(--duration--snappy) var(--easing--ease-in);
}

.fix-callout-leave-to {
	opacity: 0;
}
</style>
