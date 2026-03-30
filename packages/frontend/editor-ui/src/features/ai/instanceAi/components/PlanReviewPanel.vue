<script lang="ts" setup>
/**
 * PlanReviewPanel.vue
 *
 * Single-card plan approval UI. Shows planned tasks as an accordion with
 * expandable specs, dependency info, and approve/request-changes controls.
 */
import { N8nButton, N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

export interface PlannedTaskArg {
	id: string;
	title: string;
	kind: string;
	spec: string;
	deps: string[];
	tools?: string[];
	workflowId?: string;
}

const props = defineProps<{
	plannedTasks: PlannedTaskArg[];
	message?: string;
	disabled?: boolean;
	readOnly?: boolean;
}>();

const i18n = useI18n();

const emit = defineEmits<{
	approve: [];
	'request-changes': [feedback: string];
}>();

const expandedIds = ref<Set<string>>(new Set());
const feedback = ref('');
const isResolved = ref(false);
const resolvedAction = ref<'approved' | 'changes-requested' | null>(null);

const hasFeedback = computed(() => feedback.value.trim().length > 0);

const kindConfig: Record<string, { icon: IconName; label: string }> = {
	'build-workflow': { icon: 'workflow', label: 'Workflow' },
	'manage-data-tables': { icon: 'table', label: 'Data table' },
	research: { icon: 'search', label: 'Research' },
	delegate: { icon: 'share', label: 'Task' },
};

function getKind(kind: string) {
	return kindConfig[kind] ?? { icon: 'circle', label: kind };
}

function toggle(id: string) {
	if (expandedIds.value.has(id)) {
		expandedIds.value.delete(id);
	} else {
		expandedIds.value.add(id);
	}
}

function getDeps(task: PlannedTaskArg): string[] {
	if (!task.deps.length) return [];
	return task.deps.map((depId) => {
		const dep = props.plannedTasks.find((t) => t.id === depId);
		return dep?.title ?? depId;
	});
}

function handleApprove() {
	if (isResolved.value) return;
	isResolved.value = true;
	resolvedAction.value = 'approved';
	emit('approve');
}

function handleRequestChanges() {
	if (isResolved.value || !hasFeedback.value) return;
	isResolved.value = true;
	resolvedAction.value = 'changes-requested';
	emit('request-changes', feedback.value.trim());
}
</script>

<template>
	<div :class="$style.root" data-test-id="instance-ai-plan-review">
		<!-- Header -->
		<div :class="$style.header">
			<N8nIcon icon="scroll-text" size="small" :class="$style.headerIcon" />
			<span :class="$style.headerTitle">
				{{ i18n.baseText('instanceAi.planReview.title') }}
			</span>
			<span :class="$style.taskCount">{{ plannedTasks.length }} tasks</span>
			<span v-if="props.readOnly" :class="$style.badgeApproved">
				{{ i18n.baseText('instanceAi.planReview.approved') }}
			</span>
			<span v-else-if="!isResolved" :class="$style.badge">
				{{ i18n.baseText('instanceAi.planReview.awaitingApproval') }}
			</span>
			<span v-else-if="resolvedAction === 'approved'" :class="$style.badgeApproved">
				{{ i18n.baseText('instanceAi.planReview.approved') }}
			</span>
		</div>

		<!-- Task accordion -->
		<div :class="$style.tasks">
			<div v-for="(task, idx) in plannedTasks" :key="task.id" :class="$style.taskItem">
				<button
					:class="[$style.taskRow, expandedIds.has(task.id) && $style.taskRowExpanded]"
					type="button"
					@click="toggle(task.id)"
				>
					<span :class="$style.taskNumber">{{ idx + 1 }}</span>
					<N8nIcon :icon="getKind(task.kind).icon" size="small" :class="$style.taskKindIcon" />
					<span :class="$style.taskTitle">{{ task.title }}</span>
					<span :class="$style.taskKindBadge">{{ getKind(task.kind).label }}</span>
					<N8nIcon
						:icon="expandedIds.has(task.id) ? 'chevron-up' : 'chevron-down'"
						size="small"
						:class="$style.chevron"
					/>
				</button>

				<!-- Expanded detail -->
				<div v-if="expandedIds.has(task.id)" :class="$style.taskDetail">
					<p :class="$style.taskSpec">{{ task.spec }}</p>
					<div v-if="getDeps(task).length > 0" :class="$style.taskDeps">
						<span :class="$style.depsLabel">Depends on:</span>
						<span v-for="dep in getDeps(task)" :key="dep" :class="$style.depChip">{{ dep }}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Approval footer -->
		<div v-if="!isResolved && !props.readOnly" :class="$style.footer">
			<textarea
				v-model="feedback"
				:class="$style.feedbackTextarea"
				:placeholder="i18n.baseText('instanceAi.planReview.feedbackPlaceholder')"
				:disabled="disabled"
				rows="2"
			/>
			<div :class="$style.actions">
				<N8nButton
					variant="outline"
					size="small"
					:disabled="disabled || !hasFeedback"
					data-test-id="instance-ai-plan-request-changes"
					@click="handleRequestChanges"
				>
					{{ i18n.baseText('instanceAi.planReview.requestChanges') }}
				</N8nButton>
				<N8nButton
					type="primary"
					size="small"
					:disabled="disabled"
					data-test-id="instance-ai-plan-approve"
					@click="handleApprove"
				>
					{{ i18n.baseText('instanceAi.planReview.approve') }}
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
	// background: var(--color--background);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	// background: var(--color--foreground--tint-2);
	border-bottom: var(--border);
}

.headerIcon {
	color: var(--color--primary);
	flex-shrink: 0;
}

.headerTitle {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.taskCount {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.badge {
	margin-left: auto;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--warning);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	background: var(--color--warning--tint-2);
	border-radius: var(--radius);
	white-space: nowrap;
}

.badgeApproved {
	margin-left: auto;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--success);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	background: var(--color--success--tint-4);
	border-radius: var(--radius);
	white-space: nowrap;
}

.tasks {
	display: flex;
	flex-direction: column;
}

.taskItem {
	& + & {
		border-top: var(--border);
	}
}

.taskRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--sm);
	background: none;
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	text-align: left;
	transition: background-color 0.12s ease;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.taskRowExpanded {
	// background: var(--color--foreground--tint-2);
}

.taskNumber {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: var(--color--foreground);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	flex-shrink: 0;
}

.taskKindIcon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.taskTitle {
	flex: 1;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.taskKindBadge {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	background: var(--color--foreground);
	border-radius: var(--radius--sm);
	white-space: nowrap;
	flex-shrink: 0;
}

.chevron {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
}

.taskDetail {
	padding: 0 var(--spacing--sm) var(--spacing--xs);
	padding-left: calc(var(--spacing--sm) + 20px + var(--spacing--2xs));
	// background: var(--color--foreground--tint-2);
	animation: detail-slide-in 0.15s ease;
}

@keyframes detail-slide-in {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.taskSpec {
	margin: 0;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
}

.taskDeps {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--3xs);
	flex-wrap: wrap;
}

.depsLabel {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	white-space: nowrap;
}

.depChip {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	background: var(--color--foreground);
	border-radius: var(--radius--sm);
	white-space: nowrap;
}

.footer {
	border-top: var(--border);
	padding: var(--spacing--xs) var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.feedbackTextarea {
	width: 100%;
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	background: var(--color--background);
	color: var(--color--text);
	resize: vertical;
	outline: none;

	&:focus {
		border-color: var(--color--primary);
	}

	&::placeholder {
		color: var(--color--text--tint-2);
	}
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
