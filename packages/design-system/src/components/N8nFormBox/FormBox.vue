<template>
	<div
		:class="$style.container"
	>
		<div
			v-if="title"
			:class="$style.heading"
		>
			{{ title }}
		</div>
		<div
			:class="$style.inputsContainer"
		>
			<div
				v-for="input in inputs"
				:key="input.name"
			>
				<n8n-form-input
					v-bind="input"
					:value="values[input.name]"
					:showValidationWarnings="showValidationWarnings"
					@input="(value) => onInput(input.name, value)"
				/>
			</div>
		</div>
		<div :class="$style.buttonContainer">
			<n8n-button
				v-if="buttonText"
				:label="buttonText"
				size="large"
				@click="onAction"
			/>
		</div>
		<div :class="$style.actionContainer">
			<a
				v-if="redirectText && redirectLink"
				:href="redirectLink"
			>
				{{redirectText}}
			</a>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nFormInput from '../N8nFormInput';

export default Vue.extend({
	name: 'FormBox',
	components: {
		N8nFormInput,
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
		redirectText: {
			type: String,
		},
		redirectLink: {
			type: String,
		},
	},
	data() {
		return {
			showValidationWarnings: false,
			values: {} as {[key: string]: string},
		};
	},
	methods: {
		onInput(name: string, value: string) {
			this.values = {
				...this.values,
				[name]: value,
			};
		},
		onAction() {
			this.showValidationWarnings = true;
			this.$emit('action', this.values);
		},
	},
});
</script>

<style lang="scss" module>
@use "~/theme/src/common/typography.scss";

.heading {
	composes: heading2;
	display: flex;
	justify-content: center;
}

.container {
	background-color: var(--color-background-xlight);
	padding: var(--spacing-l);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
}

.inputsContainer {
	margin-bottom: var(--spacing-xl);
	> * {
		margin-bottom: var(--spacing-s);
	}
}

.actionContainer {
	display: flex;
	justify-content: center;
}

.buttonContainer {
	composes: actionContainer;
	margin-bottom: var(--spacing-s);
}
</style>
