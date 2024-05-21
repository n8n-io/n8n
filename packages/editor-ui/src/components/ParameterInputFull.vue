<template>
	<n8n-input-label
		:class="[$style.wrapper, { [$style.tipVisible]: showDragnDropTip }]"
		:label="hideLabel ? '' : i18n.nodeText().inputLabelDisplayName(parameter, path)"
		:tooltip-text="hideLabel ? '' : i18n.nodeText().inputLabelDescription(parameter, path)"
		:show-tooltip="focused"
		:show-options="menuExpanded || focused || forceShowExpression"
		:options-position="optionsPosition"
		:bold="false"
		:size="label.size"
		color="text-dark"
	>
		<template v-if="displayOptions && optionsPosition === 'top'" #options>
			<ParameterOptions
				:parameter="parameter"
				:value="value"
				:is-read-only="isReadOnly"
				:show-options="displayOptions"
				:show-expression-selector="showExpressionSelector"
				@update:model-value="optionSelected"
				@menu-expanded="onMenuExpanded"
			/>
		</template>
		<DraggableTarget
			type="mapping"
			:disabled="isDropDisabled"
			:sticky="true"
			:sticky-offset="isValueExpression ? [26, 3] : [3, 3]"
			@drop="onDrop"
		>
			<template #default="{ droppable, activeDrop }">
				<ParameterInputWrapper
					ref="param"
					:parameter="parameter"
					:model-value="value"
					:path="path"
					:is-read-only="isReadOnly"
					:is-assignment="isAssignment"
					:rows="rows"
					:droppable="droppable"
					:active-drop="activeDrop"
					:force-show-expression="forceShowExpression"
					:hint="hint"
					:hide-hint="hideHint"
					:hide-issues="hideIssues"
					:label="label"
					:event-bus="eventBus"
					input-size="small"
					@update="valueChanged"
					@text-input="onTextInput"
					@focus="onFocus"
					@blur="onBlur"
					@drop="onDrop"
				/>
			</template>
		</DraggableTarget>
		<div v-if="showDragnDropTip" :class="$style.tip">
			<InlineExpressionTip />
		</div>
		<div
			:class="{
				[$style.options]: true,
				[$style.visible]: menuExpanded || focused || forceShowExpression,
			}"
		>
			<ParameterOptions
				v-if="optionsPosition === 'bottom'"
				:parameter="parameter"
				:value="value"
				:is-read-only="isReadOnly"
				:show-options="displayOptions"
				:show-expression-selector="showExpressionSelector"
				@update:model-value="optionSelected"
				@menu-expanded="onMenuExpanded"
			/>
		</div>
	</n8n-input-label>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';

import type { INodeUi, IRunDataDisplayMode, IUpdateInformation } from '@/Interface';

import ParameterOptions from '@/components/ParameterOptions.vue';
import DraggableTarget from '@/components/DraggableTarget.vue';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { hasExpressionMapping, hasOnlyListMode, isValueExpression } from '@/utils/nodeTypesUtils';
import { isResourceLocatorValue } from '@/utils/typeGuards';
import ParameterInputWrapper from '@/components/ParameterInputWrapper.vue';
import type {
	INodeProperties,
	INodePropertyMode,
	IParameterLabel,
	NodeParameterValueType,
} from 'n8n-workflow';
import { useNDVStore } from '@/stores/ndv.store';
import { useSegment } from '@/stores/segment.store';
import { getMappedResult } from '@/utils/mappingUtils';
import { createEventBus } from 'n8n-design-system/utils';
import InlineExpressionTip from './InlineExpressionEditor/InlineExpressionTip.vue';

export default defineComponent({
	name: 'ParameterInputFull',
	components: {
		ParameterOptions,
		DraggableTarget,
		ParameterInputWrapper,
		InlineExpressionTip,
	},
	props: {
		displayOptions: {
			type: Boolean,
			default: false,
		},
		optionsPosition: {
			type: String as PropType<'bottom' | 'top'>,
			default: 'top',
		},
		hideHint: {
			type: Boolean,
			default: false,
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		rows: {
			type: Number,
			default: 5,
		},
		isAssignment: {
			type: Boolean,
			default: false,
		},
		hideLabel: {
			type: Boolean,
			default: false,
		},
		hideIssues: {
			type: Boolean,
			default: false,
		},
		parameter: {
			type: Object as PropType<INodeProperties>,
			required: true,
		},
		path: {
			type: String,
			required: true,
		},
		value: {
			type: [Number, String, Boolean, Array, Object] as PropType<NodeParameterValueType>,
		},
		label: {
			type: Object as PropType<IParameterLabel>,
			default: () => ({
				size: 'small',
			}),
		},
		entryIndex: {
			type: Number,
			default: undefined,
		},
	},
	setup() {
		const eventBus = createEventBus();
		const i18n = useI18n();

		return {
			i18n,
			eventBus,
			...useToast(),
		};
	},
	data() {
		return {
			focused: false,
			menuExpanded: false,
			forceShowExpression: false,
		};
	},
	computed: {
		...mapStores(useNDVStore),
		node(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
		hint(): string {
			return this.i18n.nodeText().hint(this.parameter, this.path);
		},
		isInputTypeString(): boolean {
			return this.parameter.type === 'string';
		},
		isInputTypeNumber(): boolean {
			return this.parameter.type === 'number';
		},
		isResourceLocator(): boolean {
			return this.parameter.type === 'resourceLocator';
		},
		isDropDisabled(): boolean {
			return this.parameter.noDataExpression || this.isReadOnly || this.isResourceLocator;
		},
		isValueExpression(): boolean {
			return isValueExpression(this.parameter, this.value);
		},
		showExpressionSelector(): boolean {
			return this.isResourceLocator ? !hasOnlyListMode(this.parameter) : true;
		},
		isInputDataEmpty(): boolean {
			return this.ndvStore.isNDVDataEmpty('input');
		},
		displayMode(): IRunDataDisplayMode {
			return this.ndvStore.inputPanelDisplayMode;
		},
		showDragnDropTip(): boolean {
			return (
				this.focused &&
				(this.isInputTypeString || this.isInputTypeNumber) &&
				!this.isValueExpression &&
				!this.isDropDisabled &&
				(!this.ndvStore.hasInputData || !this.isInputDataEmpty) &&
				!this.ndvStore.isMappingOnboarded &&
				this.ndvStore.isInputParentOfActiveNode
			);
		},
	},
	methods: {
		onFocus() {
			this.focused = true;
			if (!this.parameter.noDataExpression) {
				this.ndvStore.setMappableNDVInputFocus(this.parameter.displayName);
			}
			this.ndvStore.setFocusedInputPath(this.path ?? '');
		},
		onBlur() {
			this.focused = false;
			if (
				!this.parameter.noDataExpression &&
				this.ndvStore.focusedMappableInput === this.parameter.displayName
			) {
				this.ndvStore.setMappableNDVInputFocus('');
			}
			this.ndvStore.setFocusedInputPath('');
			this.$emit('blur');
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
		onTextInput(parameterData: IUpdateInformation) {
			if (isValueExpression(this.parameter, parameterData.value)) {
				this.eventBus.emit('optionSelected', 'addExpression');
			}
		},
		onDrop(newParamValue: string) {
			const value = this.value;
			const updatedValue = getMappedResult(this.parameter, newParamValue, value);
			const prevValue =
				this.isResourceLocator && isResourceLocatorValue(value) ? value.value : value;

			if (updatedValue.startsWith('=')) {
				this.forceShowExpression = true;
			}
			setTimeout(() => {
				if (this.node) {
					let parameterData;
					if (this.isResourceLocator) {
						if (!isResourceLocatorValue(this.value)) {
							parameterData = {
								node: this.node.name,
								name: this.path,
								value: { __rl: true, value: updatedValue, mode: '' },
							};
						} else if (
							this.value.mode === 'list' &&
							this.parameter.modes &&
							this.parameter.modes.length > 1
						) {
							let mode =
								this.parameter.modes.find((mode: INodePropertyMode) => mode.name === 'id') || null;
							if (!mode) {
								mode = this.parameter.modes.filter(
									(mode: INodePropertyMode) => mode.name !== 'list',
								)[0];
							}

							parameterData = {
								node: this.node.name,
								name: this.path,
								value: { __rl: true, value: updatedValue, mode: mode ? mode.name : '' },
							};
						} else {
							parameterData = {
								node: this.node.name,
								name: this.path,
								value: { __rl: true, value: updatedValue, mode: this.value.mode },
							};
						}
					} else {
						parameterData = {
							node: this.node.name,
							name: this.path,
							value: updatedValue,
						};
					}

					this.valueChanged(parameterData);
					this.eventBus.emit('drop', updatedValue);

					if (!this.ndvStore.isMappingOnboarded) {
						this.showMessage({
							title: this.i18n.baseText('dataMapping.success.title'),
							message: this.i18n.baseText('dataMapping.success.moreInfo'),
							type: 'success',
							dangerouslyUseHTMLString: true,
						});

						this.ndvStore.setMappingOnboarded();
					}

					this.ndvStore.setMappingTelemetry({
						dest_node_type: this.node.type,
						dest_parameter: this.path,
						dest_parameter_mode:
							typeof prevValue === 'string' && prevValue.startsWith('=') ? 'expression' : 'fixed',
						dest_parameter_empty: prevValue === '' || prevValue === undefined,
						dest_parameter_had_mapping:
							typeof prevValue === 'string' &&
							prevValue.startsWith('=') &&
							hasExpressionMapping(prevValue),
						success: true,
					});

					const segment = useSegment();
					segment.track(segment.EVENTS.MAPPED_DATA);
				}
				this.forceShowExpression = false;
			}, 200);
		},
	},
});
</script>

<style lang="scss" module>
.wrapper {
	position: relative;

	&:hover {
		.options {
			opacity: 1;
		}
	}
}

.tipVisible {
	--input-border-bottom-left-radius: 0;
	--input-border-bottom-right-radius: 0;
}

.tip {
	position: absolute;
	z-index: 2;
	top: 100%;
	background: var(--color-code-background);
	border: var(--border-base);
	border-top: none;
	width: 100%;
	box-shadow: 0 2px 6px 0 rgba(#441c17, 0.1);
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;
}

.options {
	position: absolute;
	bottom: -22px;
	right: 0;
	z-index: 1;
	opacity: 0;
	transition: opacity 100ms ease-in;

	&.visible {
		opacity: 1;
	}
}
</style>
