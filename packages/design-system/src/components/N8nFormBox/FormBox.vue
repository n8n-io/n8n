<template>
	<div
		:class="$style.container"
	>
		<div
			v-if="title"
			:class="$style.heading"
		>
			<n8n-text
				type="heading"
				size="xlarge"
			>
			{{title}}
			</n8n-text>
		</div>
		<div
			:class="$style.inputsContainer"
		>
			<div
				v-for="input in inputs"
				:key="input.name"
				:class="input.label ? $style.withLabel : ''"
			>
				<n8n-form-input
					v-bind="input"
					:value="values[input.name]"
					:showValidationWarnings="showValidationWarnings"
					@input="(value) => onInput(input.name, value)"
					@validate="(value) => onValidate(input.name, value)"
					@enter="onSubmit"
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
				:class="$style.redirectLink"
				:href="redirectLink"
			>
				<span>{{redirectText}}</span>
			</a>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nFormInput from '../N8nFormInput';
import N8nText from '../N8nText';

export default Vue.extend({
	name: 'n8n-form-box',
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
			validity: {} as {[key: string]: boolean},
		};
	},
	methods: {
		onInput(name: string, value: string) {
			this.values = {
				...this.values,
				[name]: value,
			};
			this.$emit('input', {name, value});
		},
		isReadyToSubmit(): boolean {
			for (let key in this.validity) {
				if (!this.validity[key]) {
					return false;
				}
			}

			return true;
		},
		onValidate(name: string, valid: boolean) {
			this.validity[name] = valid;
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
		margin-bottom: var(--spacing-2xs);
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

.withLabel {
margin-bottom: var(--spacing-s);
}
</style>
