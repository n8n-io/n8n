<template>
	<fragment>
		<div
			:class="columnView ? $style.columnView : $style.container"
			v-for="(row, i) in inputs"
			:key="i"
			>
			<div
				v-for="(input, j) in row"
				:key="input.name"
				:class="columns > 1 && !columnView && j < columns - 1? $style.multiContainer : $style.inputContainer"
			>
				<n8n-form-input
					v-bind="input.properties"
					:value="values[input.name]"
					:showValidationWarnings="showValidationWarnings"
					@input="(value) => onInput(input.name, value)"
					@validate="(value) => onValidate(input.name, value)"
					@enter="onSubmit"
				/>
			</div>
		</div>
	</fragment>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nFormInput from '../N8nFormInput';

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
		this.inputs.forEach((row: any) => {
			row.forEach((input: any) => {
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
.container {
	display: flex;
	width: 100%;
}

.columnView {
	composes: container;
	flex-direction: column;
}

.inputContainer {
	flex-grow: 1;
	margin-bottom: var(--spacing-s);
}

.multiContainer {
	composes: inputContainer;
	max-width: 50%;
	padding-right: var(--spacing-2xs);
}

</style>
