<script setup lang="ts">
import {
	N8nAvatar,
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSegmentControl,
	N8nSelect,
	N8nSelect2,
	N8nText,
	N8nUserSelect,
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
		customInstructions: config.customInstructions,
		notifyProjectMembers: config.notifyProjectMembers,
		reviewerIds: [...config.reviewerIds],
		status: config.status,
	};
}

const form = ref<SelfHealingConfigInput>(emptyForm());
const loadingWorkflows = ref(false);

const isEditing = computed(() => props.config !== null);

const projectWorkflows = computed(() =>
	workflowsListStore.allWorkflows.filter(
		(workflow) => workflow.homeProject?.id === props.projectId && !workflow.isArchived,
	),
);

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

const selectedReviewers = computed<IUser[]>(() =>
	form.value.reviewerIds.flatMap((id) => {
		const user =
			candidateUsers.value.find((candidate) => candidate.id === id) ?? usersStore.usersById[id];
		return user ? [user] : [];
	}),
);

async function loadProjectWorkflows() {
	loadingWorkflows.value = true;
	try {
		await workflowsListStore.fetchAllWorkflows(props.projectId);
	} catch {
		// The opt-out list is a convenience; the form works without it.
	} finally {
		loadingWorkflows.value = false;
	}
}

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		form.value = props.config ? formFrom(props.config) : emptyForm();
		void loadProjectWorkflows();
	},
	{ immediate: true },
);

function addReviewer(userId: string) {
	if (!userId || form.value.reviewerIds.includes(userId)) return;
	form.value.reviewerIds = [...form.value.reviewerIds, userId];
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
				<N8nSelect
					v-if="form.scope === 'selected'"
					id="self-healing-selected-workflows"
					v-model="form.selectedWorkflowIds"
					multiple
					filterable
					collapse-tags
					:collapse-tags-tooltip="true"
					:teleported="false"
					:loading="loadingWorkflows"
					:placeholder="i18n.baseText('selfHealing.dialog.scope.select.placeholder')"
					:class="$style.scopeSelect"
					data-test-id="self-healing-selected-workflows"
				>
					<N8nOption
						v-for="workflow in projectWorkflows"
						:key="workflow.id"
						:label="workflow.name"
						:value="workflow.id"
					/>
				</N8nSelect>
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
				<N8nUserSelect
					id="self-healing-reviewers"
					:users="candidateUsers"
					:ignore-ids="form.reviewerIds"
					:current-user-id="usersStore.currentUser?.id ?? ''"
					:placeholder="i18n.baseText('selfHealing.dialog.people.placeholder')"
					:teleported="false"
					data-test-id="self-healing-reviewer-select"
					@update:model-value="addReviewer"
				/>
				<ul
					v-if="hasAnyoneToNotify"
					:class="$style.reviewers"
					data-test-id="self-healing-reviewer-list"
				>
					<li
						v-if="form.notifyProjectMembers"
						:class="$style.reviewer"
						data-test-id="self-healing-project-members"
					>
						<span :class="$style.projectAvatar">
							<ProjectIcon :icon="projectIcon" size="small" round border-less />
						</span>
						<N8nText size="medium" color="text-dark" :class="$style.reviewerName">
							{{
								i18n.baseText('selfHealing.dialog.people.projectMembers', {
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
						:class="$style.reviewer"
						:data-test-id="`self-healing-reviewer-${user.id}`"
					>
						<N8nAvatar :first-name="user.firstName" :last-name="user.lastName" size="small" />
						<N8nText size="medium" color="text-dark" :class="$style.reviewerName">
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
				<N8nButton
					v-if="!form.notifyProjectMembers"
					variant="ghost"
					size="small"
					icon="users"
					type="button"
					:label="
						i18n.baseText('selfHealing.dialog.people.addProjectMembers', {
							interpolate: { project: projectName },
						})
					"
					:class="$style.addMembers"
					data-test-id="self-healing-add-project-members"
					@click="form.notifyProjectMembers = true"
				/>
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

.reviewers {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: var(--spacing--xs) 0 0;
	padding: 0;
	list-style: none;
}

.reviewer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.reviewerName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

// Same footprint as the small person avatar next to it.
.projectAvatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background-color: var(--color--background--light-3);
}

.addMembers {
	align-self: flex-start;
	margin-top: var(--spacing--2xs);
}
</style>
