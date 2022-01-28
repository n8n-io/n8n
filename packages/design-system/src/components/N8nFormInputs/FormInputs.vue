<template>
	<div>
		<div
			:class="columnView ? $style.columnView : $style.container"
			v-for="(row, i) in inputs"
			:key="i"
			>
			<div
				v-for="(input, j) in row"
				:key="input.name"
				:class="columns > 1 && !columnView && j < columns - 1? $style.multiContainer : (input.properties.type === 'text' ? $style.textContainer : $style.inputContainer)"
			>
				<div :class="$style.center"  v-if="input.properties.type === 'text'">
					<n8n-text color="text-base">
						{{input.properties.label}}
					</n8n-text>
				</div>
				<n8n-form-input
					v-else
					v-bind="input.properties"
					:value="values[input.name]"
					:showValidationWarnings="showValidationWarnings"
					@input="(value) => onInput(input.name, value)"
					@validate="(value) => onValidate(input.name, value)"
					@enter="onSubmit"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nFormInput from '../N8nFormInput';
import { IFormInputs } from '../../Interface';

export default Vue.extend({
	name: 'n8n-form-inputs',
	components: {
		N8nFormInput,
	},
	props: {
		inputs: {
			type: Array,
			default() {
				return [[]];
			},
		},
		eventBus: {
			type: Vue,
		},
		columnView: {
			type: Boolean,
		},
		showErrorsOnSubmit: {
			type: Boolean,
		},
	},
	data() {
		return {
			showValidationWarnings: false,
			values: {} as {[key: string]: string},
			validity: {} as {[key: string]: boolean},
			columns: 1,
		};
	},
	mounted() {
		(this.inputs as IFormInputs).forEach((row: IFormInputsRow) => {
			row.forEach((input: IFormInputsCol) => {
				if (input.hasOwnProperty('initialValue')) {
					Vue.set(this.values, input.name, input.initialValue);
				}

				if (row.length > this.columns) {
					this.columns = row.length;
				}
			});
		});

		if (this.eventBus) {
			this.eventBus.$on('submit', this.onSubmit);
		}
	},
	computed: {
		isReadyToSubmit(): boolean {
			for (let key in this.validity) {
				if (!this.validity[key]) {
					return false;
				}
			}

			return true;
		},
	},
	methods: {
		onInput(name: string, value: string) {
			this.values = {
				...this.values,
				[name]: value,
			};
			this.$emit('input', {name, value});
		},
		onValidate(name: string, valid: boolean) {
			Vue.set(this.validity, name, valid);
		},
		onSubmit() {
			this.showValidationWarnings = true;
			if (this.isReadyToSubmit) {
				this.$emit('submit', this.values);
			}
		},
	},
	watch: {
		isReadyToSubmit(ready: boolean) {
			this.$emit('ready', ready);
		},
	},
});
</script>

<style lang="scss" module>
.container {
	display: flex;
	width: 100%;

	@media (max-width: 768px) { // todo remove media query
		flex-direction: column;
	}
}

.columnView {
	composes: container;
	flex-direction: column;
}

.inputContainer {
	flex-grow: 1;
	margin-bottom: var(--spacing-s);
}

.textContainer {
	flex-grow: 1;
	margin-bottom: var(--spacing-4xs);
}

.center {
	text-align: center; // todo add tag prop to text
}

.multiContainer {
	composes: inputContainer;
	max-width: 50%;
	padding-right: var(--spacing-2xs);

	@media (max-width: 768px) { // todo remove media query if possible
		max-width: 100%;
		padding-right: 0;
	}
}

</style>
