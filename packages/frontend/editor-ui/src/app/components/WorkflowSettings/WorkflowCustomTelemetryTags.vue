<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ICustomTelemetryTag } from 'n8n-workflow';
import { ElCol, ElRow } from 'element-plus';

type Props = {
	modelValue?: ICustomTelemetryTag[];
	isReadOnly: boolean;
	saveTags?: (tags: ICustomTelemetryTag[]) => Promise<void> | void;
};

type Emits = {
	'update:modelValue': [tags: ICustomTelemetryTag[]];
	'validity-change': [hasErrors: boolean];
};

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const i18n = useI18n();
const showModal = ref(false);
const isSaving = ref(false);
const draft = ref<ICustomTelemetryTag[]>([]);

const tags = computed(() => props.modelValue ?? []);

const cloneTags = (tagsToClone: ICustomTelemetryTag[] = []) =>
	tagsToClone.map((tag) => ({ ...tag }));

const createEmptyTag = (): ICustomTelemetryTag => ({ key: '', value: '' });

const isEmptyTag = (tag: ICustomTelemetryTag) => !tag.key.trim() && !tag.value.trim();

const getSavedTags = (tagsToSave: ICustomTelemetryTag[]) =>
	tagsToSave
		.filter((tag) => !isEmptyTag(tag))
		.map((tag) => ({ key: tag.key.trim(), value: tag.value }));

const getTagErrors = (tagsToValidate: ICustomTelemetryTag[]) => {
	const seen = new Set<string>();
	return tagsToValidate.map((tag) => {
		const trimmedKey = tag.key.trim();
		if (!trimmedKey && isEmptyTag(tag)) return null;
		if (!trimmedKey) return i18n.baseText('workflowSettings.customTelemetryTags.error.emptyKey');
		if (seen.has(trimmedKey)) {
			return i18n.baseText('workflowSettings.customTelemetryTags.error.duplicateKey');
		}
		seen.add(trimmedKey);
		return null;
	});
};

const tagErrors = computed(() => getTagErrors(tags.value));
const draftErrors = computed(() => getTagErrors(draft.value));

const validationError = computed(() => {
	const error = tagErrors.value.find((tagError) => tagError !== null);
	return error ?? null;
});

const draftValidationError = computed(() => {
	const error = draftErrors.value.find((tagError) => tagError !== null);
	return error ?? null;
});

const hasTagErrors = computed(() => validationError.value !== null);
const hasDraftErrors = computed(() => draftValidationError.value !== null);
const areControlsDisabled = computed(() => props.isReadOnly || isSaving.value);

watch(
	hasTagErrors,
	(hasErrors) => {
		emit('validity-change', hasErrors);
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	emit('validity-change', false);
});

const updateDraftTag = (index: number, field: keyof ICustomTelemetryTag, value: string) => {
	draft.value = draft.value.map((tag, tagIndex) =>
		tagIndex === index ? { ...tag, [field]: value } : tag,
	);
};

const addTag = () => {
	draft.value = [...draft.value, createEmptyTag()];
};

const deleteTag = (index: number) => {
	const nextTags = draft.value.filter((_, tagIndex) => tagIndex !== index);
	draft.value = nextTags.length ? nextTags : [createEmptyTag()];
};

const openModal = () => {
	draft.value = tags.value.length ? cloneTags(tags.value) : [createEmptyTag()];
	showModal.value = true;
};

const cancelModal = () => {
	draft.value = cloneTags(tags.value);
	showModal.value = false;
};

const saveModal = async () => {
	if (hasDraftErrors.value || isSaving.value) return;

	const savedTags = getSavedTags(draft.value);
	isSaving.value = true;
	try {
		await props.saveTags?.(savedTags);
		emit('update:modelValue', savedTags);
	} catch {
		return;
	} finally {
		isSaving.value = false;
	}

	showModal.value = false;
};

const onModalOpenChange = (open: boolean) => {
	if (open) {
		openModal();
		return;
	}

	if (isSaving.value) return;

	cancelModal();
};
</script>

<template>
	<div :class="$style.wrapper">
		<ElRow
			:class="$style.customTelemetryTags"
			data-test-id="workflow-settings-custom-telemetry-tags"
		>
			<ElCol :span="10" :class="$style.settingName">
				<label>
					{{ i18n.baseText('workflowSettings.customTelemetryTags.displayName') }}
					<N8nTooltip placement="top">
						<template #content>
							{{ i18n.baseText('workflowSettings.customTelemetryTags.description') }}
						</template>
						<N8nIcon icon="circle-help" />
					</N8nTooltip>
				</label>
			</ElCol>
			<ElCol :span="14" :class="$style.customTelemetryTagsControl">
				<N8nButton
					variant="ghost"
					size="medium"
					native-type="button"
					:class="$style.customTelemetryTagsConfigure"
					data-test-id="workflow-settings-custom-telemetry-tags-configure"
					@click="openModal"
				>
					{{ i18n.baseText('workflowSettings.customTelemetryTags.configure') }}
					<N8nIcon icon="chevron-right" />
				</N8nButton>
				<N8nText
					v-if="validationError"
					size="small"
					color="danger"
					tag="p"
					:class="$style.customTelemetryTagsError"
					data-test-id="workflow-settings-custom-telemetry-tags-error"
				>
					{{ validationError }}
				</N8nText>
			</ElCol>
		</ElRow>
		<N8nDialog :open="showModal" size="large" @update:open="onModalOpenChange">
			<N8nDialogHeader>
				<div :class="$style.customTelemetryTagsModalTitle">
					<N8nIconButton
						icon="chevron-left"
						variant="ghost"
						size="medium"
						icon-size="large"
						:disabled="isSaving"
						:aria-label="i18n.baseText('generic.back')"
						@click="cancelModal"
					/>
					<N8nDialogTitle>
						{{ i18n.baseText('workflowSettings.customTelemetryTags.modal.title') }}
					</N8nDialogTitle>
				</div>
				<N8nDialogDescription :class="$style.customTelemetryTagsModalDescription">
					{{ i18n.baseText('workflowSettings.customTelemetryTags.description') }}
				</N8nDialogDescription>
			</N8nDialogHeader>
			<div
				:class="$style.customTelemetryTagsModal"
				data-test-id="workflow-settings-custom-telemetry-tags-modal"
			>
				<div
					v-if="draft.length > 0"
					:class="$style.customTelemetryTagsLabels"
					data-test-id="workflow-settings-custom-telemetry-tags-labels"
				>
					<N8nText
						tag="label"
						size="small"
						bold
						:class="$style.customTelemetryTagsField"
						:for="`workflow-custom-telemetry-tag-key-0`"
					>
						{{ i18n.baseText('workflowSettings.customTelemetryTags.tag.key.displayName') }}
					</N8nText>
					<N8nText
						tag="label"
						size="small"
						bold
						:class="$style.customTelemetryTagsField"
						:for="`workflow-custom-telemetry-tag-value-0`"
					>
						{{ i18n.baseText('workflowSettings.customTelemetryTags.tag.value.displayName') }}
					</N8nText>
					<span :class="$style.customTelemetryTagsDeleteSpacer" />
				</div>
				<div
					v-for="(tag, index) in draft"
					:key="index"
					:class="$style.customTelemetryTagsRow"
					data-test-id="workflow-settings-custom-telemetry-tags-row"
				>
					<N8nInput
						:id="`workflow-custom-telemetry-tag-key-${index}`"
						:class="$style.customTelemetryTagsField"
						:model-value="tag.key"
						size="medium"
						:disabled="areControlsDisabled"
						:placeholder="i18n.baseText('workflowSettings.customTelemetryTags.tag.key.placeholder')"
						:aria-label="i18n.baseText('workflowSettings.customTelemetryTags.tag.key.displayName')"
						data-test-id="workflow-settings-custom-telemetry-tags-key"
						@update:model-value="updateDraftTag(index, 'key', String($event))"
					/>
					<N8nInput
						:id="`workflow-custom-telemetry-tag-value-${index}`"
						:class="$style.customTelemetryTagsField"
						:model-value="tag.value"
						size="medium"
						:disabled="areControlsDisabled"
						:placeholder="
							i18n.baseText('workflowSettings.customTelemetryTags.tag.value.placeholder')
						"
						:aria-label="
							i18n.baseText('workflowSettings.customTelemetryTags.tag.value.displayName')
						"
						data-test-id="workflow-settings-custom-telemetry-tags-value"
						@update:model-value="updateDraftTag(index, 'value', String($event))"
					/>
					<N8nIconButton
						icon="trash-2"
						variant="ghost"
						size="small"
						:disabled="areControlsDisabled"
						:title="i18n.baseText('workflowSettings.customTelemetryTags.delete')"
						:aria-label="i18n.baseText('workflowSettings.customTelemetryTags.delete')"
						data-test-id="workflow-settings-custom-telemetry-tags-delete"
						@click="deleteTag(index)"
					/>
				</div>
				<N8nButton
					icon="plus"
					variant="subtle"
					size="small"
					native-type="button"
					:disabled="areControlsDisabled"
					:class="$style.customTelemetryTagsAdd"
					data-test-id="workflow-settings-custom-telemetry-tags-add"
					@click="addTag"
				>
					{{ i18n.baseText('workflowSettings.customTelemetryTags.placeholder') }}
				</N8nButton>
				<N8nText
					v-if="draftValidationError"
					size="small"
					color="danger"
					tag="p"
					:class="$style.customTelemetryTagsError"
					data-test-id="workflow-settings-custom-telemetry-tags-modal-error"
				>
					{{ draftValidationError }}
				</N8nText>
			</div>
			<N8nDialogFooter>
				<N8nButton
					variant="subtle"
					:disabled="isSaving"
					data-test-id="workflow-settings-custom-telemetry-tags-cancel"
					@click="cancelModal"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					:disabled="areControlsDisabled || hasDraftErrors"
					data-test-id="workflow-settings-custom-telemetry-tags-save"
					@click="saveModal"
				>
					{{ i18n.baseText('generic.save') }}
				</N8nButton>
			</N8nDialogFooter>
		</N8nDialog>
	</div>
</template>

<style module lang="scss">
.wrapper {
	display: contents;
}

.customTelemetryTags {
	margin-top: var(--spacing--xs);
	align-items: flex-start;
}

.settingName {
	&,
	& label {
		display: flex;
		align-items: center;
		gap: var(--spacing--4xs);
	}

	svg {
		display: inline-flex;
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	&:hover {
		svg {
			opacity: 1;
		}
	}
}

.customTelemetryTagsControl {
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
}

.customTelemetryTagsConfigure {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.customTelemetryTagsModalTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.customTelemetryTagsModalDescription {
	margin-top: var(--spacing--3xs);
}

.customTelemetryTagsModal {
	margin-top: var(--spacing--sm);
}

.customTelemetryTagsLabels {
	display: flex;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--3xs);
}

.customTelemetryTagsRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
}

.customTelemetryTagsField {
	flex: 1;
	min-width: 0;
}

.customTelemetryTagsDeleteSpacer {
	width: var(--height--sm);
	flex-shrink: 0;
}

.customTelemetryTagsAdd {
	margin-top: var(--spacing--5xs);
}

.customTelemetryTagsError {
	margin-top: var(--spacing--2xs);
}
</style>
