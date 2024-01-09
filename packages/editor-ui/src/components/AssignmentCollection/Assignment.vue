<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import InputTriple from '@/components/InputTriple/InputTriple.vue';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import { useI18n } from '@/composables/useI18n';
import type { AssignmentValue, INodeProperties, NodePropertyTypes } from 'n8n-workflow';
import { computed, ref } from 'vue';
import TypeSelect from './TypeSelect.vue';

interface Props {
	path: string;
	modelValue: AssignmentValue;
	issues: string[];
	hideType?: boolean;
	index?: number;
}

const props = defineProps<Props>();

const assignment = ref<AssignmentValue>(props.modelValue);

const emit = defineEmits<{
	(event: 'update:model-value', value: AssignmentValue): void;
	(event: 'remove'): void;
}>();

const i18n = useI18n();

const assignmentTypeToNodePropType = (type: string): NodePropertyTypes => {
	switch (type) {
		case 'array':
		case 'object':
		case 'boolean':
		case 'any':
			return 'string';
		default:
			return type as NodePropertyTypes;
	}
};

const nameParameter = computed<INodeProperties>(() => ({
	name: '',
	displayName: '',
	default: '',
	placeholder: 'name',
	type: 'string',
}));

const valueParameter = computed<INodeProperties>(() => ({
	name: '',
	displayName: '',
	default: '',
	placeholder: 'value',
	type: assignmentTypeToNodePropType((assignment.value.type as NodePropertyTypes) ?? 'string'),
}));

const onAssignmentNameChange = (update: IUpdateInformation): void => {
	assignment.value.name = update.value as string;
};

const onAssignmentTypeChange = (update: string): void => {
	assignment.value.type = update;
};

const onAssignmentValueChange = (update: IUpdateInformation): void => {
	assignment.value.value = update.value as string;
};

const onRemove = (): void => {
	emit('remove');
};

const onBlur = (): void => {
	emit('update:model-value', assignment.value);
};
</script>

<template>
	<div
		:class="{
			[$style.wrapper]: true,
			[$style.hasIssues]: issues.length > 0,
		}"
		data-test-id="assignment"
	>
		<n8n-icon-button
			type="tertiary"
			text
			size="mini"
			icon="trash"
			data-test-id="filter-remove-condition"
			:title="i18n.baseText('filter.removeCondition')"
			:class="$style.remove"
			@click="onRemove"
		></n8n-icon-button>
		<InputTriple>
			<template #left>
				<ParameterInputFull
					:key="nameParameter.type"
					display-options
					hide-label
					hide-hint
					is-single-line
					:parameter="nameParameter"
					:value="assignment.name"
					:path="`${path}.name`"
					data-test-id="assignment-name"
					@update="onAssignmentNameChange"
					@blur="onBlur"
				/>
			</template>
			<template v-if="!hideType" #middle>
				<TypeSelect
					:class="$style.select"
					:model-value="assignment.type ?? 'string'"
					@update:model-value="onAssignmentTypeChange"
				>
				</TypeSelect>
			</template>
			<template #right="{ breakpoint }">
				<ParameterInputFull
					:key="valueParameter.type"
					display-options
					hide-label
					hide-hint
					is-single-line
					:options-position="breakpoint === 'default' ? 'top' : 'bottom'"
					:parameter="valueParameter"
					:value="assignment.value"
					:path="`${path}.value`"
					data-test-id="assignment-value"
					@update="onAssignmentValueChange"
					@blur="onBlur"
				/>
			</template>
		</InputTriple>

		<div :class="$style.status">
			<ParameterIssues v-if="issues.length > 0" :issues="issues" />
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	display: flex;
	align-items: flex-end;
	gap: var(--spacing-4xs);

	&.hasIssues {
		--input-border-color: var(--color-danger);
	}

	&:hover {
		.remove {
			opacity: 1;
		}
	}
}

.remove {
	position: absolute;
	left: 0;
	top: var(--spacing-l);
	opacity: 0;
	transition: opacity 100ms ease-in;
}

.status {
	align-self: flex-start;
	padding-top: 28px;
}

.statusIcon {
	padding-left: var(--spacing-4xs);
}
</style>
