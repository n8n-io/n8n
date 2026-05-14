<script setup lang="ts">
import { computed } from 'vue';
import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
} from '@n8n/api-types';
import {
	isComputerUseApprovalPayload,
	type InteractivePayload,
} from '../../composables/agentChatMessages';
import ApprovalCard from './ApprovalCard.vue';
import AskCredentialCard from './AskCredentialCard.vue';
import AskLlmCard from './AskLlmCard.vue';
import AskQuestionCard from './AskQuestionCard.vue';

/**
 * Single dispatch point for the interactive cards. Switches by `toolName` so
 * `AgentChatMessageList` doesn't repeat the narrowing helpers / non-null
 * assertions for every per-card branch.
 *
 * `projectId` / `agentId` are only required when rendering AskCredentialCard
 * (which talks to the credentials API). Other cards ignore them.
 */
const props = defineProps<{
	payload: InteractivePayload;
	projectId?: string;
	agentId?: string;
}>();

const emit = defineEmits<{
	submit: [resumeData: unknown];
}>();

/**
 * Disabled when the card is already resolved OR when it's still open but has
 * no `runId` to resume against. The latter happens when a stale interactive
 * card from the open checkpoint can't be matched to a backend suspension —
 * normally an after-effect of expired or pruned checkpoint state.
 */
const disabled = computed(() => !!props.payload.resolvedAt || !props.payload.runId);

const computerUsePayload = computed(() =>
	isComputerUseApprovalPayload(props.payload) ? props.payload : null,
);
const askCredentialPayload = computed(() =>
	props.payload.toolName === ASK_CREDENTIAL_TOOL_NAME &&
	!isComputerUseApprovalPayload(props.payload)
		? props.payload
		: null,
);
const askLlmPayload = computed(() =>
	props.payload.toolName === ASK_LLM_TOOL_NAME && !isComputerUseApprovalPayload(props.payload)
		? props.payload
		: null,
);
const askQuestionPayload = computed(() =>
	props.payload.toolName === ASK_QUESTION_TOOL_NAME && !isComputerUseApprovalPayload(props.payload)
		? props.payload
		: null,
);

function onSubmit(resumeData: unknown) {
	emit('submit', resumeData);
}
</script>

<template>
	<ApprovalCard
		v-if="computerUsePayload"
		:input="computerUsePayload.input"
		:disabled="disabled"
		:resolved-value="computerUsePayload.resolvedValue"
		@submit="onSubmit"
	/>
	<AskCredentialCard
		v-else-if="askCredentialPayload && projectId && agentId"
		:purpose="askCredentialPayload.input.purpose"
		:credential-type="askCredentialPayload.input.credentialType"
		:node-type="askCredentialPayload.input.nodeType"
		:credential-slot="askCredentialPayload.input.slot"
		:project-id="projectId"
		:agent-id="agentId"
		:disabled="disabled"
		:resolved-value="askCredentialPayload.resolvedValue"
		@submit="onSubmit"
	/>
	<AskLlmCard
		v-else-if="askLlmPayload"
		:purpose="askLlmPayload.input.purpose"
		:disabled="disabled"
		:resolved-value="askLlmPayload.resolvedValue"
		@submit="onSubmit"
	/>
	<AskQuestionCard
		v-else-if="askQuestionPayload"
		:question="askQuestionPayload.input.question"
		:options="askQuestionPayload.input.options"
		:allow-multiple="askQuestionPayload.input.allowMultiple"
		:disabled="disabled"
		:resolved-value="askQuestionPayload.resolvedValue"
		@submit="onSubmit"
	/>
</template>
