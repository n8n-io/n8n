<script setup lang="ts">
import {
	N8nAvatar,
	N8nButton,
	N8nCheckbox,
	N8nCombobox2,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nSegmentControl,
	N8nSelect2,
	N8nText,
	N8nTooltip,
	type ComboboxItem,
	type ComboboxValue,
	type IUser,
	type SegmentOption,
	type SelectValue,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, ref, watch } from 'vue';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { useSubWorkflowScope } from '../composables/useSubWorkflowScope';
import { useSelfHealingStore } from '../selfHealing.store';
import type {
	SelfHealingAutonomy,
	SelfHealingConfig,
	SelfHealingConfigInput,
	SelfHealingScope,
} from '../selfHealing.types';

const props = defineProps<{
	open: boolean;
	projectId: string;
	/** The configuration to edit; `null` creates a new one. */
	config: SelfHealingConfig | null;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	saved: [config: SelfHealingConfig];
}>();

const i18n = useI18n();
const store = useSelfHealingStore();
const workflowsListStore = useWorkflowsListStore();
const projectsStore = useProjectsStore();
const usersStore = useUsersStore();

const AUTONOMY_LEVELS: SelfHealingAutonomy[] = ['diagnose', 'review', 'deploy'];
/** Value of the picker entry that stands for every member of the project. */
const PROJECT_MEMBERS_OPTION = '__project-members__';

const autonomyOptions = computed(() =>
	AUTONOMY_LEVELS.map((value) => ({
		value,
		label: i18n.baseText(`selfHealing.autonomy.${value}.label`),
	})),
);

function isAutonomy(value: SelectValue | undefined): value is SelfHealingAutonomy {
	return typeof value === 'string' && AUTONOMY_LEVELS.some((level) => level === value);
}

function autonomyDescription(value: SelectValue): string {
	return isAutonomy(value) ? i18n.baseText(`selfHealing.autonomy.${value}.description`) : '';
}

function onAutonomyChange(value: SelectValue | undefined) {
	if (isAutonomy(value)) form.value.autonomy = value;
}

function emptyForm(): SelfHealingConfigInput {
	return {
		autonomy: 'review',
		scope: 'all',
		selectedWorkflowIds: [],
		includeSubWorkflows: true,
		subWorkflowIds: [],
		customInstructions: '',
		notifyProjectMembers: true,
		reviewerIds: [],
		status: 'active',
	};
}

function formFrom(config: SelfHealingConfig): SelfHealingConfigInput {
	return {
		autonomy: config.autonomy,
		scope: config.scope,
		selectedWorkflowIds: [...config.selectedWorkflowIds],
		includeSubWorkflows: config.includeSubWorkflows,
		subWorkflowIds: [...config.subWorkflowIds],
		customInstructions: config.customInstructions,
		notifyProjectMembers: config.notifyProjectMembers,
		reviewerIds: [...config.reviewerIds],
		status: config.status,
	};
}

const form = ref<SelfHealingConfigInput>(emptyForm());

const isEditing = computed(() => props.config !== null);

const projectWorkflows = computed(() =>
	workflowsListStore.allWorkflows.filter(
		(workflow) => workflow.homeProject?.id === props.projectId && !workflow.isArchived,
	),
);

/** Workflows not yet selected; the picker lists these. */
const pickableWorkflows = computed(() =>
	projectWorkflows.value.filter(
		(workflow) => !form.value.selectedWorkflowIds.includes(workflow.id),
	),
);

const projectWorkflowNames = computed(
	() => new Map(projectWorkflows.value.map((workflow) => [workflow.id, workflow.name])),
);

const subWorkflowScope = useSubWorkflowScope({
	selectedIds: computed(() => form.value.selectedWorkflowIds),
	projectWorkflowNames,
	includeSubWorkflows: computed(() => form.value.includeSubWorkflows),
});
const selectedRows = subWorkflowScope.rows;

/** Workflows whose sub-workflow list is open. Collapsed by default to keep the list short. */
const expandedIds = ref(new Set<string>());

function toggleExpanded(workflowId: string) {
	const next = new Set(expandedIds.value);
	if (next.has(workflowId)) next.delete(workflowId);
	else next.add(workflowId);
	expandedIds.value = next;
}

const workflowPickerItems = computed<ComboboxItem[]>(() =>
	pickableWorkflows.value.map((workflow) => ({
		value: workflow.id,
		label: workflow.name,
		icon: 'workflow',
	})),
);

function addWorkflow(workflowId: string) {
	if (!workflowId || form.value.selectedWorkflowIds.includes(workflowId)) return;
	form.value.selectedWorkflowIds = [...form.value.selectedWorkflowIds, workflowId];
	void subWorkflowScope.load([workflowId]);
}

/** The pickers never keep a value: choosing an entry adds it to the list below. */
function pickedValue(value: ComboboxValue | ComboboxValue[] | undefined): string | undefined {
	return typeof value === 'string' && value !== '' ? value : undefined;
}

function onWorkflowPick(value: ComboboxValue | ComboboxValue[] | undefined) {
	const workflowId = pickedValue(value);
	if (workflowId) addWorkflow(workflowId);
}

function removeWorkflow(workflowId: string) {
	form.value.selectedWorkflowIds = form.value.selectedWorkflowIds.filter((id) => id !== workflowId);
}

const scopeOptions = computed<Array<SegmentOption<SelfHealingScope>>>(() => [
	{ value: 'all', label: i18n.baseText('selfHealing.dialog.scope.all') },
	{ value: 'selected', label: i18n.baseText('selfHealing.dialog.scope.selected') },
]);

/**
 * Reviewer candidates are the project's members, since only they can open the
 * project's workflows. Falls back to every known user while the project is
 * still loading.
 */
const candidateUsers = computed<IUser[]>(() => {
	const relations = projectsStore.currentProject?.relations ?? [];
	if (relations.length > 0) {
		return relations.map((relation) => ({
			id: relation.id,
			email: relation.email,
			firstName: relation.firstName,
			lastName: relation.lastName,
		}));
	}
	return usersStore.allUsers.filter((user) => !user.isPendingUser);
});

const projectName = computed(() => projectsStore.currentProject?.name ?? '');
const projectIcon = computed(() => projectsStore.currentProject?.icon ?? DEFAULT_PROJECT_ICON);

const hasAnyoneToNotify = computed(
	() => form.value.notifyProjectMembers || form.value.reviewerIds.length > 0,
);

/** Members not yet picked individually; the picker lists these. */
const pickableUsers = computed<IUser[]>(() =>
	candidateUsers.value.filter((user) => !form.value.reviewerIds.includes(user.id)),
);

const usersById = computed(() => new Map(candidateUsers.value.map((user) => [user.id, user])));

const peoplePickerItems = computed<ComboboxItem[]>(() => [
	...(form.value.notifyProjectMembers
		? []
		: [
				{
					value: PROJECT_MEMBERS_OPTION,
					label: i18n.baseText('selfHealing.people.projectMembers', {
						interpolate: { project: projectName.value },
					}),
				},
			]),
	...pickableUsers.value.map((user) => ({ value: user.id, label: reviewerName(user) })),
]);

const selectedReviewers = computed<IUser[]>(() =>
	form.value.reviewerIds.flatMap((id) => {
		const user =
			candidateUsers.value.find((candidate) => candidate.id === id) ?? usersStore.usersById[id];
		return user ? [user] : [];
	}),
);

async function loadProjectWorkflows() {
	try {
		await workflowsListStore.fetchAllWorkflows(props.projectId);
	} catch {
		// The opt-out list is a convenience; the form works without it.
	}
}

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		form.value = props.config ? formFrom(props.config) : emptyForm();
		expandedIds.value = new Set();
		void loadProjectWorkflows();
		void subWorkflowScope.load(form.value.selectedWorkflowIds, { refresh: true });
	},
	{ immediate: true },
);

function addReviewer(userId: string) {
	if (!userId || form.value.reviewerIds.includes(userId)) return;
	form.value.reviewerIds = [...form.value.reviewerIds, userId];
}

function onPick(pick: ComboboxValue | ComboboxValue[] | undefined) {
	const value = pickedValue(pick);
	if (!value) return;
	if (value === PROJECT_MEMBERS_OPTION) {
		form.value.notifyProjectMembers = true;
		return;
	}
	addReviewer(value);
}

function removeReviewer(userId: string) {
	form.value.reviewerIds = form.value.reviewerIds.filter((id) => id !== userId);
}

function reviewerName(user: IUser): string {
	const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || (user.email ?? '');
	return user.id === usersStore.currentUser?.id
		? i18n.baseText('selfHealing.dialog.people.you', { interpolate: { name } })
		: name;
}

function close() {
	emit('update:open', false);
}

function save() {
	const input: SelfHealingConfigInput = {
		...form.value,
		subWorkflowIds: subWorkflowScope.coveredSubWorkflowIds.value,
		customInstructions: form.value.customInstructions.trim(),
	};

	const saved = props.config
		? store.updateConfig(props.projectId, props.config.id, input)
		: store.createConfig(props.projectId, input);

	if (saved) emit('saved', saved);
	close();
}
</script>

<template>
	<N8nDialog :open="open" size="medium" @update:open="close">
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{
					i18n.baseText(
						isEditing ? 'selfHealing.dialog.title.edit' : 'selfHealing.dialog.title.create',
					)
				}}
			</N8nDialogTitle>
		</N8nDialogHeader>

		<form :class="$style.form" data-test-id="self-healing-config-dialog" @submit.prevent="save">
			<N8nInputLabel
				input-name="self-healing-autonomy"
				:label="i18n.baseText('selfHealing.dialog.autonomy.label')"
			>
				<N8nSelect2
					id="self-healing-autonomy"
					:model-value="form.autonomy"
					:items="autonomyOptions"
					size="large"
					:class="$style.autonomySelect"
					:content-class="$style.autonomyMenu"
					data-test-id="self-healing-autonomy-select"
					@update:model-value="onAutonomyChange"
				>
					<template #item-label="{ item }">
						<div :class="$style.option">
							<div :class="$style.optionLabel">{{ item.label }}</div>
							<div :class="$style.optionDescription">{{ autonomyDescription(item.value) }}</div>
						</div>
					</template>
				</N8nSelect2>
			</N8nInputLabel>

			<N8nInputLabel :label="i18n.baseText('selfHealing.dialog.scope.label')">
				<N8nSegmentControl
					v-model="form.scope"
					:options="scopeOptions"
					:class="$style.scope"
					data-test-id="self-healing-scope-control"
				/>
				<template v-if="form.scope === 'selected'">
					<!-- Both pickers stop Enter: with no option highlighted it would submit the dialog. -->
					<N8nCombobox2
						id="self-healing-selected-workflows"
						model-value=""
						:items="workflowPickerItems"
						size="large"
						:placeholder="i18n.baseText('selfHealing.dialog.scope.select.placeholder')"
						:class="$style.scopeSelect"
						data-test-id="self-healing-selected-workflows"
						@update:model-value="onWorkflowPick"
						@keydown.enter.prevent
					/>
					<ul
						v-if="selectedRows.length > 0"
						:class="$style.scopeList"
						data-test-id="self-healing-selected-workflow-list"
					>
						<li
							v-for="workflow in selectedRows"
							:key="workflow.id"
							:class="$style.scopeRow"
							:data-test-id="`self-healing-selected-workflow-${workflow.id}`"
						>
							<div :class="$style.scopeRowHeader">
								<N8nIcon
									icon="workflow"
									size="large"
									color="text-base"
									:class="$style.scopeRowIcon"
								/>
								<N8nText size="medium" color="text-dark" :class="$style.entryName">
									{{ workflow.name }}
								</N8nText>
								<N8nIconButton
									icon="x"
									variant="ghost"
									size="small"
									:title="i18n.baseText('selfHealing.dialog.people.remove')"
									data-test-id="self-healing-selected-workflow-remove"
									@click="removeWorkflow(workflow.id)"
								/>
							</div>
							<div
								v-if="workflow.checking || workflow.subWorkflows.length > 0"
								:class="$style.scopeRowBody"
							>
								<span
									v-if="workflow.checking"
									:class="$style.entryMeta"
									data-test-id="self-healing-sub-workflows-checking"
								>
									<N8nIcon icon="loader" size="xsmall" spin />
									{{ i18n.baseText('selfHealing.dialog.scope.subWorkflows.checking') }}
								</span>
								<template v-else>
									<button
										type="button"
										:class="[$style.entryMeta, $style.subWorkflowSummary]"
										:aria-expanded="expandedIds.has(workflow.id)"
										data-test-id="self-healing-sub-workflow-summary"
										@click="toggleExpanded(workflow.id)"
									>
										<span>
											{{
												i18n.baseText('selfHealing.dialog.scope.subWorkflows.count', {
													adjustToNumber: workflow.subWorkflows.length,
													interpolate: { count: String(workflow.subWorkflows.length) },
												})
											}}
										</span>
										<span v-if="workflow.uncoveredCount > 0" :class="$style.uncovered">
											·
											{{
												i18n.baseText('selfHealing.dialog.scope.subWorkflows.uncovered', {
													interpolate: { count: String(workflow.uncoveredCount) },
												})
											}}
										</span>
										<N8nIcon
											:icon="expandedIds.has(workflow.id) ? 'chevron-up' : 'chevron-down'"
											size="xsmall"
										/>
									</button>
									<ul
										v-if="expandedIds.has(workflow.id)"
										:class="$style.subEntries"
										data-test-id="self-healing-sub-workflow-list"
									>
										<li
											v-for="sub in workflow.subWorkflows"
											:key="sub.id"
											:class="$style.subEntry"
											:style="{ '--sub-workflow--depth': sub.depth - 1 }"
											:data-test-id="`self-healing-sub-workflow-${sub.id}`"
											:data-status="sub.status"
										>
											<N8nIcon
												icon="workflow"
												size="medium"
												:color="sub.status === 'covered' ? 'text-base' : 'text-light'"
												:class="$style.scopeRowIcon"
											/>
											<N8nText
												size="medium"
												:color="sub.status === 'covered' ? 'text-dark' : 'text-light'"
												:class="$style.entryName"
											>
												{{ sub.name }}
											</N8nText>
											<N8nTooltip
												v-if="sub.status === 'external'"
												:content="
													i18n.baseText('selfHealing.dialog.scope.subWorkflows.external.tooltip')
												"
												placement="top"
											>
												<span :class="$style.externalLabel">
													{{ i18n.baseText('selfHealing.dialog.scope.subWorkflows.external') }}
													<N8nIcon icon="info" size="xsmall" />
												</span>
											</N8nTooltip>
										</li>
									</ul>
								</template>
							</div>
						</li>
					</ul>
					<N8nText
						v-else
						size="xsmall"
						color="text-light"
						:class="$style.hint"
						data-test-id="self-healing-selected-workflows-empty"
					>
						{{ i18n.baseText('selfHealing.dialog.scope.empty') }}
					</N8nText>
					<N8nCheckbox
						v-if="selectedRows.length > 0"
						v-model="form.includeSubWorkflows"
						:label="i18n.baseText('selfHealing.dialog.scope.subWorkflows.toggle')"
						:class="$style.subWorkflowToggle"
						data-test-id="self-healing-include-sub-workflows"
					/>
				</template>
			</N8nInputLabel>

			<N8nInputLabel
				input-name="self-healing-instructions"
				:label="i18n.baseText('selfHealing.dialog.instructions.label')"
			>
				<N8nInput
					id="self-healing-instructions"
					v-model="form.customInstructions"
					type="textarea"
					:rows="4"
					:maxlength="1000"
					:placeholder="i18n.baseText('selfHealing.dialog.instructions.placeholder')"
					data-test-id="self-healing-instructions-input"
				/>
			</N8nInputLabel>

			<N8nInputLabel
				input-name="self-healing-reviewers"
				:label="i18n.baseText('selfHealing.dialog.people.label')"
				data-test-id="self-healing-people-label"
			>
				<N8nCombobox2
					id="self-healing-reviewers"
					model-value=""
					:items="peoplePickerItems"
					size="large"
					:placeholder="i18n.baseText('selfHealing.dialog.people.placeholder')"
					data-test-id="self-healing-reviewer-select"
					@update:model-value="onPick"
					@keydown.enter.prevent
				>
					<template #item-leading="{ item }">
						<span v-if="item.value === PROJECT_MEMBERS_OPTION" :class="$style.circleIcon">
							<ProjectIcon :icon="projectIcon" size="small" round border-less />
						</span>
						<N8nAvatar
							v-else
							:first-name="usersById.get(item.value)?.firstName"
							:last-name="usersById.get(item.value)?.lastName"
							size="small"
						/>
					</template>
				</N8nCombobox2>
				<ul
					v-if="hasAnyoneToNotify"
					:class="$style.entries"
					data-test-id="self-healing-reviewer-list"
				>
					<li
						v-if="form.notifyProjectMembers"
						:class="$style.entry"
						data-test-id="self-healing-project-members"
					>
						<span :class="$style.circleIcon">
							<ProjectIcon :icon="projectIcon" size="small" round border-less />
						</span>
						<N8nText size="medium" color="text-dark" :class="$style.entryName">
							{{
								i18n.baseText('selfHealing.people.projectMembers', {
									interpolate: { project: projectName },
								})
							}}
						</N8nText>
						<N8nIconButton
							icon="x"
							variant="ghost"
							size="small"
							:title="i18n.baseText('selfHealing.dialog.people.remove')"
							data-test-id="self-healing-project-members-remove"
							@click="form.notifyProjectMembers = false"
						/>
					</li>
					<li
						v-for="user in selectedReviewers"
						:key="user.id"
						:class="$style.entry"
						:data-test-id="`self-healing-reviewer-${user.id}`"
					>
						<N8nAvatar :first-name="user.firstName" :last-name="user.lastName" size="small" />
						<N8nText size="medium" color="text-dark" :class="$style.entryName">
							{{ reviewerName(user) }}
						</N8nText>
						<N8nIconButton
							icon="x"
							variant="ghost"
							size="small"
							:title="i18n.baseText('selfHealing.dialog.people.remove')"
							data-test-id="self-healing-reviewer-remove"
							@click="removeReviewer(user.id)"
						/>
					</li>
				</ul>
				<N8nText
					v-else
					size="xsmall"
					color="text-light"
					:class="$style.hint"
					data-test-id="self-healing-reviewers-empty"
				>
					{{ i18n.baseText('selfHealing.dialog.people.empty') }}
				</N8nText>
			</N8nInputLabel>

			<N8nDialogFooter>
				<N8nButton
					type="button"
					variant="outline"
					data-test-id="self-healing-dialog-cancel"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="submit" data-test-id="self-healing-dialog-save">
					{{ i18n.baseText(isEditing ? 'generic.save' : 'generic.create') }}
				</N8nButton>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	margin-top: var(--spacing--md);
}

.autonomySelect {
	width: 100%;
}

.scope {
	margin-top: var(--spacing--3xs);
}

.scopeSelect {
	margin-top: var(--spacing--xs);
}

// The menu sizes to its longest line by default; the descriptions must wrap
// inside the trigger width instead.
.autonomyMenu {
	width: var(--reka-select-trigger-width);
	max-width: var(--reka-select-trigger-width);
}

// Same shape as the multi-line options in the workflow settings modal.
.option {
	margin: var(--spacing--3xs) 0;
	padding-right: var(--spacing--md);
	white-space: normal;
}

.optionLabel {
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	overflow-wrap: break-word;
}

.optionDescription {
	margin-top: var(--spacing--5xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--xl);
	color: var(--text-color--subtle);
}

.hint {
	display: block;
	margin-top: var(--spacing--3xs);
	margin-bottom: var(--spacing--3xs);
}

// Rows under a picker: the selected workflows and the people to notify.
.entries {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: var(--spacing--xs) 0 0;
	padding: 0;
	list-style: none;
}

.entry {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.entryName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

// The selected workflows: one bordered section each, with the sub-workflows
// it calls under its name. Long selections scroll instead of growing the dialog.
.scopeList {
	margin: var(--spacing--xs) 0 0;
	padding: 0;
	list-style: none;
	max-height: var(--spacing--5xl);
	overflow-y: auto;
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
}

.scopeRow {
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--2xs) var(--spacing--xs);

	& + & {
		border-top: var(--border-width) var(--border-style) var(--border-color);
	}
}

.scopeRowHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.scopeRowIcon {
	flex-shrink: 0;
}

// Starts where the workflow name starts: the large icon is 16px wide.
.scopeRowBody {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	padding-left: calc(var(--spacing--sm) + var(--spacing--2xs));
}

// The quiet second line under a selected workflow.
.entryMeta {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtle);
}

.subWorkflowSummary {
	padding: 0;
	border: 0;
	background: none;
	font-family: inherit;
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}
}

.uncovered {
	color: var(--text-color--warning);
}

// A guide line ties the sub-workflows to the workflow that calls them.
.subEntries {
	display: flex;
	flex-direction: column;
	align-self: stretch;
	gap: var(--spacing--4xs);
	margin: var(--spacing--2xs) 0 var(--spacing--4xs);
	padding: 0 0 0 var(--spacing--xs);
	list-style: none;
	border-left: var(--border-width) var(--border-style) var(--border-color);
}

// Deeper calls step in further.
.subEntry {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--lg);
	padding-left: calc(var(--sub-workflow--depth, 0) * var(--spacing--md));
}

.externalLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
	cursor: default;
}

.subWorkflowToggle {
	margin-top: var(--spacing--xs);
}

// Same footprint as the small person avatar next to it.
.circleIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background-color: var(--color--background--light-3);
}
</style>
