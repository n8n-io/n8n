<template>
	<ResizeObserver
		:breakpoints="[{bp: 'md', width: 500}]"
	>
		<template v-slot="{ bp }">
			<div :class="bp === 'md' || columnView? $style.grid : $style.gridMulti">
				<div
					v-for="(input) in filteredInputs"
					:key="input.name"
				>
					<n8n-text color="text-base" v-if="input.properties.type === 'info'" tag="div" align="center">
						{{input.properties.label}}
					</n8n-text>
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
		</template>
	</ResizeObserver>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nFormInput from '../N8nFormInput';
import { IFormInputs } from '../../Interface';
import ResizeObserver from '../ResizeObserver';

export default Vue.extend({
	name: 'n8n-form-inputs',
	components: {
		N8nFormInput,
		ResizeObserver,
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
			values: {} as {[key: string]: any},
			validity: {} as {[key: string]: boolean},
		};
	},
	mounted() {
		(this.inputs as IFormInputs).forEach((input: IFormInput) => {
			if (input.hasOwnProperty('initialValue')) {
				Vue.set(this.values, input.name, input.initialValue);
			}
		});

		if (this.eventBus) {
			this.eventBus.$on('submit', this.onSubmit);
		}
	},
	computed: {
		filteredInputs(): IFormInput[] {
			return this.inputs.filter((input: IFormInput) => typeof input.shouldDisplay === 'function'? input.shouldDisplay(this.values): true);
		},
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
		onInput(name: string, value: any) {
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
				const toSubmit = this.filteredInputs.reduce((accu, input: IFormInput) => {
					if (this.values[input.name]) {
						accu[input.name] = this.values[input.name];
					}
					return accu;
				}, {});
				this.$emit('submit', toSubmit);
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
.grid {
	display: grid;
	grid-row-gap: var(--spacing-s);
	grid-column-gap: var(--spacing-2xs);
}

.gridMulti {
	composes: grid;
	grid-template-columns: repeat(2, 1fr);
}

</style>
