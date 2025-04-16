<script lang="ts" setup>
import { useBuilderStore } from '@/stores/builder.store';
import { useDebounce } from '@/composables/useDebounce';
import { useUsersStore } from '@/stores/users.store';
import { computed, watch, ref, onBeforeUnmount } from 'vue';
import SlideTransition from '@/components/transitions/SlideTransition.vue';
import AskAssistantChat from '@n8n/design-system/components/AskAssistantChat/AskAssistantChat.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import type { IWorkflowDataUpdate } from '@/Interface';
import { nodeViewEventBus } from '@/event-bus';
import { v4 as uuid } from 'uuid';
import { useI18n } from '@/composables/useI18n';
import { STICKY_NODE_TYPE } from '@/constants';

const builderStore = useBuilderStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();
const i18n = useI18n();

const user = computed(() => ({
	firstName: usersStore.currentUser?.firstName ?? '',
	lastName: usersStore.currentUser?.lastName ?? '',
}));

const workflowGenerated = ref(false);
const loadingMessage = computed(() => builderStore.assistantThinkingMessage);

function onResize(data: { direction: string; x: number; width: number }) {
	builderStore.updateWindowWidth(data.width);
}

function onResizeDebounced(data: { direction: string; x: number; width: number }) {
	void useDebounce().callDebounced(onResize, { debounceTime: 10, trailing: true }, data);
}

async function onUserMessage(content: string, quickReplyType?: string, isFeedback = false) {
	// If there is no current session running, initialize the support chat session
	await builderStore.initSupportChat(content);
	if (isFeedback) {
		telemetry.track('User gave feedback', {
			chat_session_id: builderStore.currentSessionId,
			is_quick_reply: !!quickReplyType,
			is_positive: quickReplyType === 'all-good',
			response: content,
		});
	}
}

function onClose() {
	builderStore.closeChat();
	telemetry.track('User closed assistant', { source: 'top-toggle' });
}

function fixWorkflowStickiesPosition(workflowData: IWorkflowDataUpdate): IWorkflowDataUpdate {
	const STICKY_WIDTH = 480;
	const HEADERS_HEIGHT = 40;
	const NEW_LINE_HEIGHT = 20;
	const CHARACTER_WIDTH = 65;
	const NODE_WIDTH = 100;
	const stickyNodes = workflowData.nodes?.filter((node) => node.type === STICKY_NODE_TYPE);
	const nonStickyNodes = workflowData.nodes?.filter((node) => node.type !== STICKY_NODE_TYPE);

	const fixedStickies = stickyNodes?.map((node, index) => {
		const content = node.parameters.content?.toString() ?? '';
		const newLines = content.match(/\n/g) ?? [];
		// Match any markdown heading from # to ###### at the start of a line
		const headings = content.match(/^#{1,6} /gm) ?? [];
		const headingHeight = headings.length * HEADERS_HEIGHT;
		const newLinesHeight = newLines.length * NEW_LINE_HEIGHT;
		const contentHeight = (content.length / CHARACTER_WIDTH) * NEW_LINE_HEIGHT;
		const height = Math.ceil(headingHeight + newLinesHeight + contentHeight) + NEW_LINE_HEIGHT;

		const firstNode = nonStickyNodes?.[0];
		const xPos = (firstNode?.position[0] ?? 0) + index * (STICKY_WIDTH + NODE_WIDTH);
		return {
			...node,
			parameters: {
				...node.parameters,
				height,
				width: STICKY_WIDTH,
			},
			position: [xPos, -1 * (height + 50)] as [number, number],
		};
	});

	return {
		...workflowData,
		nodes: [...(nonStickyNodes ?? []), ...(fixedStickies ?? [])],
	};
}

function onInsertWorkflow(code: string) {
	// TODO: Tracking
	let workflowData: IWorkflowDataUpdate;
	try {
		workflowData = JSON.parse(code);
	} catch (error) {
		console.error('Error parsing workflow data', error);
		return;
	}
	nodeViewEventBus.emit('importWorkflowData', {
		data: fixWorkflowStickiesPosition(workflowData),
		tidyUp: true,
	});
	workflowGenerated.value = true;
	builderStore.addAssistantMessages(
		[
			{
				type: 'rate-workflow',
				content: i18n.baseText('aiAssistant.builder.feedbackPrompt'),
				role: 'assistant',
			},
		],
		uuid(),
	);
}

function onNewWorkflow() {
	builderStore.resetBuilderChat();
	workflowGenerated.value = false;
}

watch(
	() => builderStore.chatMessages,
	(messages) => {
		if (workflowGenerated.value) return;

		const workflowGeneratedMessage = messages.find((msg) => msg.type === 'workflow-generated');
		if (workflowGeneratedMessage) {
			onInsertWorkflow(workflowGeneratedMessage.codeSnippet);
		}
	},
	{ deep: true },
);

const unsubscribe = builderStore.$onAction(({ name }) => {
	if (name === 'initSupportChat') {
		onNewWorkflow();
	}
});

onBeforeUnmount(() => {
	unsubscribe();
});
</script>

<template>
	<SlideTransition>
		<N8nResizeWrapper
			v-show="builderStore.isAssistantOpen"
			:supported-directions="['left']"
			:width="builderStore.chatWidth"
			data-test-id="ask-assistant-sidebar"
			@resize="onResizeDebounced"
		>
			<div
				:style="{ width: `${builderStore.chatWidth}px` }"
				:class="$style.wrapper"
				data-test-id="ask-assistant-chat"
				tabindex="0"
				@keydown.stop
			>
				<AskAssistantChat
					:user="user"
					:messages="builderStore.chatMessages"
					:streaming="builderStore.streaming"
					:loading-message="loadingMessage"
					:session-id="builderStore.currentSessionId"
					:mode="i18n.baseText('aiAssistant.builder.mode')"
					@close="onClose"
					@message="onUserMessage"
					@insert-workflow="onInsertWorkflow"
				>
					<template #placeholder>{{ i18n.baseText('aiAssistant.builder.placeholder') }}</template>
					<template v-if="workflowGenerated" #inputPlaceholder>
						<n8n-button size="large" :class="$style.newWorkflowButton" @click="onNewWorkflow">
							{{ i18n.baseText('aiAssistant.builder.generateNew') }}
						</n8n-button>
					</template>
				</AskAssistantChat>
			</div>
		</N8nResizeWrapper>
	</SlideTransition>
</template>

<style module>
.wrapper {
	height: 100%;
}
.newWorkflowButton {
	width: 100%;
}
</style>
