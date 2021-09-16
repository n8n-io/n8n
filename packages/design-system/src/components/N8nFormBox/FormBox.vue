<template>
	<div
		:class="$style.container"
	>
		<div
			v-if="title"
			:class="$style.heading"
		>
			<n8n-text
				:text="title"
				type="heading"
				size="large"
			/>
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
				:loading="buttonLoading"
				size="large"
				@click="onSubmit"
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
import N8nText from '../N8nText';

export default Vue.extend({
	name: 'N8nFormBox',
	components: {
		N8nText,
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
		isReadyToSubmit(): boolean {
			for (let i = 0; i < this.inputs.length; i++) {
				const input = this.inputs[i] as {name: string, type: string, required: boolean};
				if (input.required && input.type !== 'boolean' && !this.values[input.name]) {
					return false;
				}
			}

			return true;
		},
		onSubmit() {
			this.showValidationWarnings = true;
			if (this.isReadyToSubmit()) {
				this.$emit('submit', this.values);
			}
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
