<template>
	<n8n-input-label
		:label="$locale.credText().inputLabelDisplayName(parameter)"
		:tooltip-text="$locale.credText().inputLabelDescription(parameter)"
		:required="parameter.required"
		:show-tooltip="focused"
		:show-options="menuExpanded"
		:data-test-id="parameter.name"
		:size="label.size"
	>
		<template #options>
			<ParameterOptions
				:parameter="parameter"
				:value="value"
				:is-read-only="false"
				:show-options="true"
				:is-value-expression="isValueExpression"
				@update:model-value="optionSelected"
				@menu-expanded="onMenuExpanded"
			/>
		</template>
		<ParameterInputWrapper
			ref="param"
			input-size="large"
			:parameter="parameter"
			:model-value="value"
			:path="parameter.name"
			:hide-issues="true"
			:documentation-url="documentationUrl"
			:error-highlight="showRequiredErrors"
			:is-for-credential="true"
			:event-source="eventSource"
			:hint="!showRequiredErrors && hint ? hint : ''"
			:event-bus="eventBus"
			@focus="onFocus"
			@blur="onBlur"
			@text-input="valueChanged"
			@update="valueChanged"
		/>
		<div v-if="showRequiredErrors" :class="$style.errors">
			<n8n-text color="danger" size="small">
				{{ $locale.baseText('parameterInputExpanded.thisFieldIsRequired') }}
				<n8n-link
					v-if="documentationUrl"
					:to="documentationUrl"
					size="small"
					:underline="true"
					@click="onDocumentationUrlClick"
				>
					{{ $locale.baseText('parameterInputExpanded.openDocs') }}
				</n8n-link>
			</n8n-text>
		</div>
	</n8n-input-label>
</template>

<script lang="ts">
import type { IUpdateInformation } from '@/Interface';
import ParameterOptions from './ParameterOptions.vue';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import ParameterInputWrapper from './ParameterInputWrapper.vue';
import { isValueExpression } from '@/utils/nodeTypesUtils';
import type {
	INodeParameterResourceLocator,
	INodeProperties,
	IParameterLabel,
	NodeParameterValueType,
} from 'n8n-workflow';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createEventBus } from 'n8n-design-system/utils';

export default defineComponent({
	name: 'ParameterInputExpanded',
	components: {
		ParameterOptions,
		ParameterInputWrapper,
	},
	props: {
		parameter: {
			type: Object as PropType<INodeProperties>,
			required: true,
		},
		value: {
			type: Object as PropType<NodeParameterValueType>,
		},
		showValidationWarnings: {
			type: Boolean,
		},
		documentationUrl: {
			type: String,
		},
		eventSource: {
			type: String,
		},
		label: {
			type: Object as PropType<IParameterLabel>,
			default: () => ({
				size: 'small',
			}),
		},
	},
	data() {
		return {
			focused: false,
			blurredEver: false,
			menuExpanded: false,
			eventBus: createEventBus(),
		};
	},
	computed: {
		...mapStores(useWorkflowsStore),
		showRequiredErrors(): boolean {
			if (!this.parameter.required) {
				return false;
			}

			if (this.blurredEver || this.showValidationWarnings) {
				if (this.parameter.type === 'string') {
					return !this.value;
				}

				if (this.parameter.type === 'number') {
					if (typeof this.value === 'string' && this.value.startsWith('=')) {
						return false;
					}

					return typeof this.value !== 'number';
				}
			}

			return false;
		},
		hint(): string | null {
			if (this.isValueExpression) {
				return null;
			}

			return this.$locale.credText().hint(this.parameter);
		},
		isValueExpression(): boolean {
			return isValueExpression(
				this.parameter,
				this.value as string | INodeParameterResourceLocator,
			);
		},
	},
	methods: {
		onFocus() {
			this.focused = true;
		},
		onBlur() {
			this.blurredEver = true;
			this.focused = false;
		},
		onMenuExpanded(expanded: boolean) {
			this.menuExpanded = expanded;
		},
		optionSelected(command: string) {
			this.eventBus.emit('optionSelected', command);
		},
		valueChanged(parameterData: IUpdateInformation) {
			this.$emit('update', parameterData);
		},
		onDocumentationUrlClick(): void {
			this.$telemetry.track('User clicked credential modal docs link', {
				docs_link: this.documentationUrl,
				source: 'field',
				workflow_id: this.workflowsStore.workflowId,
			});
		},
	},
});
</script>

<style lang="scss" module>
.errors {
	margin-top: var(--spacing-2xs);
}
.hint {
	margin-top: var(--spacing-4xs);
}
</style>
