<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useTemplateRef, watch } from 'vue';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type { AgentReviewQueue } from '../composables/useAgentReviewQueue';
import type { WireframeDestination } from '../composables/useWireframeDestination';
import type { useWireframeReviewers } from '../composables/useWireframeReviewers';
import type {
	AgentContinueLoadedEvent,
	AgentJsonConfig,
	AgentResource,
	AgentSendToAssistantEvent,
} from '../types';
import AgentChatPanel from './AgentChatPanel.vue';
import AgentPreviewReviewCard from './AgentPreviewReviewCard.vue';

const props = withDefaults(
	defineProps<{
		initialized: boolean;
		projectId: string;
		agentId: string;
		agent: AgentResource | null;
		localConfig: AgentJsonConfig | null;
		connectedTriggers: string[];
		effectiveSessionId?: string;
		initialPrompt?: string;
		canSendToAssistant?: boolean;
		beforeSend?: () => Promise<void> | void;
		layout?: 'page' | 'dock';
		/** Wireframe: focus mode + reviewers, owned by the dock. */
		review?: AgentReviewQueue;
		reviewers?: ReturnType<typeof useWireframeReviewers>;
		destination?: WireframeDestination;
	}>(),
	{ layout: 'page', destination: 'preview' },
);

const emit = defineEmits<{
	'continue-loaded': [event: AgentContinueLoadedEvent];
	'open-build': [];
	'send-to-assistant': [event?: AgentSendToAssistantEvent];
}>();

const i18n = useI18n();
const inputDraft = ref('');
const chatPanel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('chatPanel');

const reviewing = computed(() => props.review?.active.value === true);

// Wireframe stub: a "receipt" for the destination — shown once the agent has
// replied since the destination was chosen. Nothing is actually delivered.
const assistantCount = computed(
	() => chatPanel.value?.messages.filter((m) => m.role === 'assistant').length ?? 0,
);
const receiptBaseline = ref<number | null>(null);
watch(
	() => props.destination,
	(next) => {
		receiptBaseline.value = next === 'preview' ? null : assistantCount.value;
	},
	{ immediate: true },
);
const showReceipt = computed(
	() =>
		props.destination !== 'preview' &&
		receiptBaseline.value !== null &&
		assistantCount.value > receiptBaseline.value,
);

function focusInput(options?: FocusOptions) {
	chatPanel.value?.focusInput(options);
}

defineExpose({ focusInput });
</script>

<template>
	<component
		:is="layout === 'dock' ? 'div' : 'main'"
		:class="[$style.previewPage, { [$style.dockLayout]: layout === 'dock' }]"
		data-testid="agent-preview-chat-page"
	>
		<div :class="$style.chatFrame">
			<div :class="$style.chatBody">
				<AgentPreviewReviewCard
					v-if="reviewing && review && reviewers"
					:project-id="projectId"
					:agent-id="agentId"
					:agent-name="agent?.name"
					:review="review"
					:reviewers="reviewers"
					@fix-with-assistant="emit('send-to-assistant', { initialDraft: $event })"
				/>
				<!-- Kept mounted (v-show) so the live session survives a review pass. -->
				<AgentChatPanel
					v-if="initialized && effectiveSessionId"
					v-show="!reviewing"
					:key="`preview-${effectiveSessionId}`"
					ref="chatPanel"
					v-model:input-draft="inputDraft"
					:project-id="projectId"
					:agent-id="agentId"
					mode="inline"
					:continue-session-id="effectiveSessionId"
					:agent-config="localConfig"
					:agent-status="deriveAgentStatus(agent)"
					:connected-triggers="connectedTriggers"
					:can-send-to-assistant="canSendToAssistant"
					:before-send="beforeSend"
					@continue-loaded="emit('continue-loaded', $event)"
					@open-build="emit('open-build')"
					@send-to-assistant="emit('send-to-assistant', $event)"
				>
					<template #above-input>
						<div v-if="showReceipt" :class="$style.receipt" data-testid="agent-preview-receipt">
							<N8nIcon icon="check" :size="14" />
							<span>{{ i18n.baseText(`agents.builder.destination.receipt.${destination}`) }}</span>
							<span :class="$style.receiptMeta">{{
								i18n.baseText('agents.builder.review.sample')
							}}</span>
						</div>
					</template>
				</AgentChatPanel>
			</div>
		</div>
	</component>
</template>

<style lang="scss" module>
.previewPage {
	flex: 1;
	min-height: 0;
	display: flex;
	justify-content: center;
	// Wireframe: striped surface marks the pane as a preview, distinct from the builder.
	background-color: var(--wireframe--stripe-base);
	background-image: var(--wireframe--stripes);
	overflow: hidden;
}

.chatFrame {
	width: 100%;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.chatBody {
	flex: 1;
	min-height: 0;
	display: flex;
}

.receipt {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: var(--wireframe--border-width) dashed var(--color--success);
	border-radius: var(--wireframe--radius);
	color: var(--color--success);
	font-family: var(--wireframe--font-family);
	font-weight: var(--wireframe--font-weight);
	font-size: var(--font-size--2xs);
	letter-spacing: var(--wireframe--letter-spacing);
}

.receiptMeta {
	margin-left: auto;
	color: var(--text-color--subtler);
}
</style>
