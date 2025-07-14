<script lang="ts" setup>
import type {
	FormFieldValue,
	IFormInput,
	FormFieldValueUpdate,
	FormValues,
} from '@n8n/design-system/types';

import { createFormEventBus } from '../../utils';
import N8nButton from '../N8nButton';
import N8nFormInputs from '../N8nFormInputs';
import N8nHeading from '../N8nHeading';
import N8nLink from '../N8nLink';

interface FormBoxProps {
	title?: string;
	inputs?: IFormInput[];
	buttonText?: string;
	buttonLoading?: boolean;
	secondaryButtonText?: string;
	redirectText?: string;
	redirectLink?: string;
}

defineOptions({ name: 'N8nFormBox' });
withDefaults(defineProps<FormBoxProps>(), {
	title: '',
	inputs: (): IFormInput[] => [],
	buttonLoading: false,
	redirectText: '',
	redirectLink: '',
});

const formBus = createFormEventBus();
const emit = defineEmits<{
	submit: [value: FormValues];
	update: [value: FormFieldValueUpdate];
	secondaryClick: [value: Event];
}>();

const onUpdateModelValue = (e: { name: string; value: FormFieldValue }) => emit('update', e);
const onSubmit = (e: { [key: string]: FormFieldValue }) => emit('submit', e);
const onButtonClick = () => formBus.emit('submit');
const onSecondaryButtonClick = (event: Event) => emit('secondaryClick', event);
</script>

<template>
	<div :class="['n8n-form-box', $style.container]">
		<div v-if="title" :class="$style.heading">
			<N8nHeading size="xlarge">
				{{ title }}
			</N8nHeading>
		</div>
		<div :class="$style.inputsContainer">
			<N8nFormInputs
				:inputs="inputs"
				:event-bus="formBus"
				:column-view="true"
				@update="onUpdateModelValue"
				@submit="onSubmit"
			/>
		</div>
		<div v-if="secondaryButtonText || buttonText" :class="$style.buttonsContainer">
			<span v-if="secondaryButtonText" :class="$style.secondaryButtonContainer">
				<N8nLink size="medium" theme="text" @click="onSecondaryButtonClick">
					{{ secondaryButtonText }}
				</N8nLink>
			</span>
			<N8nButton
				v-if="buttonText"
				:label="buttonText"
				:loading="buttonLoading"
				data-test-id="form-submit-button"
				size="large"
				@click="onButtonClick"
			/>
		</div>
		<div :class="$style.actionContainer">
			<N8nLink v-if="redirectText && redirectLink" :to="redirectLink">
				{{ redirectText }}
			</N8nLink>
		</div>
		<slot></slot>
	</div>
</template>

<style lang="scss" module>
.heading {
	display: flex;
	justify-content: center;
	margin-bottom: var(--spacing-xl);
}

.container {
	background-color: var(--color-background-xlight);
	padding: var(--spacing-l);
	border: var(--border-base);
	border-radius: var(--border-radius-large);
	box-shadow: 0px 4px 16px rgba(99, 77, 255, 0.06);
}

.inputsContainer {
	margin-bottom: var(--spacing-xl);
}

.actionContainer {
	display: flex;
	justify-content: center;
}

.buttonsContainer {
	composes: actionContainer;
	margin-bottom: var(--spacing-s);
}

.secondaryButtonContainer {
	flex-grow: 1;
	display: flex;
	align-items: center;
}

.withLabel {
	margin-bottom: var(--spacing-s);
}
</style>
