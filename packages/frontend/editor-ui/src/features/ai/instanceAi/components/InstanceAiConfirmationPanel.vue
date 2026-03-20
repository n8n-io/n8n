<script lang="ts" setup>
import { ref, computed } from 'vue';
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore, type PendingConfirmationItem } from '../instanceAi.store';
import { useToolLabel } from '../toolLabels';
import DomainAccessApproval from './DomainAccessApproval.vue';
import InstanceAiCredentialSetup from './InstanceAiCredentialSetup.vue';

const store = useInstanceAiStore();
const i18n = useI18n();
const { getToolLabel } = useToolLabel();

const ROLE_LABELS: Record<string, string> = {
	orchestrator: 'Agent',
	'workflow-builder': 'Workflow Builder',
	'data-table-manager': 'Data Table Manager',
	researcher: 'Researcher',
};

function getRoleLabel(role: string): string {
	return ROLE_LABELS[role] ?? role;
}

function getSeverityIcon(severity?: string): IconName {
	if (severity === 'destructive') return 'triangle-alert';
	if (severity === 'warning') return 'triangle-alert';
	return 'info';
}

interface ConfirmationGroup {
	agentId: string;
	role: string;
	items: PendingConfirmationItem[];
}

/** Group confirmations by agent so sibling approvals are visually grouped. */
const grouped = computed((): ConfirmationGroup[] => {
	const map = new Map<string, ConfirmationGroup>();
	for (const item of store.pendingConfirmations) {
		const key = item.agentNode.agentId;
		let group = map.get(key);
		if (!group) {
			group = { agentId: key, role: item.agentNode.role, items: [] };
			map.set(key, group);
		}
		group.items.push(item);
	}
	return [...map.values()];
});

// Text input state per requestId
const textInputValues = ref<Record<string, string>>({});

function handleConfirm(requestId: string, approved: boolean) {
	store.resolveConfirmation(requestId, approved ? 'approved' : 'denied');
	void store.confirmAction(requestId, approved);
}

function handleApproveAll(items: PendingConfirmationItem[]) {
	for (const item of items) {
		const rid = item.toolCall.confirmation!.requestId;
		store.resolveConfirmation(rid, 'approved');
		void store.confirmAction(rid, true);
	}
}

function handleTextSubmit(requestId: string) {
	const value = (textInputValues.value[requestId] ?? '').trim();
	if (!value) return;
	store.resolveConfirmation(requestId, 'approved');
	void store.confirmAction(requestId, true, undefined, undefined, undefined, value);
}

function handleTextSkip(requestId: string) {
	store.resolveConfirmation(requestId, 'denied');
	void store.confirmAction(requestId, false);
}

/** True when every item in the group is a generic approval (not domain/cred/text). */
function isAllGenericApproval(items: PendingConfirmationItem[]): boolean {
	return items.every(
		(item) =>
			!item.toolCall.confirmation!.domainAccess &&
			!(
				item.toolCall.confirmation!.credentialRequests &&
				item.toolCall.confirmation!.credentialRequests.length > 0
			) &&
			item.toolCall.confirmation!.inputType !== 'text',
	);
}
</script>

<template>
	<TransitionGroup name="confirmation-slide">
		<div
			v-for="group in grouped"
			:key="group.agentId"
			:class="$style.root"
			data-test-id="instance-ai-confirmation-panel"
		>
			<!-- Group header -->
			<div :class="$style.header">
				<N8nIcon icon="circle-pause" size="small" :class="$style.headerIcon" />
				<span :class="$style.headerLabel">
					{{
						i18n.baseText('instanceAi.confirmation.agentContext', {
							interpolate: { agent: getRoleLabel(group.role) },
						})
					}}
				</span>
				<!-- Batch approve all when all are generic approvals and there are 2+ -->
				<button
					v-if="isAllGenericApproval(group.items) && group.items.length > 1"
					:class="[$style.btn, $style.approveBtn, $style.batchBtn]"
					@click="handleApproveAll(group.items)"
				>
					{{ i18n.baseText('instanceAi.confirmation.approveAll') }}
				</button>
			</div>

			<!-- Items -->
			<div :class="$style.items">
				<div
					v-for="item in group.items"
					:key="item.toolCall.confirmation!.requestId"
					:class="[$style.item, group.items.length > 1 ? $style.itemBordered : '']"
				>
					<!-- Domain access -->
					<DomainAccessApproval
						v-if="item.toolCall.confirmation!.domainAccess"
						:request-id="item.toolCall.confirmation!.requestId"
						:url="item.toolCall.confirmation!.domainAccess!.url"
						:host="item.toolCall.confirmation!.domainAccess!.host"
					/>

					<!-- Credential setup -->
					<InstanceAiCredentialSetup
						v-else-if="
							item.toolCall.confirmation!.credentialRequests &&
							item.toolCall.confirmation!.credentialRequests.length > 0
						"
						:request-id="item.toolCall.confirmation!.requestId"
						:credential-requests="item.toolCall.confirmation!.credentialRequests!"
						:message="item.toolCall.confirmation!.message"
						:project-id="item.toolCall.confirmation!.projectId"
						:credential-flow="item.toolCall.confirmation!.credentialFlow"
					/>

					<!-- Text input (ask-user) -->
					<div
						v-else-if="item.toolCall.confirmation!.inputType === 'text'"
						:class="$style.confirmBody"
					>
						<div :class="$style.confirmMessage">
							{{ item.toolCall.confirmation!.message }}
						</div>
						<div :class="$style.textInputRow">
							<input
								v-model="textInputValues[item.toolCall.confirmation!.requestId]"
								:class="$style.textInput"
								type="text"
								:placeholder="i18n.baseText('instanceAi.askUser.placeholder')"
								@keydown.enter="handleTextSubmit(item.toolCall.confirmation!.requestId)"
							/>
							<button
								:class="[$style.btn, $style.secondaryBtn]"
								@click="handleTextSkip(item.toolCall.confirmation!.requestId)"
							>
								{{ i18n.baseText('instanceAi.askUser.skip') }}
							</button>
							<button
								:class="[$style.btn, $style.approveBtn]"
								:disabled="!(textInputValues[item.toolCall.confirmation!.requestId] ?? '').trim()"
								@click="handleTextSubmit(item.toolCall.confirmation!.requestId)"
							>
								{{ i18n.baseText('instanceAi.askUser.submit') }}
							</button>
						</div>
					</div>

					<!-- Generic approval -->
					<div v-else :class="$style.confirmBody">
						<div :class="$style.approvalRow">
							<N8nIcon
								:icon="getSeverityIcon(item.toolCall.confirmation!.severity)"
								size="small"
								:class="[
									item.toolCall.confirmation!.severity === 'destructive'
										? $style.destructiveIcon
										: '',
									item.toolCall.confirmation!.severity === 'warning' ? $style.warningIcon : '',
									item.toolCall.confirmation!.severity === 'info' ? $style.infoIcon : '',
								]"
							/>
							<span :class="$style.toolLabel">{{ getToolLabel(item.toolCall.toolName) }}</span>
							<span :class="$style.approvalMessage">{{ item.toolCall.confirmation!.message }}</span>
							<span :class="$style.approvalActions">
								<button
									:class="[$style.btn, $style.secondaryBtn]"
									data-test-id="instance-ai-panel-confirm-deny"
									@click="handleConfirm(item.toolCall.confirmation!.requestId, false)"
								>
									{{ i18n.baseText('instanceAi.confirmation.deny') }}
								</button>
								<button
									:class="[
										$style.btn,
										item.toolCall.confirmation!.severity === 'destructive'
											? $style.approveDestructiveBtn
											: $style.approveBtn,
									]"
									data-test-id="instance-ai-panel-confirm-approve"
									@click="handleConfirm(item.toolCall.confirmation!.requestId, true)"
								>
									{{ i18n.baseText('instanceAi.confirmation.approve') }}
								</button>
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</TransitionGroup>
</template>

<style lang="scss" module>
.root {
	margin-top: var(--spacing--xs);
	margin-bottom: var(--spacing--sm);
	max-width: 90%;
	border: 1px solid var(--color--warning--tint-1);
	border-radius: var(--radius--lg);
	background: var(--color--background);
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	background: var(--color--warning--tint-2);
}

.headerIcon {
	color: var(--color--warning);
	flex-shrink: 0;
}

.headerLabel {
	font-weight: var(--font-weight--bold);
	flex: 1;
	min-width: 0;
}

.items {
	display: flex;
	flex-direction: column;
}

.item {
	& + & {
		border-top: var(--border);
	}
}

.itemBordered {
	// Only applies when there are multiple items — visual grouping
}

.confirmBody {
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.confirmMessage {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	margin-bottom: var(--spacing--2xs);
}

.approvalRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
	flex-wrap: wrap;
}

.toolLabel {
	font-weight: var(--font-weight--bold);
	font-family: monospace;
	font-size: var(--font-size--3xs);
	color: var(--color--text);
	white-space: nowrap;
}

.approvalMessage {
	color: var(--color--text--tint-1);
	flex: 1;
	min-width: 0;
}

.approvalActions {
	display: flex;
	gap: var(--spacing--4xs);
	margin-left: auto;
	flex-shrink: 0;
}

.destructiveIcon {
	color: var(--color--danger);
	flex-shrink: 0;
}

.warningIcon {
	color: var(--color--warning);
	flex-shrink: 0;
}

.infoIcon {
	color: var(--color--primary);
	flex-shrink: 0;
}

.textInputRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.textInput {
	flex: 1;
	min-width: 0;
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

.btn {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	border: var(--border);
	background: var(--color--background);
	color: var(--color--text);
	white-space: nowrap;

	&:hover {
		background: var(--color--background--shade-1);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.secondaryBtn {
	color: var(--color--text--tint-1);
	border-color: transparent;
	background: none;

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.approveBtn {
	background: var(--color--primary);
	color: var(--button--color--text--primary);
	border-color: var(--color--primary);

	&:hover:not(:disabled) {
		background: var(--color--primary--shade-1);
	}
}

.approveDestructiveBtn {
	background: var(--color--danger);
	color: var(--button--color--text--primary);
	border-color: var(--color--danger);

	&:hover {
		background: var(--color--danger--shade-1);
	}
}

.batchBtn {
	margin-left: auto;
}
</style>

<style lang="scss">
.confirmation-slide-enter-from {
	opacity: 0;
	transform: translateY(8px);
}

.confirmation-slide-enter-active {
	transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.confirmation-slide-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}

.confirmation-slide-leave-active {
	transition: all 0.2s ease-in;
}
</style>
