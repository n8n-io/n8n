<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import InputTriple from '@/components/InputTriple/InputTriple.vue';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import ParameterInputHint from '@/components/ParameterInputHint.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import { useResolvedExpression } from '@/composables/useResolvedExpression';
import useEnvironmentsStore from '@/features/environments.ee/environments.store';
import { useNDVStore } from '@/stores/ndv.store';
import type { AssignmentValue, INodeProperties } from 'n8n-workflow';
import { computed, ref } from 'vue';
import TypeSelect from './TypeSelect.vue';
import { useI18n } from '@n8n/i18n';
import { BINARY_DATA_ACCESS_TOOLTIP } from '@/constants';

import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
interface Props {
	path: string;
	modelValue: AssignmentValue;
	issues: string[];
	hideType?: boolean;
	disableType?: boolean;
	isReadOnly?: boolean;
	index?: number;
}

const props = defineProps<Props>();

const assignment = ref<AssignmentValue>(props.modelValue);
const valueInputHovered = ref(false);

const emit = defineEmits<{
	'update:model-value': [value: AssignmentValue];
	remove: [];
}>();

const i18n = useI18n();
const ndvStore = useNDVStore();
const environmentsStore = useEnvironmentsStore();

const assignmentTypeToNodeProperty = (
	type: string,
): Partial<INodeProperties> & Pick<INodeProperties, 'type'> => {
	switch (type) {
		case 'boolean':
			return {
				type: 'options',
				default: false,
				options: [
					{ name: 'false', value: false },
					{ name: 'true', value: true },
				],
			};
		case 'array':
		case 'object':
		case 'binary':
			return { type: 'string' };
		case 'any':
			return { type: 'string' };
		default:
			return { type } as INodeProperties;
	}
};

const nameParameter = computed<INodeProperties>(() => ({
	name: 'name',
	displayName: 'Name',
	default: '',
	requiresDataPath: 'single',
	placeholder: 'name',
	type: 'string',
}));

const valueParameter = computed<INodeProperties>(() => {
	const placeholder =
		assignment.value.type === 'binary'
			? i18n.baseText('assignment.binaryData.placeholder')
			: 'value';
	return {
		name: 'value',
		displayName: 'Value',
		default: '',
		placeholder,
		...assignmentTypeToNodeProperty(assignment.value.type ?? 'string'),
	};
});

const value = computed(() => assignment.value.value);

const resolvedAdditionalExpressionData = computed(() => {
	return { $vars: environmentsStore.variablesAsObject };
});

const { resolvedExpressionString, isExpression } = useResolvedExpression({
	expression: value,
	additionalData: resolvedAdditionalExpressionData,
});

const hint = computed(() => resolvedExpressionString.value);

const highlightHint = computed(() => Boolean(hint.value && ndvStore.getHoveringItem));

const onAssignmentNameChange = (update: IUpdateInformation): void => {
	assignment.value.name = update.value as string;
};

const onAssignmentTypeChange = (update: string): void => {
	assignment.value.type = update;

	if (update === 'boolean' && !isExpression.value) {
		assignment.value.value = false;
	}
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

const onValueInputHoverChange = (hovered: boolean): void => {
	valueInputHovered.value = hovered;
};
</script>

<template>
	<div
		:class="{
			[$style.wrapper]: true,
			[$style.hasIssues]: issues.length > 0,
			[$style.hasHint]: !!hint,
		}"
		data-test-id="assignment"
	>
		<N8nIconButton
			v-if="!isReadOnly"
			type="tertiary"
			text
			size="small"
			icon="grip-vertical"
			:class="[$style.iconButton, $style.defaultTopPadding, 'drag-handle']"
		/>
		<N8nIconButton
			v-if="!isReadOnly"
			type="tertiary"
			text
			size="small"
			icon="trash-2"
			data-test-id="assignment-remove"
			:class="[$style.iconButton, $style.extraTopPadding]"
			@click="onRemove"
		/>

		<div :class="$style.inputs">
			<InputTriple middle-width="100px">
				<template #left>
					<ParameterInputFull
						:key="nameParameter.type"
						display-options
						hide-label
						hide-hint
						:is-read-only="isReadOnly"
						:parameter="nameParameter"
						:value="assignment.name"
						:path="`${path}.name`"
						data-test-id="assignment-name"
						@update="onAssignmentNameChange"
						@blur="onBlur"
					/>
				</template>
				<template v-if="!hideType" #middle>
					<N8nTooltip placement="left" :disabled="assignment.type !== 'binary'">
						<template #content>
							{{ BINARY_DATA_ACCESS_TOOLTIP }}
						</template>
						<TypeSelect
							:class="$style.select"
							:model-value="assignment.type ?? 'string'"
							:is-read-only="disableType || isReadOnly"
							@update:model-value="onAssignmentTypeChange"
						>
						</TypeSelect>
					</N8nTooltip>
				</template>
				<template #right="{ breakpoint }">
					<div :class="$style.value">
						<ParameterInputFull
							:key="valueParameter.type"
							display-options
							hide-label
							hide-issues
							hide-hint
							is-assignment
							:is-read-only="isReadOnly"
							:options-position="breakpoint === 'default' ? 'top' : 'bottom'"
							:parameter="valueParameter"
							:value="assignment.value"
							:path="`${path}.value`"
							data-test-id="assignment-value"
							@update="onAssignmentValueChange"
							@blur="onBlur"
							@hover="onValueInputHoverChange"
						/>
						<ParameterInputHint
							v-if="resolvedExpressionString"
							data-test-id="parameter-expression-preview-value"
							:class="{
								[$style.hint]: true,
								[$style.optionsPadding]:
									breakpoint !== 'default' && !isReadOnly && valueInputHovered,
							}"
							:highlight="highlightHint"
							:hint="hint"
							single-line
						/>
					</div>
				</template>
			</InputTriple>
		</div>

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
	gap: var(--spacing--4xs);

	&.hasIssues {
		--input-border-color: var(--color--danger);
	}

	&.hasHint {
		padding-bottom: var(--spacing--sm);
	}

	&:hover {
		.iconButton {
			opacity: 1;
		}
	}
}

.inputs {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	min-width: 0;

	> div {
		flex-grow: 1;
	}
}

.value {
	position: relative;

	.hint {
		position: absolute;
		bottom: calc(var(--spacing--sm) * -1);
		left: 0;
		right: 0;
		font-family: monospace;
	}

	.optionsPadding {
		width: calc(100% - 140px);
	}
}

.iconButton {
	position: absolute;
	left: 0;
	opacity: 0;
	transition: opacity 100ms ease-in;
	color: var(--icon-base-color);
}
.extraTopPadding {
	top: calc(20px + var(--spacing--lg));
}

.defaultTopPadding {
	top: var(--spacing--lg);
}

.status {
	align-self: flex-start;
	padding-top: 28px;
}

.statusIcon {
	padding-left: var(--spacing--4xs);
}
</style>
