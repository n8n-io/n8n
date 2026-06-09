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
	N8nInputLabel,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { ICustomTelemetryTag } from 'n8n-workflow';
import { ElCol, ElRow } from 'element-plus';

const OPEN_TELEMETRY_DOCS_URL = 'https://docs.n8n.io/hosting/logging-monitoring/opentelemetry/';

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
		if (!trimmedKey) return i18n.baseText('workflowSettings.customSpanAttributes.error.emptyKey');
		if (seen.has(trimmedKey)) {
			return i18n.baseText('workflowSettings.customSpanAttributes.error.duplicateKey');
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
const configuredTagsCount = computed(() => tags.value.length);
const hasConfiguredTags = computed(() => configuredTagsCount.value > 0);
const configuredTagsCountLabel = computed(() =>
	i18n.baseText('workflowSettings.customSpanAttributes.configuredCount' as BaseTextKey, {
		adjustToNumber: configuredTagsCount.value,
		interpolate: { count: configuredTagsCount.value },
	}),
);
const configureButtonAriaLabel = computed(() => {
	const label = `${i18n.baseText('workflowSettings.customSpanAttributes.configure')} ${i18n
		.baseText('workflowSettings.customSpanAttributes.displayName')
		.toLowerCase()}`;

	return hasConfiguredTags.value
		? `${label}, ${configuredTagsCountLabel.value.toLowerCase()}`
		: label;
});

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
	draft.value = draft.value.filter((_, tagIndex) => tagIndex !== index);
};

const openModal = () => {
	draft.value = cloneTags(tags.value);
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
					{{ i18n.baseText('workflowSettings.customSpanAttributes.displayName') }}
					<N8nTooltip placement="top">
						<template #content>
							{{ i18n.baseText('workflowSettings.customSpanAttributes.description') }}
						</template>
						<N8nIcon icon="circle-help" />
					</N8nTooltip>
				</label>
			</ElCol>
			<ElCol :span="14" :class="$style.customTelemetryTagsControl">
				<div :class="$style.customTelemetryTagsSummary">
					<N8nButton
						variant="subtle"
						size="large"
						native-type="button"
						:class="$style.customTelemetryTagsConfigure"
						:aria-label="configureButtonAriaLabel"
						data-test-id="workflow-settings-custom-telemetry-tags-configure"
						@click="openModal"
					>
						{{ i18n.baseText('workflowSettings.customSpanAttributes.configure') }}
					</N8nButton>
					<span
						v-if="hasConfiguredTags"
						:class="$style.customTelemetryTagsCount"
						data-test-id="workflow-settings-custom-telemetry-tags-count"
					>
						{{ configuredTagsCountLabel }}
					</span>
				</div>
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
						{{ i18n.baseText('workflowSettings.customSpanAttributes.modal.title') }}
					</N8nDialogTitle>
				</div>
				<N8nDialogDescription :class="$style.customTelemetryTagsModalDescription">
					{{ i18n.baseText('workflowSettings.customSpanAttributes.description') }}
					{{ ' ' }}
					{{ i18n.baseText('workflowSettings.customSpanAttributes.modal.learnMore') }}
					{{ ' ' }}
					<a
						:class="$style.customTelemetryTagsDocsLink"
						:href="OPEN_TELEMETRY_DOCS_URL"
						target="_blank"
					>
						{{ i18n.baseText('workflowSettings.customSpanAttributes.modal.documentation') }}
						<N8nIcon icon="arrow-up-right" size="xsmall" />
					</a>
				</N8nDialogDescription>
			</N8nDialogHeader>
			<div
				:class="$style.customTelemetryTagsModal"
				data-test-id="workflow-settings-custom-telemetry-tags-modal"
			>
				<div
					v-for="(tag, index) in draft"
					:key="index"
					:class="$style.customTelemetryTagsRow"
					data-test-id="workflow-settings-custom-telemetry-tags-row"
				>
					<N8nInputLabel
						:class="$style.customTelemetryTagsField"
						:label="
							index === 0
								? i18n.baseText('workflowSettings.customSpanAttributes.tag.key.displayName')
								: undefined
						"
						size="small"
						:input-name="`workflow-custom-telemetry-tag-key-${index}`"
					>
						<N8nInput
							:id="`workflow-custom-telemetry-tag-key-${index}`"
							:model-value="tag.key"
							size="medium"
							:disabled="areControlsDisabled"
							:placeholder="
								i18n.baseText('workflowSettings.customSpanAttributes.tag.key.placeholder')
							"
							:aria-label="
								i18n.baseText('workflowSettings.customSpanAttributes.tag.key.displayName')
							"
							data-test-id="workflow-settings-custom-telemetry-tags-key"
							@update:model-value="updateDraftTag(index, 'key', String($event))"
						/>
					</N8nInputLabel>
					<N8nInputLabel
						:class="$style.customTelemetryTagsField"
						:label="
							index === 0
								? i18n.baseText('workflowSettings.customSpanAttributes.tag.value.displayName')
								: undefined
						"
						size="small"
						:input-name="`workflow-custom-telemetry-tag-value-${index}`"
					>
						<N8nInput
							:id="`workflow-custom-telemetry-tag-value-${index}`"
							:model-value="tag.value"
							size="medium"
							:disabled="areControlsDisabled"
							:placeholder="
								i18n.baseText('workflowSettings.customSpanAttributes.tag.value.placeholder')
							"
							:aria-label="
								i18n.baseText('workflowSettings.customSpanAttributes.tag.value.displayName')
							"
							data-test-id="workflow-settings-custom-telemetry-tags-value"
							@update:model-value="updateDraftTag(index, 'value', String($event))"
						/>
					</N8nInputLabel>
					<N8nIconButton
						icon="trash-2"
						variant="ghost"
						size="small"
						:disabled="areControlsDisabled"
						:title="i18n.baseText('workflowSettings.customSpanAttributes.delete')"
						:aria-label="i18n.baseText('workflowSettings.customSpanAttributes.delete')"
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
					{{ i18n.baseText('workflowSettings.customSpanAttributes.placeholder') }}
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
	align-items: flex-start;
}

.customTelemetryTagsSummary {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.customTelemetryTagsCount {
	color: inherit;
	font-family: var(--font-family);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
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

.customTelemetryTagsDocsLink {
	color: inherit;
	text-decoration: underline;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);

	&:hover {
		color: var(--color--primary);
	}
}

.customTelemetryTagsModal {
	margin-top: var(--spacing--sm);
}

.customTelemetryTagsRow {
	display: flex;
	align-items: flex-end;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
}

.customTelemetryTagsField {
	flex: 1;
	min-width: 0;
}

.customTelemetryTagsAdd {
	margin-top: var(--spacing--5xs);
}

.customTelemetryTagsError {
	margin-top: var(--spacing--2xs);
}
</style>
