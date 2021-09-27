<template>
	<div
		:class="$style.container"
	>
		<div
			v-if="title"
			:class="$style.heading"
		>
			<n8n-heading
				size="xlarge"
			>
			{{title}}
			</n8n-heading>
		</div>
		<div
			:class="$style.inputsContainer"
		>
			<n8n-form-inputs
				:inputs="inputs"
				:eventBus="formBus"
				@input="onInput"
				@submit="onSubmit"
			/>
		</div>
		<div :class="$style.buttonContainer">
			<n8n-button
				v-if="buttonText"
				:label="buttonText"
				:loading="buttonLoading"
				size="large"
				@click="onButtonClick"
			/>
		</div>
		<div :class="$style.actionContainer">
			<n8n-link
				v-if="redirectText && redirectLink"
				:to="redirectLink"
			>
				{{redirectText}}
			</n8n-link>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nFormInputs from '../N8nFormInputs';
import N8nHeading from '../N8nHeading';
import N8nLink from '../N8nLink';

export default Vue.extend({
	name: 'n8n-form-box',
	components: {
		N8nHeading,
		N8nFormInputs,
		N8nLink,
	},
	props: {
		title: {
			type: String,
		},
		inputs: {
			type: Array,
			default() {
				return [];
			},
		},
		buttonText: {
			type: String,
		},
		buttonLoading: {
			type: Boolean,
			default: false,
		},
		redirectText: {
			type: String,
		},
		redirectLink: {
			type: String,
		},
	},
	data() {
		return {
			formBus: new Vue(),
		};
	},
	methods: {
		onInput(e: {name: string, value: string}) {
			this.$emit('input', e);
		},
		onSubmit(e: {[key: string]: string}) {
			this.$emit('submit', e);
		},
		onButtonClick() {
			this.formBus.$emit('submit');
		},
	},
});
</script>

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

.buttonContainer {
	composes: actionContainer;
	margin-bottom: var(--spacing-s);
}

.withLabel {
	margin-bottom: var(--spacing-s);
}
</style>
