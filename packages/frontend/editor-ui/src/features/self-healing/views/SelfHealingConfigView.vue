<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAvatar,
	N8nButton,
	N8nCombobox2,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nRadioGroup,
	N8nRadioGroupItem,
	N8nSegmentControl,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nSwitch,
	N8nText,
	type ComboboxItem,
	type ComboboxValue,
	type IUser,
	type SegmentOption,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { VIEWS } from '@/app/constants';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { useSubWorkflowScope, type SelectedWorkflowRow } from '../composables/useSubWorkflowScope';
import { SELF_HEALING_NEW_CONFIG_ID, SELF_HEALING_SETTINGS_HASH } from '../selfHealing.constants';
import SelfHealingSubWorkflowPill from '../components/SelfHealingSubWorkflowPill.vue';
import { useSelfHealingStore } from '../selfHealing.store';
import type {
	SelfHealingAutonomy,
	SelfHealingConfig,
	SelfHealingConfigInput,
	SelfHealingScope,
} from '../selfHealing.types';

/**
 * Creates or edits one self-healing configuration. A project settings
 * sub-page built from the same `N8nSettings*` components as the instance
 * settings pages: the scope list grows with every workflow, and a page grows
 * downward without moving what is above it.
 */

const i18n = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const documentTitle = useDocumentTitle();
const store = useSelfHealingStore();
const workflowsListStore = useWorkflowsListStore();
const projectsStore = useProjectsStore();
const usersStore = useUsersStore();

const AUTONOMY_LEVELS: SelfHealingAutonomy[] = ['diagnose', 'review', 'deploy'];
/** Value of the picker entry that stands for every member of the project. */
const PROJECT_MEMBERS_OPTION = '__project-members__';

function routeParam(name: string): string {
	const value = route.params[name];
	return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

const projectId = computed(() => routeParam('projectId'));
const configId = computed(() => routeParam('configId'));
const isNew = computed(() => configId.value === SELF_HEALING_NEW_CONFIG_ID);
const title = computed(() =>
	i18n.baseText(isNew.value ? 'selfHealing.config.title.create' : 'selfHealing.config.title.edit'),
);

/** The configuration to edit; `null` when creating one or when the id is unknown. */
const config = computed<SelfHealingConfig | null>(() =>
	isNew.value
		? null
		: (store.getProjectConfigs(projectId.value).find((entry) => entry.id === configId.value) ??
			null),
);

// Shown as radios, not a dropdown, so what each level does stays visible after the choice.
const autonomyOptions = computed(() =>
	AUTONOMY_LEVELS.map((value) => ({
		value,
		label: i18n.baseText(`selfHealing.autonomy.${value}.label`),
		description: i18n.baseText(`selfHealing.autonomy.${value}.description`),
	})),
);

function isAutonomy(value: string | undefined): value is SelfHealingAutonomy {
	return AUTONOMY_LEVELS.some((level) => level === value);
}

function onAutonomyChange(value: string | undefined) {
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

function formFrom(source: SelfHealingConfig): SelfHealingConfigInput {
	return {
		autonomy: source.autonomy,
		scope: source.scope,
		selectedWorkflowIds: [...source.selectedWorkflowIds],
		includeSubWorkflows: source.includeSubWorkflows,
		subWorkflowIds: [...source.subWorkflowIds],
		customInstructions: source.customInstructions,
		notifyProjectMembers: source.notifyProjectMembers,
		reviewerIds: [...source.reviewerIds],
		status: source.status,
	};
}

const pageRef = ref<HTMLElement | null>(null);
const form = ref<SelfHealingConfigInput>(emptyForm());
/** What the form held when it was loaded or last saved. */
const savedForm = ref('');

const hasChanges = computed(() => JSON.stringify(form.value) !== savedForm.value);

const projectWorkflows = computed(() =>
	workflowsListStore.allWorkflows.filter(
		(workflow) => workflow.homeProject?.id === projectId.value && !workflow.isArchived,
	),
);

const projectWorkflowNames = computed(
	() => new Map(projectWorkflows.value.map((workflow) => [workflow.id, workflow.name])),
);

/**
 * Workflows that another active configuration selects. A workflow belongs to
 * one such configuration at a time, so this one cannot take them.
 */
const otherCoverage = computed(() =>
	store.getSelectedCoverage(projectId.value, config.value?.id ?? null),
);

const subWorkflowScope = useSubWorkflowScope({
	selectedIds: computed(() => form.value.selectedWorkflowIds),
	projectWorkflowNames,
	includeSubWorkflows: computed(() => form.value.includeSubWorkflows),
	elsewhereIds: otherCoverage,
});
const selectedRows = subWorkflowScope.rows;

/**
 * With sub-workflows included, a workflow that a selected workflow calls is
 * already covered. Maps its id to the name of the first selected workflow that
 * calls it. A selected workflow that is itself covered is skipped as a caller,
 * so two workflows that call each other do not cover each other.
 */
const coveredBy = computed(() => {
	const callers = new Map<string, string>();
	if (!form.value.includeSubWorkflows) return callers;
	for (const row of selectedRows.value) {
		if (callers.has(row.id)) continue;
		for (const sub of row.subWorkflows) {
			if (sub.status === 'covered' && !callers.has(sub.id)) callers.set(sub.id, row.name);
		}
	}
	return callers;
});

function coveredByLabel(workflowId: string): string {
	return i18n.baseText('selfHealing.config.scope.coveredBy', {
		interpolate: { workflow: coveredBy.value.get(workflowId) ?? '' },
	});
}

/** Why the picker cannot add a workflow. */
function pickerNote(workflowId: string): string {
	return coveredBy.value.has(workflowId)
		? coveredByLabel(workflowId)
		: i18n.baseText('selfHealing.config.scope.otherConfig');
}

/**
 * Why some sub-workflows of a row are not covered. With "Include sub-workflows"
 * off the switch is the reason, so one count is enough. With it on, only
 * sub-workflows in other projects are left, and the note says so.
 */
function coverageNote(row: SelectedWorkflowRow): string | null {
	if (row.uncoveredCount > row.externalCount) {
		return i18n.baseText('selfHealing.config.scope.subWorkflows.uncovered', {
			adjustToNumber: row.uncoveredCount,
			interpolate: { count: String(row.uncoveredCount) },
		});
	}
	if (row.externalCount > 0) {
		return i18n.baseText('selfHealing.config.scope.subWorkflows.externalUncovered', {
			adjustToNumber: row.externalCount,
			interpolate: { count: String(row.externalCount) },
		});
	}
	return null;
}

// Covered workflows stay in the picker, disabled, so a search for one explains
// why it cannot be added instead of finding nothing.
const workflowPickerItems = computed<ComboboxItem[]>(() =>
	projectWorkflows.value
		.filter((workflow) => !form.value.selectedWorkflowIds.includes(workflow.id))
		.map((workflow) => ({
			value: workflow.id,
			label: workflow.name,
			icon: 'workflow',
			disabled: coveredBy.value.has(workflow.id) || otherCoverage.value.has(workflow.id),
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
	{ value: 'all', label: i18n.baseText('selfHealing.config.scope.all') },
	{ value: 'selected', label: i18n.baseText('selfHealing.config.scope.selected') },
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

/**
 * The same people have a different role at each autonomy level: they approve
 * fixes under "review", and only hear about the result otherwise.
 */
const peopleCopy = computed(() => {
	const approves = form.value.autonomy === 'review';
	return {
		label: i18n.baseText(
			approves ? 'selfHealing.config.reviewers.label' : 'selfHealing.config.people.label',
		),
		description: i18n.baseText(`selfHealing.config.people.description.${form.value.autonomy}`),
		placeholder: i18n.baseText(
			approves
				? 'selfHealing.config.reviewers.placeholder'
				: 'selfHealing.config.people.placeholder',
		),
		empty: i18n.baseText(
			approves ? 'selfHealing.config.reviewers.empty' : 'selfHealing.config.people.empty',
		),
	};
});

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
		? i18n.baseText('selfHealing.config.people.you', { interpolate: { name } })
		: name;
}

async function loadProjectWorkflows() {
	try {
		await workflowsListStore.fetchAllWorkflows(projectId.value);
	} catch {
		// The workflow picker is a convenience; the form works without it.
	}
}

/** Back to the self-healing section of the project settings page. */
async function goToSettings() {
	await router.push({
		name: VIEWS.PROJECT_SETTINGS,
		params: { projectId: projectId.value },
		hash: SELF_HEALING_SETTINGS_HASH,
	});
}

function loadForm() {
	form.value = config.value ? formFrom(config.value) : emptyForm();
	savedForm.value = JSON.stringify(form.value);
}

watch(
	[projectId, configId],
	() => {
		if (!isNew.value && !config.value) {
			// The prototype keeps configurations in memory, so a reload loses all but the default.
			void goToSettings();
			return;
		}
		documentTitle.set(title.value);
		loadForm();
		void loadProjectWorkflows();
		void subWorkflowScope.load(form.value.selectedWorkflowIds, { refresh: true });
	},
	{ immediate: true },
);

onMounted(async () => {
	// The layout's scroll container outlives the route, so the page would open
	// where the settings page was scrolled to.
	pageRef.value?.scrollIntoView({ block: 'start' });
	// Opening the page by URL skips the settings page, which loads the project.
	await projectsStore.fetchAndSetProject(projectId.value);
});

/**
 * Like the instance settings pages, an edit saves in place. A new
 * configuration goes back to the list, where it now shows.
 */
async function save() {
	const input: SelfHealingConfigInput = {
		...form.value,
		subWorkflowIds: subWorkflowScope.coveredSubWorkflowIds.value,
		customInstructions: form.value.customInstructions.trim(),
	};

	const saved = config.value
		? store.updateConfig(projectId.value, config.value.id, input)
		: store.createConfig(projectId.value, input);
	if (!saved) return;

	const pausedIds = store.pauseOtherAllConfigs(projectId.value, saved.id);
	toast.showMessage({
		title: i18n.baseText('selfHealing.projectSettings.saved'),
		message:
			pausedIds.length > 0
				? i18n.baseText('selfHealing.projectSettings.otherAllPaused')
				: undefined,
		type: 'success',
	});
	if (isNew.value) {
		await goToSettings();
		return;
	}
	loadForm();
}

async function discard() {
	if (isNew.value) {
		await goToSettings();
		return;
	}
	loadForm();
}
</script>

<template>
	<div ref="pageRef" :class="$style.page">
		<!-- The layout's own back row scrolls away, so the page draws a sticky one. -->
		<div :class="$style.backBar">
			<N8nButton
				variant="ghost"
				size="small"
				:class="$style.backButton"
				data-test-id="self-healing-config-back"
				@click="goToSettings"
			>
				<template #icon>
					<N8nIcon icon="arrow-left" />
				</template>
				{{ i18n.baseText('selfHealing.config.back') }}
			</N8nButton>
		</div>
		<N8nSettingsLayout :class="$style.layout" data-test-id="self-healing-config-page">
			<N8nSettingsPageHeader
				:title="title"
				:description="i18n.baseText('selfHealing.config.description')"
				:show-docs-link="false"
			/>

			<N8nSettingsSection
				:title="i18n.baseText('selfHealing.config.autonomy.label')"
				:description="i18n.baseText('selfHealing.config.autonomy.description')"
				data-test-id="self-healing-autonomy-section"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow layout="custom">
						<N8nRadioGroup
							:model-value="form.autonomy"
							data-test-id="self-healing-autonomy"
							@update:model-value="onAutonomyChange"
						>
							<N8nRadioGroupItem
								v-for="option in autonomyOptions"
								:key="option.value"
								:value="option.value"
								:label="option.label"
								:description="option.description"
								:data-test-id="`self-healing-autonomy-${option.value}`"
							/>
						</N8nRadioGroup>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<N8nSettingsSection
				:title="i18n.baseText('selfHealing.config.scope.label')"
				data-test-id="self-healing-scope-section"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						:title="i18n.baseText('selfHealing.config.scope.workflows.title')"
						:description="i18n.baseText('selfHealing.config.scope.workflows.description')"
					>
						<template #action>
							<N8nSegmentControl
								v-model="form.scope"
								:options="scopeOptions"
								data-test-id="self-healing-scope-control"
							/>
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow
						v-if="form.scope === 'selected'"
						:title="i18n.baseText('selfHealing.config.scope.subWorkflows.toggle')"
						:description="i18n.baseText('selfHealing.config.scope.subWorkflows.description')"
					>
						<template #action>
							<N8nSwitch
								v-model="form.includeSubWorkflows"
								data-test-id="self-healing-include-sub-workflows"
							/>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>

				<N8nSettingsRowGroup
					v-if="form.scope === 'selected'"
					data-test-id="self-healing-selected-workflow-list"
				>
					<N8nSettingsRow layout="custom">
						<!-- Both pickers stop Enter so a bare Enter cannot pick an option by accident. -->
						<N8nCombobox2
							id="self-healing-selected-workflows"
							model-value=""
							icon="search"
							:class="$style.searchPicker"
							:items="workflowPickerItems"
							:placeholder="i18n.baseText('selfHealing.config.scope.select.placeholder')"
							data-test-id="self-healing-selected-workflows"
							@update:model-value="onWorkflowPick"
							@keydown.enter.prevent
						>
							<template #item-trailing="{ item }">
								<N8nText v-if="item.disabled" size="small" color="text-light">
									{{ pickerNote(String(item.value)) }}
								</N8nText>
							</template>
						</N8nCombobox2>
						<N8nText
							v-if="selectedRows.length === 0"
							size="small"
							color="text-light"
							:class="$style.hint"
							data-test-id="self-healing-selected-workflows-empty"
						>
							{{ i18n.baseText('selfHealing.config.scope.empty') }}
						</N8nText>
					</N8nSettingsRow>
					<N8nSettingsRow
						v-for="workflow in selectedRows"
						:key="workflow.id"
						:title="workflow.name"
						show-visual
						:data-test-id="`self-healing-selected-workflow-${workflow.id}`"
					>
						<template #visual>
							<N8nIcon icon="workflow" size="large" />
						</template>
						<template #info>
							<N8nText bold size="medium" color="text-dark" :class="$style.truncate">
								{{ workflow.name }}
							</N8nText>
							<N8nText
								v-if="workflow.checking"
								size="small"
								color="text-light"
								:class="$style.checking"
								data-test-id="self-healing-sub-workflows-checking"
							>
								<N8nIcon icon="loader" size="xsmall" spin />
								{{ i18n.baseText('selfHealing.config.scope.subWorkflows.checking') }}
							</N8nText>
							<!-- The gap stays on the row; the pill only answers which sub-workflows. -->
							<N8nText
								v-else-if="coverageNote(workflow)"
								size="small"
								:class="$style.uncovered"
								data-test-id="self-healing-sub-workflow-coverage"
							>
								{{ coverageNote(workflow) }}
							</N8nText>
						</template>
						<template #action>
							<div :class="$style.rowActions">
								<SelfHealingSubWorkflowPill
									v-if="!workflow.checking && workflow.subWorkflows.length > 0"
									:sub-workflows="workflow.subWorkflows"
								/>
								<N8nIconButton
									icon="x"
									variant="ghost"
									size="small"
									:title="i18n.baseText('selfHealing.config.people.remove')"
									data-test-id="self-healing-selected-workflow-remove"
									@click="removeWorkflow(workflow.id)"
								/>
							</div>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<N8nSettingsSection
				:title="i18n.baseText('selfHealing.config.instructions.label')"
				data-test-id="self-healing-instructions-section"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow layout="custom">
						<N8nInput
							id="self-healing-instructions"
							v-model="form.customInstructions"
							type="textarea"
							:autosize="{ minRows: 4, maxRows: 12 }"
							:maxlength="1000"
							:placeholder="i18n.baseText('selfHealing.config.instructions.placeholder')"
							data-test-id="self-healing-instructions-input"
						/>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<N8nSettingsSection
				:title="peopleCopy.label"
				:description="peopleCopy.description"
				data-test-id="self-healing-people-section"
			>
				<N8nSettingsRowGroup data-test-id="self-healing-reviewer-list">
					<N8nSettingsRow layout="custom">
						<N8nCombobox2
							id="self-healing-reviewers"
							model-value=""
							:items="peoplePickerItems"
							:placeholder="peopleCopy.placeholder"
							data-test-id="self-healing-reviewer-select"
							@update:model-value="onPick"
							@keydown.enter.prevent
						>
							<template #item-leading="{ item }">
								<span v-if="item.value === PROJECT_MEMBERS_OPTION" :class="$style.projectAvatar">
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
						<N8nText
							v-if="!hasAnyoneToNotify"
							size="small"
							color="text-light"
							:class="$style.hint"
							data-test-id="self-healing-reviewers-empty"
						>
							{{ peopleCopy.empty }}
						</N8nText>
					</N8nSettingsRow>
					<N8nSettingsRow
						v-if="form.notifyProjectMembers"
						data-test-id="self-healing-project-members"
					>
						<template #info>
							<div :class="$style.person">
								<span :class="$style.projectAvatar">
									<ProjectIcon :icon="projectIcon" size="small" round border-less />
								</span>
								<N8nText bold size="medium" color="text-dark" :class="$style.truncate">
									{{
										i18n.baseText('selfHealing.people.projectMembers', {
											interpolate: { project: projectName },
										})
									}}
								</N8nText>
							</div>
						</template>
						<template #action>
							<N8nIconButton
								icon="x"
								variant="ghost"
								size="small"
								:title="i18n.baseText('selfHealing.config.people.remove')"
								data-test-id="self-healing-project-members-remove"
								@click="form.notifyProjectMembers = false"
							/>
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow
						v-for="user in selectedReviewers"
						:key="user.id"
						:data-test-id="`self-healing-reviewer-${user.id}`"
					>
						<template #info>
							<div :class="$style.person">
								<N8nAvatar :first-name="user.firstName" :last-name="user.lastName" size="small" />
								<div :class="$style.personText">
									<N8nText bold size="medium" color="text-dark" :class="$style.truncate">
										{{ reviewerName(user) }}
									</N8nText>
									<N8nText
										v-if="user.email"
										size="small"
										color="text-light"
										:class="$style.truncate"
									>
										{{ user.email }}
									</N8nText>
								</div>
							</div>
						</template>
						<template #action>
							<N8nIconButton
								icon="x"
								variant="ghost"
								size="small"
								:title="i18n.baseText('selfHealing.config.people.remove')"
								data-test-id="self-healing-reviewer-remove"
								@click="removeReviewer(user.id)"
							/>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<!-- In the page flow, like the Save button on the other settings forms. -->
			<div :class="$style.actions" data-test-id="self-healing-config-actions">
				<N8nButton
					variant="outline"
					:disabled="!isNew && !hasChanges"
					data-test-id="self-healing-config-discard"
					@click="discard"
				>
					{{ i18n.baseText(isNew ? 'generic.cancel' : 'selfHealing.config.actions.discard') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					:disabled="!isNew && !hasChanges"
					data-test-id="self-healing-config-save"
					@click="save"
				>
					{{
						i18n.baseText(
							isNew ? 'selfHealing.config.actions.create' : 'selfHealing.config.actions.save',
						)
					}}
				</N8nButton>
			</div>
		</N8nSettingsLayout>
	</div>
</template>

<style lang="scss" module>
.page {
	width: 100%;
}

// On the page background, so the content scrolls under it. The top inset puts
// the button level with the icon buttons at the top of the main sidebar.
.backBar {
	position: sticky;
	top: 0;
	z-index: 1;
	padding: var(--spacing--2xs) var(--spacing--lg) var(--spacing--sm);
	background-color: var(--color--background--light-2);
}

// Pulls the ghost button's inner padding, as the layout does for its own back action.
.backButton {
	margin-inline-start: calc(-1 * var(--spacing--xs));
}

// With the back bar's bottom padding (16px), this makes the layout's usual 24px gap below the back action.
.layout {
	padding-top: var(--spacing--2xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

// The search icon takes the placeholder's colour, not the input text's.
.searchPicker [data-icon='search'] {
	color: var(--input--placeholder--color);
}

.hint {
	display: block;
	margin-top: var(--spacing--2xs);
}

.truncate {
	display: block;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.rowActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.checking {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.uncovered {
	color: var(--text-color--warning);
}

.person {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.personText {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

// Same footprint as the small person avatar.
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
</style>
