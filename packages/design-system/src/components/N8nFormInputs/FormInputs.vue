<template>
	<fragment>
		<el-row
			:class="$style.container"
			v-for="(row, i) in inputs"
			:key="i"
			>
			<el-col
				v-for="input in row"
				:key="input.name"
				:sm="input.sm"
				:offset="input.offset"
				:class="$style.inputContainer"
			>
				<n8n-form-input
					v-bind="input.properties"
					:value="values[input.name]"
					:showValidationWarnings="showValidationWarnings"
					@input="(value) => onInput(input.name, value)"
					@validate="(value) => onValidate(input.name, value)"
					@enter="onSubmit"
				/>
			</el-col>
		</el-row>
	</fragment>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nFormInput from '../N8nFormInput';

import ElRow from 'element-ui/lib/row';
import ElCol from 'element-ui/lib/col';

export default Vue.extend({
	name: 'n8n-form-inputs',
	components: {
		N8nFormInput,
		ElRow,
		ElCol,
	},
	props: {
		inputs: {
			type: Array,
			default() {
				return [[]];
			},
		},
	},
	data() {
		return {
			showValidationWarnings: false,
			values: {} as {[key: string]: string},
			validity: {} as {[key: string]: boolean},
			multiColumn: false,
		};
	},
	mounted() {
		this.inputs.forEach((row: any) => {
			row.forEach((input: any) => {
				if (input.hasOwnProperty('initialValue')) {
					Vue.set(this.values, input.name, input.initialValue);
				}
			});
		});
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
.inputContainer {
	margin-bottom: var(--spacing-s);
}

.multiInputContianer {
	composes: inputContainer;
	padding-right: var(--spacing-2xs);
}
</style>
