<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
	N8nButton,
	N8nIconPicker,
	N8nInput,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSaveBar,
	N8nSettingsSection,
	N8nText,
	isIconOrEmoji,
} from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import ProjectDeleteDialog from '@/features/collaboration/projects/components/ProjectDeleteDialog.vue';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import {
	type ResourceCounts,
	useProjectsStore,
} from '@/features/collaboration/projects/projects.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import { useCan } from '@/features/projectSettingsPrototype/state/session';
import {
	logProjectChange,
	logProjectDeleted,
} from '@/features/projectSettingsPrototype/state/store';

/**
 * The project's name, icon, and description, and deleting the project.
 *
 * Unlike the other settings pages, this one edits the real n8n project. The
 * prototype only adds each change to its audit log.
 */
const props = defineProps<{ projectId: string }>();

const NAME_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 512;

interface GeneralForm {
	name: string;
	description: string;
	icon: IconOrEmoji;
}

const projectsStore = useProjectsStore();
const router = useRouter();
const toast = useToast();
const can = useCan();

const project = computed(() => {
	const current = projectsStore.currentProject;
	if (current?.id === props.projectId) return current;
	return projectsStore.myProjects.find((entry) => entry.id === props.projectId) ?? null;
});

const canEdit = computed(() => can('project:settings:edit') && project.value !== null);

/* ── Name, icon, and description ── */

const saved = computed<GeneralForm>(() => {
	const icon = project.value?.icon;
	return {
		name: project.value?.name ?? '',
		description: project.value?.description ?? '',
		icon: isIconOrEmoji(icon) ? { ...icon } : { ...DEFAULT_PROJECT_ICON },
	};
});

const iconColor = (icon: IconOrEmoji) => (icon.type === 'icon' ? icon.color : undefined);

const sameIcon = (a: IconOrEmoji, b: IconOrEmoji) =>
	a.type === b.type && a.value === b.value && iconColor(a) === iconColor(b);

const sameForm = (a: GeneralForm, b: GeneralForm) =>
	a.name === b.name && a.description === b.description && sameIcon(a.icon, b.icon);

const copyForm = (source: GeneralForm): GeneralForm => ({ ...source, icon: { ...source.icon } });

/** Edits stay here until the person saves them. */
const form = ref<GeneralForm>(copyForm(saved.value));
const isSaving = ref(false);

// The project can load after the page does. Only a real change replaces the edits.
watch([() => props.projectId, saved], ([id, next], [previousId, previous]) => {
	if (id !== previousId || !sameForm(next, previous)) form.value = copyForm(next);
});

const nameErrorId = useId();
const trimmedName = computed(() => form.value.name.trim());
const nameError = computed(() =>
	canEdit.value && trimmedName.value === '' ? 'Enter a project name' : '',
);

const isValid = computed(
	() =>
		trimmedName.value !== '' &&
		trimmedName.value.length <= NAME_MAX_LENGTH &&
		form.value.description.length <= DESCRIPTION_MAX_LENGTH,
);

const isDirty = computed(() => canEdit.value && !sameForm(form.value, saved.value));

function onIconChange(icon: IconOrEmoji | undefined) {
	if (icon) form.value.icon = icon;
}

function discard() {
	form.value = copyForm(saved.value);
}

const auditShape = (source: GeneralForm) => ({
	name: source.name,
	description: source.description,
	icon: { type: source.icon.type, value: source.icon.value },
});

async function save() {
	if (!isDirty.value || !isValid.value || isSaving.value) return;

	const before = auditShape(saved.value);
	const next: GeneralForm = {
		name: trimmedName.value,
		description: form.value.description.trim(),
		icon: { ...form.value.icon },
	};

	isSaving.value = true;
	try {
		await projectsStore.updateProject(props.projectId, {
			name: next.name,
			icon: next.icon,
			description: next.description,
		});
		logProjectChange(props.projectId, before, auditShape(next));
		form.value = copyForm(saved.value);
		toast.showMessage({ title: 'Project saved', type: 'success' });
	} catch (error) {
		toast.showError(error, "Couldn't save the project");
	} finally {
		isSaving.value = false;
	}
}

function onNameKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' && !event.isComposing) void save();
}

/* ── Delete ── */

const deleteDialogVisible = ref(false);
const isLoadingCounts = ref(false);
const resourceCounts = ref<ResourceCounts>({ credentials: -1, dataTables: -1, workflows: -1 });

/** The delete dialog takes a full project. It reads only the id and the name. */
const dialogProject = computed<Project | null>(() => {
	const value = project.value;
	if (!value) return null;
	if ('relations' in value) return value;
	return { ...value, relations: [], scopes: value.scopes ?? [], rolesManaged: false };
});

async function openDeleteDialog() {
	isLoadingCounts.value = true;
	try {
		resourceCounts.value = await projectsStore.getResourceCounts(props.projectId);
		deleteDialogVisible.value = true;
	} catch (error) {
		toast.showError(error, "Couldn't load what the project contains");
	} finally {
		isLoadingCounts.value = false;
	}
}

async function confirmDelete(transferId?: string) {
	const name = saved.value.name;
	try {
		await projectsStore.deleteProject(props.projectId, transferId);
		deleteDialogVisible.value = false;
		logProjectDeleted(name);
		await router.push('/home/workflows');
		toast.showMessage({ title: 'Project deleted', type: 'success' });
	} catch (error) {
		toast.showError(error, "Couldn't delete the project");
	}
}
</script>

<template>
	<div :class="$style.page" data-test-id="proto-general-page">
		<N8nSettingsSection :class="$style.section" data-test-id="proto-general-details">
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					title="Icon and name"
					description="How the project appears in the sidebar and across n8n."
					action-fill
				>
					<template #action>
						<div :class="$style.nameField">
							<div :class="$style.nameControls">
								<N8nIconPicker
									:model-value="form.icon"
									button-tooltip="Choose an icon"
									:is-read-only="!canEdit"
									show-color-picker
									@update:model-value="onIconChange"
								/>
								<N8nInput
									v-model="form.name"
									:class="$style.nameInput"
									:maxlength="NAME_MAX_LENGTH"
									:disabled="!canEdit"
									required
									placeholder="Marketing"
									aria-label="Project name"
									:aria-invalid="nameError ? 'true' : undefined"
									:aria-describedby="nameError ? nameErrorId : undefined"
									data-test-id="proto-general-name"
									@keydown="onNameKeydown"
								/>
							</div>
							<N8nText
								v-if="nameError"
								:id="nameErrorId"
								size="small"
								color="danger"
								role="alert"
								data-test-id="proto-general-name-error"
							>
								{{ nameError }}
							</N8nText>
						</div>
					</template>
				</N8nSettingsRow>

				<N8nSettingsRow
					layout="vertical"
					title="Description"
					description="Tell people what this project is for."
				>
					<template #action>
						<div :class="$style.descriptionField">
							<N8nInput
								v-model="form.description"
								type="textarea"
								:maxlength="DESCRIPTION_MAX_LENGTH"
								:autosize="{ minRows: 3, maxRows: 8 }"
								:disabled="!canEdit"
								placeholder="Campaign workflows for the marketing team"
								aria-label="Project description"
								data-test-id="proto-general-description"
							/>
							<N8nText
								v-if="canEdit"
								:class="$style.counter"
								size="small"
								color="text-light"
								data-test-id="proto-general-description-count"
							>
								{{ form.description.length }} of {{ DESCRIPTION_MAX_LENGTH }} characters
							</N8nText>
						</div>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nSettingsSection
			v-if="canEdit"
			title="Danger zone"
			:class="$style.section"
			data-test-id="proto-general-danger-zone"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					title="Delete project"
					description="Deletes the project. You choose what happens to its workflows and credentials."
				>
					<template #action>
						<N8nButton
							variant="outline"
							:class="$style.deleteButton"
							:loading="isLoadingCounts"
							data-test-id="proto-general-delete"
							@click="openDeleteDialog"
						>
							Delete project
						</N8nButton>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<ProjectDeleteDialog
			v-model="deleteDialogVisible"
			:current-project="dialogProject"
			:resource-counts="resourceCounts"
			@confirm-delete="confirmDelete"
		/>

		<N8nSettingsSaveBar
			floating
			:visible="isDirty"
			:saving="isSaving"
			:save-disabled="!isValid"
			@save="save"
			@discard="discard"
		/>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);

	// N8nSettingsSection adds its own margin between two sections. The page gap is the distance here.
	> .section + .section {
		margin-block-start: 0;
	}
}

.nameField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	width: 100%;
	padding-block: var(--spacing--xs);
}

.nameControls {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.nameInput {
	flex: 1;
	min-width: 0;
}

.descriptionField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	width: 100%;
}

.counter {
	align-self: flex-end;
	font-variant-numeric: tabular-nums;
}

// The design system has no destructive outline button, so this one takes the danger text color.
.page .deleteButton {
	--button--color: var(--text-color--danger);
}
</style>
