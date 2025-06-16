<script lang="ts" setup>
import { useBuilderStore } from '@/stores/builder.store';
import { useUsersStore } from '@/stores/users.store';
import { computed, watch, ref, onBeforeUnmount } from 'vue';
import AskAssistantChat from '@n8n/design-system/components/AskAssistantChat/AskAssistantChat.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import type { IWorkflowDataUpdate } from '@/Interface';
import { nodeViewEventBus } from '@/event-bus';
import { v4 as uuid } from 'uuid';
import { useI18n } from '@n8n/i18n';
import { STICKY_NODE_TYPE } from '@/constants';

const emit = defineEmits<{
	close: [];
}>();

const builderStore = useBuilderStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();
const i18n = useI18n();
const helpful = ref(false);
const generationStartTime = ref(0);

const user = computed(() => ({
	firstName: usersStore.currentUser?.firstName ?? '',
	lastName: usersStore.currentUser?.lastName ?? '',
}));

const workflowGenerated = ref(false);
const loadingMessage = computed(() => builderStore.assistantThinkingMessage);
const generatedWorkflowJson = computed(
	() => builderStore.chatMessages.find((msg) => msg.type === 'workflow-generated')?.codeSnippet,
);

async function onUserMessage(content: string) {
	// If there is no current session running, initialize the support chat session
	await builderStore.initBuilderChat(content, 'chat');
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
	let workflowData: IWorkflowDataUpdate;
	try {
		workflowData = JSON.parse(code);
	} catch (error) {
		console.error('Error parsing workflow data', error);
		return;
	}

	telemetry.track('Workflow generated from prompt', {
		prompt: builderStore.workflowPrompt,
		latency: new Date().getTime() - generationStartTime.value,
		workflow_json: generatedWorkflowJson.value,
	});

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
	helpful.value = false;
	generationStartTime.value = new Date().getTime();
}

function onThumbsUp() {
	helpful.value = true;
	telemetry.track('User rated workflow generation', {
		helpful: helpful.value,
		prompt: builderStore.workflowPrompt,
		workflow_json: generatedWorkflowJson.value,
	});
}

function onThumbsDown() {
	helpful.value = false;
	telemetry.track('User rated workflow generation', {
		helpful: helpful.value,
		prompt: builderStore.workflowPrompt,
		workflow_json: generatedWorkflowJson.value,
	});
}

function onSubmitFeedback(feedback: string) {
	telemetry.track('User submitted workflow generation feedback', {
		helpful: helpful.value,
		feedback,
		prompt: builderStore.workflowPrompt,
		workflow_json: generatedWorkflowJson.value,
	});
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
	if (name === 'initBuilderChat') {
		onNewWorkflow();
	}
});

onBeforeUnmount(() => {
	unsubscribe();
});
</script>

<template>
	<div data-test-id="ask-assistant-chat" tabindex="0" :class="$style.container" @keydown.stop>
		<AskAssistantChat
			:user="user"
			:messages="builderStore.chatMessages"
			:streaming="builderStore.streaming"
			:loading-message="loadingMessage"
			:session-id="builderStore.currentSessionId"
			:mode="i18n.baseText('aiAssistant.builder.mode')"
			:title="'n8n AI'"
			:placeholder="i18n.baseText('aiAssistant.builder.placeholder')"
			@close="emit('close')"
			@message="onUserMessage"
			@thumbs-up="onThumbsUp"
			@thumbs-down="onThumbsDown"
			@submit-feedback="onSubmitFeedback"
			@insert-workflow="onInsertWorkflow"
		>
			<template #header>
				<slot name="header" />
			</template>
			<template #placeholder>
				<n8n-text :class="$style.topText">{{
					i18n.baseText('aiAssistant.builder.placeholder')
				}}</n8n-text>
			</template>
			<template v-if="workflowGenerated" #inputPlaceholder>
				<div :class="$style.newWorkflowButtonWrapper">
					<n8n-button
						type="secondary"
						size="small"
						:class="$style.newWorkflowButton"
						@click="onNewWorkflow"
					>
						{{ i18n.baseText('aiAssistant.builder.generateNew') }}
					</n8n-button>
					<n8n-text :class="$style.newWorkflowText">
						{{ i18n.baseText('aiAssistant.builder.newWorkflowNotice') }}
					</n8n-text>
				</div>
			</template>
		</AskAssistantChat>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
}

.topText {
	color: var(--color-text-base);
}

.newWorkflowButtonWrapper {
	display: flex;
	flex-direction: column;
	flex-flow: wrap;
	gap: var(--spacing-2xs);
	background-color: var(--color-background-light);
	padding: var(--spacing-xs);
	border: 0;
}
.newWorkflowText {
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
}
</style>
