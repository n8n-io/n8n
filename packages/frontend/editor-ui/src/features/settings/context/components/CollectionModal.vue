<script lang="ts" setup>
import {
	KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH,
	KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH,
	type KnowledgeCollectionDto,
} from '@n8n/api-types';
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nFormInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system';
import { getResourcePermissions } from '@n8n/permissions';
import type { Scope } from '@n8n/permissions';
import { ResponseError } from '@n8n/rest-api-client';

import type { Rule, RuleGroup } from '@/Interface';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCollectionsStore } from '@/features/settings/context/collections.store';

/**
 * Owned by the collections page: `open`, `saved` after every save, and `created` once the server
 * saved the collection of the current opening.
 */
const props = defineProps<{
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	saved: [collection: KnowledgeCollectionDto];
	created: [collection: KnowledgeCollectionDto];
}>();

const i18n = useI18n();
const { showError, showMessage } = useToast();
const projectsStore = useProjectsStore();
const collectionsStore = useCollectionsStore();

const PERSONAL_ICON: IconOrEmoji = { type: 'icon', value: 'user' };

const form = reactive({ name: '', description: '', projectId: '' });
const nameValid = ref(false);
const descriptionValid = ref(false);
/** The required errors show once the user tries to submit, not while they fill the form. */
const submitted = ref(false);
/** A name the server refused, such as a taken name. Typing a new name clears it. */
const serverNameError = ref('');
const saving = ref(false);

/** A create reports back only while its opening is current, so it never closes a newer dialog. */
let openToken = 0;

const nameRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH } },
];
const descriptionRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH } },
];

type ProjectOption = { id: string; label: string; icon: IconOrEmoji };

// The server checks `agent:update` in the project of the URL, so only those projects are offered.
function canCreateIn(scopes: Scope[] | undefined): boolean {
	return getResourcePermissions(scopes).agent?.update === true;
}

const projectOptions = computed<ProjectOption[]>(() => {
	const options: ProjectOption[] = [];
	const personal = projectsStore.personalProject;
	if (personal && canCreateIn(personal.scopes)) {
		options.push({
			id: personal.id,
			label: i18n.baseText('settings.context.collections.modal.project.personal'),
			icon: PERSONAL_ICON,
		});
	}

	for (const project of projectsStore.myProjects) {
		if (project.type !== 'team' || !canCreateIn(project.scopes)) {
			continue;
		}

		options.push({
			id: project.id,
			label: project.name ?? project.id,
			icon: project.icon ?? DEFAULT_PROJECT_ICON,
		});
	}

	return options;
});

const selectedProjectIcon = computed(
	() =>
		projectOptions.value.find((option) => option.id === form.projectId)?.icon ??
		DEFAULT_PROJECT_ICON,
);

// The personal project comes first, so it is the default. The list loads after the dialog
// opens, so the default follows it until it holds the current choice.
watch(
	projectOptions,
	(options) => {
		if (!options.some((option) => option.id === form.projectId)) {
			form.projectId = options[0]?.id ?? '';
		}
	},
	{ immediate: true },
);

const isValid = computed(() => nameValid.value && descriptionValid.value && form.projectId !== '');

function isNameTakenError(error: unknown): boolean {
	return error instanceof ResponseError && error.httpStatusCode === 409;
}

// A name is unique in its project, so a new name or a new project can make it free.
watch(
	() => [form.name, form.projectId],
	() => {
		serverNameError.value = '';
	},
);

function resetForm() {
	form.name = '';
	form.description = '';
	form.projectId = projectOptions.value[0]?.id ?? '';
	submitted.value = false;
	serverNameError.value = '';
}

function closeModal() {
	emit('update:open', false);
}

async function handleSubmit() {
	submitted.value = true;
	if (!isValid.value || saving.value) {
		return;
	}

	const token = openToken;
	const payload = { name: form.name.trim(), description: form.description.trim() };

	saving.value = true;
	try {
		const collection = await collectionsStore.createCollection(form.projectId, payload);
		// The page reloads its list on every save, also on one from an earlier opening.
		emit('saved', collection);
		if (token === openToken) {
			emit('created', collection);
		}

		// Every save shows the toast, also one from an earlier opening that no longer reports back.
		showMessage({
			title: i18n.baseText('settings.context.collections.create.success', {
				interpolate: { name: collection.name },
			}),
			type: 'success',
		});
	} catch (error) {
		// An earlier opening has no form to show the taken name under, so it gets the toast.
		if (token === openToken && isNameTakenError(error)) {
			serverNameError.value = i18n.baseText('settings.context.collections.modal.name.taken');
			return;
		}

		showError(error, i18n.baseText('settings.context.collections.error.create'));
	} finally {
		saving.value = false;
	}
}

watch(
	() => props.open,
	(open) => {
		if (!open) {
			return;
		}

		openToken += 1;
		resetForm();
		void projectsStore.getMyProjects();
	},
	{ immediate: true },
);
</script>

<template>
	<N8nDialog
		:open="open"
		:header="i18n.baseText('settings.context.collections.modal.title')"
		:disable-outside-pointer-events="true"
		data-test-id="collection-modal"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogBody :class="$style.form">
			<div>
				<N8nFormInput
					v-model="form.name"
					name="collection-name"
					focus-initially
					required
					:label="i18n.baseText('settings.context.collections.modal.name.label')"
					:placeholder="i18n.baseText('settings.context.collections.modal.name.placeholder')"
					:maxlength="KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH"
					:validate-on-blur="false"
					:show-validation-warnings="submitted"
					:validation-rules="nameRules"
					data-test-id="collection-name-input"
					@validate="(value: boolean) => (nameValid = value)"
					@enter="handleSubmit"
				/>
				<N8nText
					v-if="serverNameError"
					:class="$style.hint"
					tag="p"
					size="small"
					color="danger"
					data-test-id="collection-name-error"
				>
					{{ serverNameError }}
				</N8nText>
			</div>

			<div>
				<N8nFormInput
					v-model="form.description"
					name="collection-description"
					type="textarea"
					required
					:label="i18n.baseText('settings.context.collections.modal.description.label')"
					:placeholder="i18n.baseText('settings.context.collections.modal.description.placeholder')"
					:autosize="{ minRows: 2, maxRows: 6 }"
					:maxlength="KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH"
					:validate-on-blur="false"
					:show-validation-warnings="submitted"
					:validation-rules="descriptionRules"
					data-test-id="collection-description-input"
					@validate="(value: boolean) => (descriptionValid = value)"
				/>
				<!-- Outside the input's own help text, which hides while an error shows. -->
				<div :class="[$style.hint, $style.descriptionHint]">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.context.collections.modal.description.hint') }}
					</N8nText>
					<N8nText
						:class="$style.counter"
						size="small"
						color="text-light"
						data-test-id="collection-description-counter"
					>
						{{ form.description.length }} / {{ KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH }}
					</N8nText>
				</div>
			</div>

			<div>
				<N8nInputLabel
					:label="i18n.baseText('settings.context.collections.modal.project.label')"
					color="text-dark"
				>
					<N8nSelect
						v-model="form.projectId"
						size="large"
						:teleported="false"
						data-test-id="collection-project-select"
					>
						<template #prefix>
							<ProjectIcon :icon="selectedProjectIcon" size="mini" border-less />
						</template>
						<N8nOption
							v-for="option in projectOptions"
							:key="option.id"
							:value="option.id"
							:label="option.label"
						>
							<div :class="$style.option">
								<ProjectIcon :icon="option.icon" size="mini" border-less />
								<span>{{ option.label }}</span>
							</div>
						</N8nOption>
					</N8nSelect>
				</N8nInputLabel>
				<N8nText :class="$style.hint" tag="p" size="small" color="text-light">
					{{ i18n.baseText('settings.context.collections.modal.project.hint') }}
				</N8nText>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('settings.context.collections.modal.cancel')"
				data-test-id="collection-modal-cancel"
				@click="closeModal"
			/>
			<N8nButton
				:loading="saving"
				:label="i18n.baseText('settings.context.collections.modal.submit')"
				data-test-id="collection-modal-submit"
				@click="handleSubmit"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.hint {
	margin: var(--spacing--2xs) 0 0;
}

.descriptionHint {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
}

.counter {
	flex-shrink: 0;
	margin-left: auto;
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
