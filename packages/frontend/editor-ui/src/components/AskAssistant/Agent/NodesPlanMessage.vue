<!-- eslint-disable import-x/extensions -->
<script setup lang="ts">
import NodeIcon from '@/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { ChatUI, RatingFeedback } from '@n8n/design-system';
import BaseMessage from '@n8n/design-system/components/AskAssistantChat/messages/BaseMessage.vue';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';

interface NodesPlan {
	nodeType: string;
	nodeName: string;
	reasoning: string;
}

export type NodesPlanMessageType = ChatUI.CustomMessage & {
	data: NodesPlan[];
};

interface Props {
	message: NodesPlanMessageType;
	showControls?: boolean;
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
	streaming?: boolean;
	isLastMessage?: boolean;
}

const props = defineProps<Props>();

const nodeTypesStore = useNodeTypesStore();
const i18n = useI18n();
const showControlsLocal = ref(props.showControls ?? true);
const changesRequested = ref(false);

const emit = defineEmits<{
	approvePlan: [];
	requestChanges: [];
	feedback: [RatingFeedback];
}>();

function onApprovePlan() {
	showControlsLocal.value = false;
	emit('approvePlan');
}

function onRequestChanges() {
	showControlsLocal.value = false;
	changesRequested.value = true;
	emit('requestChanges');
}
</script>

<template>
	<BaseMessage
		:class="$style.message"
		:message="message"
		:is-first-of-role="true"
		:user="user"
		@feedback="(feedback) => emit('feedback', feedback)"
	>
		{{ message.message }}
		<ol :class="$style.nodes">
			<li v-for="(node, index) in message.data" :key="index" :class="$style.node">
				<n8n-tooltip placement="left" :show-after="300">
					<template #content>
						{{ node.reasoning }}
					</template>
					<div :class="$style.node">
						<NodeIcon
							:class="$style.nodeIcon"
							:node-type="nodeTypesStore.getNodeType(node.nodeType)"
							:node-name="node.nodeName"
							:show-tooltip="false"
							:size="12"
						/>
						<span>{{ node.nodeName }}</span>
					</div>
				</n8n-tooltip>
			</li>
		</ol>
		<template v-if="showControls && showControlsLocal && !streaming">
			{{ i18n.baseText('aiAssistant.builder.plan.intro') }}
			<div :class="$style.controls">
				<n8n-button type="primary" @click="onApprovePlan">{{
					i18n.baseText('aiAssistant.builder.plan.approve')
				}}</n8n-button>
				<n8n-button type="secondary" @click="onRequestChanges">{{
					i18n.baseText('aiAssistant.builder.plan.reject')
				}}</n8n-button>
			</div>
		</template>
		<template v-if="changesRequested">
			<span class="mb-m">{{ i18n.baseText('aiAssistant.builder.plan.whatToChange') }}</span>
		</template>
	</BaseMessage>
</template>

<style lang="scss" module>
.message {
	display: flex;
	flex-direction: column;
}
.nodes {
	list-style: none;
	padding: var(--spacing-2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}
.nodeIcon {
	padding: var(--spacing-3xs);
	border-radius: var(--border-radius-base);
	border: 1px solid var(--color-foreground-base);
	display: inline-flex;
}
.node {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
	font-size: var(--font-size-2xs);
}
.controls {
	display: flex;
	gap: var(--spacing-2xs);
	margin-top: var(--spacing-xs);
}
.followUpMessage {
	margin-top: var(--spacing-m);
}
</style>
