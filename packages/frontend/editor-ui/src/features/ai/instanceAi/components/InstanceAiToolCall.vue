<script lang="ts" setup>
import { ref, computed } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiToolCallState } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import { useToolLabel } from '../toolLabels';
import DomainAccessApproval from './DomainAccessApproval.vue';
import InstanceAiCredentialSetup from './InstanceAiCredentialSetup.vue';
import ToolResultRenderer from './ToolResultRenderer.vue';
import ToolResultJson from './ToolResultJson.vue';

const props = defineProps<{
	toolCall: InstanceAiToolCallState;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const { getToolLabel } = useToolLabel();
const isOpen = ref(false);
const localConfirmStatus = ref<'approved' | 'denied' | null>(null);
const textInputValue = ref('');

const displayName = computed(() => {
	const { toolName, args } = props.toolCall;
	const label = getToolLabel(toolName);
	if (toolName === 'web-search' && typeof args.query === 'string') {
		return `${label}: "${args.query}"`;
	}
	if (toolName === 'fetch-url' && typeof args.url === 'string') {
		return `${label}: ${args.url}`;
	}
	return label;
});

const showConfirmation = computed(
	() =>
		props.toolCall.confirmation &&
		props.toolCall.isLoading &&
		!localConfirmStatus.value &&
		!props.toolCall.confirmationStatus,
);

const isDomainAccessConfirmation = computed(() => !!props.toolCall.confirmation?.domainAccess);

const isTextInputConfirmation = computed(() => props.toolCall.confirmation?.inputType === 'text');

const isCredentialConfirmation = computed(() => {
	if (!props.toolCall.confirmation) return false;
	// Multi-credential: credentialRequests present in the confirmation payload
	if (
		props.toolCall.confirmation.credentialRequests &&
		props.toolCall.confirmation.credentialRequests.length > 0
	) {
		return true;
	}
	return false;
});

const severityIcon = computed(() => {
	if (!props.toolCall.confirmation) return 'info';
	const s = props.toolCall.confirmation.severity;
	return s === 'info' ? 'info' : 'triangle-alert';
});

function handleConfirm(approved: boolean) {
	if (!props.toolCall.confirmation) return;
	localConfirmStatus.value = approved ? 'approved' : 'denied';
	void store.confirmAction(props.toolCall.confirmation.requestId, approved);
}

function handleTextSubmit() {
	if (!props.toolCall.confirmation) return;
	const value = textInputValue.value.trim();
	if (!value) return;
	localConfirmStatus.value = 'approved';
	void store.confirmAction(
		props.toolCall.confirmation.requestId,
		true,
		undefined,
		undefined,
		undefined,
		value,
	);
}

function handleTextSkip() {
	if (!props.toolCall.confirmation) return;
	localConfirmStatus.value = 'denied';
	void store.confirmAction(props.toolCall.confirmation.requestId, false);
}
</script>

<template>
	<CollapsibleRoot v-model:open="isOpen" :class="$style.root" data-test-id="instance-ai-tool-call">
		<CollapsibleTrigger :class="$style.trigger">
			<div :class="$style.triggerContent">
				<N8nIcon
					v-if="props.toolCall.isLoading"
					icon="spinner"
					:class="$style.spinner"
					spin
					size="small"
				/>
				<N8nIcon
					v-else-if="props.toolCall.error !== undefined"
					icon="triangle-alert"
					:class="$style.errorIcon"
					size="small"
				/>
				<N8nIcon v-else icon="check" :class="$style.successIcon" size="small" />
				<span :class="$style.toolName">{{ displayName }}</span>
			</div>
			<N8nIcon :icon="isOpen ? 'chevron-up' : 'chevron-down'" size="small" />
		</CollapsibleTrigger>
		<CollapsibleContent :class="$style.content">
			<div :class="$style.section">
				<div :class="$style.sectionLabel">{{ i18n.baseText('instanceAi.toolCall.input') }}</div>
				<ToolResultJson :value="props.toolCall.args" />
			</div>
			<div v-if="props.toolCall.error !== undefined" :class="$style.section">
				<div :class="$style.sectionLabel">
					{{ i18n.baseText('instanceAi.toolCall.error') }}
				</div>
				<pre :class="[$style.json, $style.errorJson]">{{ props.toolCall.error }}</pre>
			</div>
			<div v-else-if="props.toolCall.result !== undefined" :class="$style.section">
				<div :class="$style.sectionLabel">
					{{ i18n.baseText('instanceAi.toolCall.output') }}
				</div>
				<ToolResultRenderer :result="props.toolCall.result" :tool-name="props.toolCall.toolName" />
			</div>
			<div v-else-if="props.toolCall.isLoading" :class="$style.section">
				<div :class="$style.sectionLabel">
					{{ i18n.baseText('instanceAi.toolCall.running') }}
				</div>
			</div>
		</CollapsibleContent>

		<!-- Domain access confirmation (HITL) -->
		<DomainAccessApproval
			v-if="showConfirmation && isDomainAccessConfirmation"
			:request-id="props.toolCall.confirmation!.requestId"
			:url="props.toolCall.confirmation!.domainAccess!.url"
			:host="props.toolCall.confirmation!.domainAccess!.host"
		/>

		<!-- Credential setup confirmation (HITL) -->
		<InstanceAiCredentialSetup
			v-else-if="showConfirmation && !isDomainAccessConfirmation && isCredentialConfirmation"
			:request-id="props.toolCall.confirmation!.requestId"
			:credential-requests="props.toolCall.confirmation!.credentialRequests!"
			:message="props.toolCall.confirmation!.message"
			:project-id="props.toolCall.confirmation?.projectId"
			:credential-flow="props.toolCall.confirmation?.credentialFlow"
		/>

		<!-- Text input prompt (ask-user HITL) -->
		<div
			v-else-if="showConfirmation && !isDomainAccessConfirmation && isTextInputConfirmation"
			:class="$style.confirmationSection"
		>
			<div :class="$style.confirmationMessage">
				<N8nIcon icon="circle-help" :class="$style.infoIcon" size="small" />
				<span>{{ props.toolCall.confirmation?.message }}</span>
			</div>
			<div :class="$style.textInputWrapper">
				<input
					v-model="textInputValue"
					:class="$style.textInput"
					type="text"
					:placeholder="i18n.baseText('instanceAi.askUser.placeholder')"
					@keydown.enter="handleTextSubmit"
				/>
			</div>
			<div :class="$style.confirmationActions">
				<button :class="[$style.confirmButton, $style.denyButton]" @click="handleTextSkip">
					{{ i18n.baseText('instanceAi.askUser.skip') }}
				</button>
				<button
					:class="[$style.confirmButton, $style.approveButton]"
					:disabled="!textInputValue.trim()"
					@click="handleTextSubmit"
				>
					{{ i18n.baseText('instanceAi.askUser.submit') }}
				</button>
			</div>
		</div>

		<!-- Generic confirmation prompt (HITL) -->
		<div v-else-if="showConfirmation" :class="$style.confirmationSection">
			<div :class="$style.confirmationMessage">
				<N8nIcon
					:icon="severityIcon"
					:class="[
						props.toolCall.confirmation?.severity === 'destructive' ? $style.destructiveIcon : '',
						props.toolCall.confirmation?.severity === 'warning' ? $style.warningIcon : '',
						props.toolCall.confirmation?.severity === 'info' ? $style.infoIcon : '',
					]"
					size="small"
				/>
				<span>{{ props.toolCall.confirmation?.message }}</span>
			</div>
			<div :class="$style.confirmationActions">
				<button
					:class="[$style.confirmButton, $style.denyButton]"
					data-test-id="instance-ai-confirm-deny"
					@click="handleConfirm(false)"
				>
					{{ i18n.baseText('instanceAi.confirmation.deny') }}
				</button>
				<button
					:class="[
						$style.confirmButton,
						props.toolCall.confirmation?.severity === 'destructive'
							? $style.approveDestructive
							: $style.approveButton,
					]"
					data-test-id="instance-ai-confirm-approve"
					@click="handleConfirm(true)"
				>
					{{ i18n.baseText('instanceAi.confirmation.approve') }}
				</button>
			</div>
		</div>

		<!-- Confirmation status indicator -->
		<div v-else-if="localConfirmStatus" :class="$style.confirmationStatus">
			<N8nIcon
				:icon="localConfirmStatus === 'approved' ? 'check' : 'x'"
				size="small"
				:class="localConfirmStatus === 'approved' ? $style.successIcon : $style.errorIcon"
			/>
			<span>{{
				localConfirmStatus === 'approved'
					? i18n.baseText('instanceAi.confirmation.approved')
					: i18n.baseText('instanceAi.confirmation.denied')
			}}</span>
		</div>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
}

.trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--background);
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.triggerContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	overflow: hidden;
	min-width: 0;
}

.toolName {
	font-weight: var(--font-weight--bold);
	font-family: monospace;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.spinner {
	color: var(--color--primary);
}

.errorIcon {
	color: var(--color--danger);
}

.successIcon {
	color: var(--color--success);
}

.content {
	border-top: var(--border);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--background);
}

.section {
	& + & {
		margin-top: var(--spacing--2xs);
		padding-top: var(--spacing--2xs);
		border-top: 1px dashed var(--color--foreground);
	}
}

.sectionLabel {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	margin-bottom: var(--spacing--4xs);
}

.json {
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	margin: 0;
	color: var(--color--text--tint-1);
	max-height: 200px;
	overflow-y: auto;
}

.errorJson {
	color: var(--color--danger);
}

.confirmationSection {
	border-top: var(--border);
	padding: var(--spacing--xs);
	background: var(--color--background--shade-1);
}

.confirmationMessage {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	margin-bottom: var(--spacing--2xs);
}

.destructiveIcon {
	color: var(--color--danger);
}

.warningIcon {
	color: var(--color--warning);
}

.infoIcon {
	color: var(--color--primary);
}

.confirmationActions {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
}

.confirmButton {
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	border: var(--border);
	background: var(--color--background);
	color: var(--color--text);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.denyButton {
	color: var(--color--text--tint-1);
}

.approveButton {
	background: var(--color--primary);
	color: var(--button--color--text--primary);
	border-color: var(--color--primary);

	&:hover {
		background: var(--color--primary--shade-1);
	}
}

.approveDestructive {
	background: var(--color--danger);
	color: var(--button--color--text--primary);
	border-color: var(--color--danger);

	&:hover {
		background: var(--color--danger--shade-1);
	}
}

.textInputWrapper {
	margin-bottom: var(--spacing--2xs);
}

.textInput {
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	background: var(--color--background);
	color: var(--color--text);
	outline: none;

	&:focus {
		border-color: var(--color--primary);
	}

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}

.confirmationStatus {
	border-top: var(--border);
	padding: var(--spacing--2xs) var(--spacing--xs);
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
