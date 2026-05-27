<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ICustomTelemetryTag, INodeParameters, INodeProperties } from 'n8n-workflow';
import { ElCol, ElRow } from 'element-plus';
import type { IUpdateInformation } from '@/Interface';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import {
	customTelemetryTagsFromFixedCollection,
	customTelemetryTagsToFixedCollection,
	setValue,
} from '@/features/ndv/shared/ndv.utils';

type Props = {
	modelValue?: ICustomTelemetryTag[];
	isReadOnly: boolean;
};

type Emits = {
	'update:modelValue': [tags: ICustomTelemetryTag[]];
	'validity-change': [hasErrors: boolean];
};

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const i18n = useI18n();
const showModal = ref(false);
const draft = ref<ICustomTelemetryTag[]>([]);

const tags = computed(() => props.modelValue ?? []);

const parameters = computed<INodeProperties[]>(() => [
	{
		displayName: i18n.baseText('workflowSettings.customTelemetryTags.displayName'),
		name: 'customTelemetryTags',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			fixedCollection: {
				layout: 'inline',
			},
		},
		placeholder: i18n.baseText('workflowSettings.customTelemetryTags.placeholder'),
		default: {},
		description: i18n.baseText('workflowSettings.customTelemetryTags.description'),
		isNodeSetting: true,
		options: [
			{
				name: 'tag',
				displayName: i18n.baseText('workflowSettings.customTelemetryTags.tag.displayName'),
				values: [
					{
						displayName: i18n.baseText('workflowSettings.customTelemetryTags.tag.key.displayName'),
						name: 'key',
						type: 'string',
						default: '',
						noDataExpression: true,
						isNodeSetting: true,
					},
					{
						displayName: i18n.baseText(
							'workflowSettings.customTelemetryTags.tag.value.displayName',
						),
						name: 'value',
						type: 'string',
						default: '',
						noDataExpression: true,
						isNodeSetting: true,
					},
				],
			},
		],
	},
]);

const draftNodeValues = computed<INodeParameters>(() => ({
	customTelemetryTags: customTelemetryTagsToFixedCollection(draft.value),
}));

const cloneTags = (tagsToClone: ICustomTelemetryTag[] = []) =>
	tagsToClone.map((tag) => ({ ...tag }));

const getTagErrors = (tagsToValidate: ICustomTelemetryTag[]) => {
	const seen = new Set<string>();
	return tagsToValidate.map((tag) => {
		const trimmedKey = tag.key.trim();
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

const updateTags = (parameterData: IUpdateInformation) => {
	const nodeValues = ref<INodeParameters>({
		customTelemetryTags: customTelemetryTagsToFixedCollection(draft.value),
	});
	const value = parameterData.value === undefined ? null : parameterData.value;

	setValue(nodeValues, parameterData.name, value);

	draft.value = customTelemetryTagsFromFixedCollection(nodeValues.value.customTelemetryTags);
};

const openModal = () => {
	draft.value = cloneTags(tags.value);
	showModal.value = true;
};

const cancelModal = () => {
	draft.value = cloneTags(tags.value);
	showModal.value = false;
};

const saveModal = () => {
	if (hasDraftErrors.value) return;
	emit('update:modelValue', cloneTags(draft.value));
	showModal.value = false;
};

const onModalOpenChange = (open: boolean) => {
	if (open) {
		openModal();
		return;
	}

	cancelModal();
};
</script>

<template>
	<div :class="$style.wrapper">
		<ElRow :class="$style.customTelemetryTags" data-test-id="workflow-settings-custom-telemetry-tags">
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
				<N8nDialogTitle>
					{{ i18n.baseText('workflowSettings.customTelemetryTags.modal.title') }}
				</N8nDialogTitle>
			</N8nDialogHeader>
			<div
				:class="$style.customTelemetryTagsModal"
				data-test-id="workflow-settings-custom-telemetry-tags-modal"
			>
				<ParameterInputList
					hide-delete
					:parameters="parameters"
					:node-values="draftNodeValues"
					:is-read-only="isReadOnly"
					@value-changed="updateTags"
				/>
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
					data-test-id="workflow-settings-custom-telemetry-tags-cancel"
					@click="cancelModal"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					:disabled="isReadOnly || hasDraftErrors"
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

.customTelemetryTagsModal {
	margin-top: var(--spacing--sm);

	:global(.multi-parameter) {
		margin: 0;
	}
}

.customTelemetryTagsError {
	margin-top: var(--spacing--2xs);
}
</style>
