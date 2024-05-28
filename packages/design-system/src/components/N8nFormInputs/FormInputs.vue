<template>
	<ResizeObserver :breakpoints="[{ bp: 'md', width: 500 }]">
		<template #default="{ bp }">
			<div :class="bp === 'md' || columnView ? $style.grid : $style.gridMulti">
				<div
					v-for="(input, index) in filteredInputs"
					:key="input.name"
					:class="{ [`mt-${verticalSpacing}`]: verticalSpacing && index > 0 }"
				>
					<n8n-text
						v-if="input.properties.type === 'info'"
						color="text-base"
						tag="div"
						:size="input.properties.labelSize"
						:align="input.properties.labelAlignment"
						class="form-text"
					>
						{{ input.properties.label }}
					</n8n-text>
					<N8nFormInput
						v-else
						v-bind="input.properties"
						:name="input.name"
						:label="input.properties.label || ''"
						:model-value="values[input.name]"
						:data-test-id="input.name"
						:show-validation-warnings="showValidationWarnings"
						:teleported="teleported"
						:tag-size="tagSize"
						@update:model-value="(value) => onUpdateModelValue(input.name, value)"
						@validate="(value) => onValidate(input.name, value)"
						@enter="onSubmit"
					/>
				</div>
			</div>
		</template>
	</ResizeObserver>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import N8nFormInput from '../N8nFormInput';
import type { IFormInput, Validatable } from '../../types';
import ResizeObserver from '../ResizeObserver';
import type { EventBus } from '../../utils';
import { createEventBus } from '../../utils';

export default defineComponent({
	name: 'N8nFormInputs',
	components: {
		N8nFormInput,
		ResizeObserver,
	},
	props: {
		inputs: {
			type: Array as PropType<IFormInput[]>,
			default: (): IFormInput[] => [],
		},
		eventBus: {
			type: Object as PropType<EventBus>,
			default: (): EventBus => createEventBus(),
		},
		columnView: {
			type: Boolean,
			default: false,
		},
		verticalSpacing: {
			type: String,
			default: '',
			validator: (value: string): boolean => ['', 'xs', 's', 'm', 'm', 'l', 'xl'].includes(value),
		},
		teleported: {
			type: Boolean,
			default: true,
		},
		tagSize: {
			type: String as PropType<'small' | 'medium'>,
			default: 'small',
			validator: (value: string): boolean => ['small', 'medium'].includes(value),
		},
	},
	data() {
		return {
			showValidationWarnings: false,
			values: {} as { [key: string]: Validatable },
			validity: {} as { [key: string]: boolean },
		};
	},
	computed: {
		filteredInputs(): IFormInput[] {
			return this.inputs.filter((input) =>
				typeof input.shouldDisplay === 'function' ? input.shouldDisplay(this.values) : true,
			);
		},
		isReadyToSubmit(): boolean {
			for (const key in this.validity) {
				if (!this.validity[key]) {
					return false;
				}
			}

			return true;
		},
	},
	watch: {
		isReadyToSubmit(ready: boolean) {
			this.$emit('ready', ready);
		},
	},
	mounted() {
		this.inputs.forEach((input) => {
			if (input.hasOwnProperty('initialValue')) {
				this.values = {
					...this.values,
					[input.name]: input.initialValue,
				};
			}
		});

		if (this.eventBus) {
			this.eventBus.on('submit', () => this.onSubmit());
		}
	},
	methods: {
		onUpdateModelValue(name: string, value: unknown) {
			this.values = {
				...this.values,
				[name]: value,
			};
			this.$emit('update', { name, value });
			this.$emit('update:modelValue', this.values);
		},
		onValidate(name: string, valid: boolean) {
			this.validity = {
				...this.validity,
				[name]: valid,
			};
		},
		onSubmit() {
			this.showValidationWarnings = true;

			if (this.isReadyToSubmit) {
				const toSubmit = this.filteredInputs.reduce(
					(accu, input) => {
						if (this.values[input.name]) {
							accu[input.name] = this.values[input.name];
						}
						return accu;
					},
					{} as { [key: string]: Validatable },
				);
				this.$emit('submit', toSubmit);
			}
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
