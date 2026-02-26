<script setup lang="ts">
import { ref, watch } from 'vue';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nText,
} from '@n8n/design-system';
import { useAgentPanelStore } from '../agentPanel.store';
import AgentAvatarComp from './AgentAvatar.vue';

const panelStore = useAgentPanelStore();
const taskPrompt = ref('');
const sseLogOpen = ref(false);

const isEditingName = ref(false);
const editName = ref('');
const isEditingAvatar = ref(false);
const editAvatar = ref('');

watch(
	() => panelStore.panelAgentId,
	() => {
		isEditingName.value = false;
		isEditingAvatar.value = false;
	},
);

function startEditName() {
	editName.value = panelStore.selectedAgent?.firstName ?? '';
	isEditingName.value = true;
}

async function saveName() {
	const name = editName.value.trim();
	if (!name) return;
	await panelStore.updateAgent({ firstName: name });
	isEditingName.value = false;
}

function cancelEditName() {
	isEditingName.value = false;
}

function startEditAvatar() {
	const agent = panelStore.selectedAgent;
	editAvatar.value = agent?.avatar.type === 'initials' ? '' : (agent?.avatar.value ?? '');
	isEditingAvatar.value = true;
}

async function saveAvatar() {
	const value = editAvatar.value.trim() || null;
	await panelStore.updateAgent({ avatar: value });
	isEditingAvatar.value = false;
}

function cancelEditAvatar() {
	isEditingAvatar.value = false;
}

async function onRunTask() {
	const prompt = taskPrompt.value.trim();
	if (!prompt) return;
	await panelStore.dispatchTask(prompt);
}

function stepIcon(step: { toAgent?: string; external?: boolean; workflowName?: string }) {
	if (step.toAgent) return 'users';
	if (step.external) return 'globe';
	if (step.workflowName) return 'workflow';
	return 'play';
}

function stepStatusIcon(status: string) {
	switch (status) {
		case 'running':
			return 'spinner';
		case 'success':
			return 'check';
		case 'failed':
		case 'error':
			return 'x';
		default:
			return 'spinner';
	}
}
</script>

<template>
	<aside
		role="complementary"
		aria-label="Agent details"
		:class="$style.panel"
		data-testid="agent-action-panel"
	>
		<!-- Header -->
		<div :class="$style.header">
			<div :class="$style.headerInfo">
				<!-- Avatar with edit overlay -->
				<div v-if="panelStore.selectedAgent" :class="$style.avatarWrapper">
					<AgentAvatarComp :avatar="panelStore.selectedAgent.avatar" size="large" />
					<button
						v-if="!panelStore.isExternalPanel"
						:class="$style.avatarEditBtn"
						data-testid="agent-edit-avatar"
						aria-label="Edit avatar"
						@click="startEditAvatar"
					>
						<N8nIcon icon="pen" size="xsmall" />
					</button>
				</div>
				<div>
					<!-- Editable name -->
					<div v-if="isEditingName" :class="$style.editRow">
						<N8nInput
							v-model="editName"
							size="small"
							data-testid="agent-edit-name-input"
							:maxlength="32"
							@keydown.enter="saveName"
							@keydown.escape="cancelEditName"
						/>
						<N8nButton
							size="mini"
							type="tertiary"
							icon-only
							aria-label="Save name"
							@click="saveName"
						>
							<N8nIcon icon="check" size="xsmall" />
						</N8nButton>
						<N8nButton
							size="mini"
							type="tertiary"
							icon-only
							aria-label="Cancel editing name"
							@click="cancelEditName"
						>
							<N8nIcon icon="x" size="xsmall" />
						</N8nButton>
					</div>
					<div v-else :class="$style.nameRow">
						<N8nHeading bold tag="h3" size="medium">
							{{ panelStore.selectedAgent?.firstName }}
						</N8nHeading>
						<button
							v-if="!panelStore.isExternalPanel"
							:class="$style.inlineEditBtn"
							data-testid="agent-edit-name"
							aria-label="Edit name"
							@click="startEditName"
						>
							<N8nIcon icon="pen" size="xsmall" />
						</button>
					</div>
					<N8nText color="text-light" size="small">
						{{ panelStore.selectedAgent?.role }}
					</N8nText>
					<div v-if="panelStore.zoneName" :class="$style.zone">{{ panelStore.zoneName }}</div>
				</div>
			</div>
			<button
				:class="$style.closeBtn"
				data-testid="agent-panel-close"
				aria-label="Close panel"
				@click="panelStore.closePanel()"
			>
				<N8nIcon icon="x" size="medium" />
			</button>
		</div>

		<!-- Avatar edit popover -->
		<div v-if="isEditingAvatar" :class="$style.avatarEditRow" data-testid="agent-avatar-edit-row">
			<N8nInput
				v-model="editAvatar"
				size="small"
				placeholder="Emoji or image URL"
				data-testid="agent-edit-avatar-input"
				:maxlength="255"
				@keydown.enter="saveAvatar"
				@keydown.escape="cancelEditAvatar"
			/>
			<N8nButton label="Save" size="mini" @click="saveAvatar" />
			<N8nButton label="Cancel" type="tertiary" size="mini" @click="cancelEditAvatar" />
		</div>

		<!-- Loading -->
		<div v-if="panelStore.isLoading" :class="$style.loading">
			<N8nIcon icon="spinner" spin size="medium" />
			<N8nText color="text-light" size="small">Loading capabilities...</N8nText>
		</div>

		<!-- External Agent Content -->
		<div
			v-else-if="panelStore.isExternalPanel && panelStore.externalAgentData"
			:class="$style.content"
		>
			<!-- Remote Instance -->
			<section :class="$style.section">
				<N8nText tag="h4" size="small" bold :class="$style.sectionTitle">Remote Instance</N8nText>
				<div :class="$style.listItem">
					<N8nIcon icon="globe" :class="$style.itemIcon" size="small" />
					<span :class="$style.itemName">{{ panelStore.externalAgentData.remoteUrl }}</span>
				</div>
			</section>

			<!-- Skills (workflows on the remote instance) -->
			<section :class="$style.section">
				<N8nText tag="h4" size="small" bold :class="$style.sectionTitle">Skills</N8nText>
				<div v-if="panelStore.externalAgentData.skills.length" :class="$style.list">
					<div
						v-for="skill in panelStore.externalAgentData.skills"
						:key="skill.name"
						:class="$style.listItem"
					>
						<N8nIcon icon="workflow" :class="$style.itemIcon" size="small" />
						<span :class="$style.itemName">{{ skill.name }}</span>
						<N8nText v-if="skill.description" color="text-light" size="xsmall">
							{{ skill.description }}
						</N8nText>
					</div>
				</div>
				<N8nText v-else color="text-light" size="small">No skills advertised</N8nText>
			</section>

			<!-- Required Credentials -->
			<section :class="$style.section">
				<N8nText tag="h4" size="small" bold :class="$style.sectionTitle"
					>Required Credentials</N8nText
				>
				<div v-if="panelStore.externalAgentData.requiredCredentials.length" :class="$style.list">
					<div
						v-for="cred in panelStore.externalAgentData.requiredCredentials"
						:key="cred.type"
						:class="$style.listItem"
					>
						<N8nIcon icon="key-round" :class="$style.itemIcon" size="small" />
						<span :class="$style.itemName">{{ cred.description }}</span>
						<N8nText color="text-light" size="xsmall">{{ cred.type }}</N8nText>
					</div>
				</div>
				<N8nText v-else color="text-light" size="small">No credentials required</N8nText>
			</section>

			<!-- Capabilities -->
			<section :class="$style.section">
				<N8nText tag="h4" size="small" bold :class="$style.sectionTitle">Capabilities</N8nText>
				<div :class="$style.list">
					<div :class="$style.listItem">
						<N8nBadge
							:theme="
								panelStore.externalAgentData.remoteCapabilities.streaming ? 'success' : 'default'
							"
							size="small"
						>
							Streaming:
							{{ panelStore.externalAgentData.remoteCapabilities.streaming ? 'Yes' : 'No' }}
						</N8nBadge>
					</div>
					<div :class="$style.listItem">
						<N8nBadge
							:theme="
								panelStore.externalAgentData.remoteCapabilities.multiTurn ? 'success' : 'default'
							"
							size="small"
						>
							Multi-turn:
							{{ panelStore.externalAgentData.remoteCapabilities.multiTurn ? 'Yes' : 'No' }}
						</N8nBadge>
					</div>
				</div>
			</section>

			<!-- Task Input -->
			<section :class="$style.section">
				<N8nText tag="h4" size="small" bold :class="$style.sectionTitle">Run a Task</N8nText>
				<N8nInput
					v-model="taskPrompt"
					type="textarea"
					:rows="3"
					placeholder="Describe what this agent should do..."
					data-testid="agent-task-input"
					:disabled="panelStore.isSubmitting"
				/>
				<N8nButton
					:label="panelStore.isSubmitting ? 'Running...' : 'Run Task'"
					:disabled="!taskPrompt.trim() || panelStore.isSubmitting"
					:loading="panelStore.isSubmitting"
					size="medium"
					data-testid="agent-run-task"
					:class="$style.runBtn"
					@click="onRunTask"
				/>
			</section>

			<!-- Live Streaming Steps (reused for external) -->
			<section
				v-if="
					panelStore.streamingSteps.length || panelStore.isStreaming || panelStore.streamingSummary
				"
				:class="$style.section"
			>
				<N8nText
					v-if="panelStore.streamingSteps.length || panelStore.isStreaming"
					tag="h4"
					size="small"
					bold
					:class="$style.sectionTitle"
					>Live Progress</N8nText
				>
				<div
					v-if="panelStore.streamingSteps.length || panelStore.isStreaming"
					:class="$style.streamSteps"
				>
					<div
						v-for="(step, i) in panelStore.streamingSteps"
						:key="i"
						:class="$style.streamStep"
						:style="{ animationDelay: `${i * 0.1}s` }"
					>
						<div :class="$style.streamStepHeader">
							<N8nIcon :icon="stepIcon(step)" :class="$style.streamStepIcon" size="small" />
							<span :class="$style.streamStepAction">{{ step.action }}</span>
							<span v-if="step.workflowName" :class="$style.streamStepWorkflow">
								{{ step.workflowName }}
							</span>
							<span v-if="step.toAgent" :class="$style.streamStepAgent">
								&rarr; {{ step.toAgent }}
							</span>
							<span :class="$style.streamStepStatus">
								<N8nIcon
									:icon="stepStatusIcon(step.status)"
									:spin="step.status === 'running'"
									size="xsmall"
									:class="{
										[$style.statusSuccess]: step.status === 'success',
										[$style.statusFailed]: step.status === 'failed' || step.status === 'error',
										[$style.statusRunning]: step.status === 'running',
									}"
								/>
							</span>
						</div>
						<div v-if="step.result" :class="$style.streamStepResult">{{ step.result }}</div>
						<div v-if="step.error" :class="$style.streamStepError">{{ step.error }}</div>
					</div>

					<div v-if="panelStore.isStreaming" :class="$style.thinking">
						<span :class="$style.thinkingDot" />
						<span :class="[$style.thinkingDot, $style.thinkingDot2]" />
						<span :class="[$style.thinkingDot, $style.thinkingDot3]" />
					</div>
				</div>

				<div v-if="panelStore.streamingSummary" :class="$style.summaryCard">
					<N8nIcon icon="check" :class="$style.summaryIcon" size="small" />
					<span>{{ panelStore.streamingSummary }}</span>
				</div>
			</section>

			<!-- Fallback: Static Task Result (non-streaming response) -->
			<section
				v-if="panelStore.taskResult && !panelStore.streamingSteps.length"
				:class="$style.section"
			>
				<N8nText tag="h4" size="small" bold :class="$style.sectionTitle">Result</N8nText>
				<div
					:class="[
						$style.resultBox,
						panelStore.taskResult.status === 'error' ? $style.resultError : $style.resultSuccess,
					]"
				>
					<div v-if="panelStore.taskResult.summary" :class="$style.resultSummary">
						{{ panelStore.taskResult.summary }}
					</div>
					<div v-if="panelStore.taskResult.message" :class="$style.resultMessage">
						{{ panelStore.taskResult.message }}
					</div>
				</div>
			</section>

			<!-- Raw SSE Events Log -->
			<section v-if="panelStore.rawSseEvents.length" :class="$style.section">
				<button :class="$style.collapseToggle" @click="sseLogOpen = !sseLogOpen">
					<N8nIcon :icon="sseLogOpen ? 'chevron-down' : 'chevron-right'" size="xsmall" />
					<N8nText tag="h4" size="small" bold :class="$style.sectionTitle">
						Raw SSE Events
					</N8nText>
					<N8nBadge theme="default" size="small">{{ panelStore.rawSseEvents.length }}</N8nBadge>
				</button>
				<div v-if="sseLogOpen" :class="$style.sseLog">
					<div v-for="(evt, i) in panelStore.rawSseEvents" :key="i" :class="$style.sseEvent">
						<span
							:class="[
								$style.sseEventType,
								evt.type === 'step' ? $style.sseStep : '',
								evt.type === 'observation' ? $style.sseObservation : '',
								evt.type === 'done' ? $style.sseDone : '',
							]"
							>{{ evt.type }}</span
						>
						<span :class="$style.sseEventData">{{ JSON.stringify(evt.data) }}</span>
					</div>
				</div>
			</section>
		</div>

		<!-- Local Agent Content -->
		<div v-else :class="$style.content">
			<!-- Workflows -->
			<section :class="$style.section">
				<N8nText tag="h4" size="small" bold :class="$style.sectionTitle">Workflows</N8nText>
				<div v-if="panelStore.capabilities?.workflows.length" :class="$style.list">
					<div
						v-for="wf in panelStore.capabilities.workflows"
						:key="wf.id"
						:class="$style.listItem"
					>
						<N8nIcon icon="workflow" :class="$style.itemIcon" size="small" />
						<span :class="$style.itemName">{{ wf.name }}</span>
						<N8nBadge :theme="wf.active ? 'success' : 'default'" size="small">
							{{ wf.active ? 'Active' : 'Inactive' }}
						</N8nBadge>
					</div>
				</div>
				<N8nText v-else color="text-light" size="small">No workflows accessible</N8nText>
			</section>

			<!-- Credentials -->
			<section :class="$style.section">
				<N8nText tag="h4" size="small" bold :class="$style.sectionTitle">Credentials</N8nText>
				<div v-if="panelStore.capabilities?.credentials.length" :class="$style.list">
					<div
						v-for="cred in panelStore.capabilities.credentials"
						:key="cred.id"
						:class="$style.listItem"
					>
						<N8nIcon icon="key-round" :class="$style.itemIcon" size="small" />
						<span :class="$style.itemName">{{ cred.name }}</span>
						<N8nText color="text-light" size="xsmall">{{ cred.type }}</N8nText>
					</div>
				</div>
				<N8nText v-else color="text-light" size="small">No credentials accessible</N8nText>
			</section>

			<!-- Connected Agents -->
			<section v-if="panelStore.connectedAgents.length" :class="$style.section">
				<N8nText tag="h4" size="small" bold :class="$style.sectionTitle">Connected Agents</N8nText>
				<div :class="$style.list">
					<div v-for="agent in panelStore.connectedAgents" :key="agent.id" :class="$style.listItem">
						<AgentAvatarComp :avatar="agent.avatar" size="small" />
						<span :class="$style.itemName">{{ agent.firstName }}</span>
					</div>
				</div>
			</section>

			<!-- Task Input -->
			<section :class="$style.section">
				<N8nText tag="h4" size="small" bold :class="$style.sectionTitle">Run a Task</N8nText>
				<N8nCallout v-if="!panelStore.llmConfigured" theme="warning" :class="$style.llmWarning">
					No LLM credential found. Share an Anthropic credential with this agent to enable task
					execution.
				</N8nCallout>
				<N8nInput
					v-model="taskPrompt"
					type="textarea"
					:rows="3"
					placeholder="Describe what this agent should do..."
					data-testid="agent-task-input"
					:disabled="panelStore.isSubmitting"
				/>

				<N8nButton
					:label="panelStore.isSubmitting ? 'Running...' : 'Run Task'"
					:disabled="!taskPrompt.trim() || panelStore.isSubmitting || !panelStore.llmConfigured"
					:loading="panelStore.isSubmitting"
					size="medium"
					data-testid="agent-run-task"
					:class="$style.runBtn"
					@click="onRunTask"
				/>
			</section>

			<!-- Live Streaming Steps -->
			<section
				v-if="
					panelStore.streamingSteps.length || panelStore.isStreaming || panelStore.streamingSummary
				"
				:class="$style.section"
			>
				<N8nText
					v-if="panelStore.streamingSteps.length || panelStore.isStreaming"
					tag="h4"
					size="small"
					bold
					:class="$style.sectionTitle"
					>Live Progress</N8nText
				>
				<div
					v-if="panelStore.streamingSteps.length || panelStore.isStreaming"
					:class="$style.streamSteps"
				>
					<div
						v-for="(step, i) in panelStore.streamingSteps"
						:key="i"
						:class="$style.streamStep"
						:style="{ animationDelay: `${i * 0.1}s` }"
					>
						<div :class="$style.streamStepHeader">
							<N8nIcon :icon="stepIcon(step)" :class="$style.streamStepIcon" size="small" />
							<span :class="$style.streamStepAction">{{ step.action }}</span>
							<span v-if="step.workflowName" :class="$style.streamStepWorkflow">
								{{ step.workflowName }}
							</span>
							<span v-if="step.toAgent" :class="$style.streamStepAgent">
								&rarr; {{ step.toAgent }}
							</span>
							<span :class="$style.streamStepStatus">
								<N8nIcon
									:icon="stepStatusIcon(step.status)"
									:spin="step.status === 'running'"
									size="xsmall"
									:class="{
										[$style.statusSuccess]: step.status === 'success',
										[$style.statusFailed]: step.status === 'failed' || step.status === 'error',
										[$style.statusRunning]: step.status === 'running',
									}"
								/>
							</span>
						</div>
						<div v-if="step.result" :class="$style.streamStepResult">{{ step.result }}</div>
						<div v-if="step.error" :class="$style.streamStepError">{{ step.error }}</div>
					</div>

					<!-- Thinking indicator between steps -->
					<div v-if="panelStore.isStreaming" :class="$style.thinking">
						<span :class="$style.thinkingDot" />
						<span :class="[$style.thinkingDot, $style.thinkingDot2]" />
						<span :class="[$style.thinkingDot, $style.thinkingDot3]" />
					</div>
				</div>

				<!-- Summary card -->
				<div v-if="panelStore.streamingSummary" :class="$style.summaryCard">
					<N8nIcon icon="check" :class="$style.summaryIcon" size="small" />
					<span>{{ panelStore.streamingSummary }}</span>
				</div>
			</section>

			<!-- Fallback: Static Task Result (non-streaming response) -->
			<section
				v-if="panelStore.taskResult && !panelStore.streamingSteps.length"
				:class="$style.section"
			>
				<N8nText tag="h4" size="small" bold :class="$style.sectionTitle">Result</N8nText>
				<div
					:class="[
						$style.resultBox,
						panelStore.taskResult.status === 'error' ? $style.resultError : $style.resultSuccess,
					]"
				>
					<div v-if="panelStore.taskResult.summary" :class="$style.resultSummary">
						{{ panelStore.taskResult.summary }}
					</div>
					<div v-if="panelStore.taskResult.message" :class="$style.resultMessage">
						{{ panelStore.taskResult.message }}
					</div>
					<div v-if="panelStore.taskResult.steps?.length" :class="$style.steps">
						<div v-for="(step, i) in panelStore.taskResult.steps" :key="i" :class="$style.step">
							<span :class="$style.stepIndex">{{ i + 1 }}.</span>
							<span>{{ step.action }}</span>
							<span v-if="step.workflowName" :class="$style.stepWorkflow">
								{{ step.workflowName }}
							</span>
							<span v-if="step.toAgent" :class="$style.stepAgent"> &rarr; {{ step.toAgent }} </span>
							<span v-if="step.result" :class="$style.stepResult">{{ step.result }}</span>
						</div>
					</div>
				</div>
			</section>
			<!-- Raw SSE Events Log -->
			<section v-if="panelStore.rawSseEvents.length" :class="$style.section">
				<button :class="$style.collapseToggle" @click="sseLogOpen = !sseLogOpen">
					<N8nIcon :icon="sseLogOpen ? 'chevron-down' : 'chevron-right'" size="xsmall" />
					<N8nText tag="h4" size="small" bold :class="$style.sectionTitle">
						Raw SSE Events
					</N8nText>
					<N8nBadge theme="default" size="small">{{ panelStore.rawSseEvents.length }}</N8nBadge>
				</button>
				<div v-if="sseLogOpen" :class="$style.sseLog">
					<div v-for="(evt, i) in panelStore.rawSseEvents" :key="i" :class="$style.sseEvent">
						<span
							:class="[
								$style.sseEventType,
								evt.type === 'step' ? $style.sseStep : '',
								evt.type === 'observation' ? $style.sseObservation : '',
								evt.type === 'done' ? $style.sseDone : '',
							]"
							>{{ evt.type }}</span
						>
						<span :class="$style.sseEventData">{{ JSON.stringify(evt.data) }}</span>
					</div>
				</div>
			</section>
		</div>
	</aside>
</template>

<style lang="scss" module>
.panel {
	width: 380px;
	flex-shrink: 0;
	margin: var(--spacing--sm);
	margin-left: 0;
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--xl);
	display: flex;
	flex-direction: column;
	overflow-y: auto;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	padding: var(--spacing--lg);
	border-bottom: 1px solid var(--color--foreground--tint-2);
}

.headerInfo {
	display: flex;
	gap: var(--spacing--xs);
	align-items: flex-start;
}

.avatarWrapper {
	position: relative;
	flex-shrink: 0;
}

.avatarEditBtn {
	position: absolute;
	bottom: -2px;
	right: -2px;
	width: 22px;
	height: 22px;
	border-radius: 50%;
	background: var(--color--background);
	border: var(--border);
	color: var(--color--text--tint-2);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover {
		color: var(--color--primary);
		border-color: var(--color--primary);
	}
}

.nameRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.inlineEditBtn {
	background: none;
	border: none;
	color: var(--color--text--tint-2);
	cursor: pointer;
	padding: var(--spacing--5xs);
	display: flex;
	align-items: center;
	opacity: 0;
	transition: opacity 0.15s;

	.nameRow:hover & {
		opacity: 1;
	}

	&:hover {
		color: var(--color--primary);
	}
}

.editRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.avatarEditRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--lg);
	border-bottom: 1px solid var(--color--foreground--tint-2);
}

.zone {
	font-size: var(--font-size--2xs);
	color: var(--color--primary);
	margin-top: var(--spacing--4xs);
}

.closeBtn {
	background: none;
	border: none;
	color: var(--color--text--tint-2);
	cursor: pointer;
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover {
		color: var(--color--text);
		background: var(--color--foreground--tint-2);
	}
}

.loading {
	padding: var(--spacing--2xl);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: 0;
}

.section {
	padding: var(--spacing--sm) var(--spacing--lg);
	border-bottom: 1px solid var(--color--foreground--tint-2);

	&:last-child {
		border-bottom: none;
	}
}

.sectionTitle {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-2);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin: 0 0 var(--spacing--2xs);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.listItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--sm);
}

.itemIcon {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
}

.itemName {
	color: var(--color--text);
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.llmWarning {
	margin-bottom: var(--spacing--2xs);
}

.runBtn {
	margin-top: var(--spacing--2xs);
	width: 100%;
}

// Live streaming steps
.streamSteps {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.streamStep {
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	animation: slideIn 0.3s ease-out both;
}

@keyframes slideIn {
	from {
		opacity: 0;
		transform: translateY(8px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.streamStepHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
}

.streamStepIcon {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
}

.streamStepAction {
	color: var(--color--text);
	font-weight: var(--font-weight--bold);
}

.streamStepWorkflow {
	color: var(--color--primary);
}

.streamStepAgent {
	color: var(--color--secondary);
}

.streamStepStatus {
	margin-left: auto;
	flex-shrink: 0;
}

.statusSuccess {
	color: var(--color--success);
}

.statusFailed {
	color: var(--color--danger);
}

.statusRunning {
	color: var(--color--text--tint-2);
}

.streamStepResult {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	margin-top: var(--spacing--4xs);
	padding-left: var(--spacing--lg);
	font-style: italic;
}

.streamStepError {
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
	margin-top: var(--spacing--4xs);
	padding-left: var(--spacing--lg);
}

// Thinking dots
.thinking {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.thinkingDot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--color--text--tint-2);
	animation: bounce 1.4s ease-in-out infinite both;
}

.thinkingDot2 {
	animation-delay: 0.16s;
}

.thinkingDot3 {
	animation-delay: 0.32s;
}

@keyframes bounce {
	0%,
	80%,
	100% {
		transform: scale(0.6);
		opacity: 0.4;
	}
	40% {
		transform: scale(1);
		opacity: 1;
	}
}

// Summary card
.summaryCard {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
	padding: var(--spacing--xs);
	background: color-mix(in srgb, var(--color--success) 10%, transparent);
	border: 1px solid var(--color--success--tint-2);
	border-radius: var(--radius);
	font-size: var(--font-size--sm);
	color: var(--color--text);
	animation: fadeIn 0.4s ease-out both;
}

.summaryIcon {
	color: var(--color--success);
	flex-shrink: 0;
	margin-top: 1px;
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

// Static result fallback
.resultBox {
	padding: var(--spacing--xs);
	border-radius: var(--radius);
	font-size: var(--font-size--sm);
}

.resultSuccess {
	background: color-mix(in srgb, var(--color--success) 10%, transparent);
	border: 1px solid var(--color--success--tint-2);
}

.resultError {
	background: color-mix(in srgb, var(--color--danger) 10%, transparent);
	border: 1px solid var(--color--danger--tint-3);
}

.resultSummary {
	color: var(--color--text);
	font-weight: var(--font-weight--bold);
	margin-bottom: var(--spacing--4xs);
}

.resultMessage {
	color: var(--color--text--tint-1);
}

.steps {
	margin-top: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.step {
	display: flex;
	gap: var(--spacing--4xs);
	align-items: baseline;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.stepIndex {
	color: var(--color--text--tint-2);
	font-weight: var(--font-weight--bold);
	flex-shrink: 0;
}

.stepWorkflow {
	color: var(--color--primary);
}

.stepAgent {
	color: var(--color--secondary);
}

.stepResult {
	color: var(--color--text--tint-2);
	font-style: italic;
}

// Collapsible SSE log
.collapseToggle {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	background: none;
	border: none;
	color: var(--color--text--tint-2);
	cursor: pointer;
	padding: 0;
	margin-bottom: var(--spacing--2xs);
	width: 100%;

	&:hover {
		color: var(--color--text);
	}

	.sectionTitle {
		margin: 0;
	}
}

.sseLog {
	max-height: 300px;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 1px;
	background: var(--color--foreground--shade-1);
	border-radius: var(--radius);
	padding: var(--spacing--4xs);
	font-family: monospace;
}

.sseEvent {
	display: flex;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--lg);
}

.sseEventType {
	font-weight: var(--font-weight--bold);
	flex-shrink: 0;
	min-width: 76px;
}

.sseStep {
	color: var(--color--primary);
}

.sseObservation {
	color: var(--color--success);
}

.sseDone {
	color: var(--color--warning);
}

.sseEventData {
	color: var(--color--text--tint-1);
	word-break: break-all;
}
</style>
