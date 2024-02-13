<template>
	<n8n-input-label
		:class="$style.wrapper"
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
				@update:modelValue="optionSelected"
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
				<n8n-tooltip
					placement="left"
					:visible="showMappingTooltip"
					:buttons="dataMappingTooltipButtons"
				>
					<template #content>
						<span
							v-html="
								i18n.baseText(`dataMapping.${displayMode}Hint`, {
									interpolate: { name: parameter.displayName },
								})
							"
						/>
					</template>
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
						@textInput="onTextInput"
						@focus="onFocus"
						@blur="onBlur"
						@drop="onDrop"
					/>
				</n8n-tooltip>
			</template>
		</DraggableTarget>
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
				@update:modelValue="optionSelected"
				@menu-expanded="onMenuExpanded"
			/>
		</div>
	</n8n-input-label>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';

import type { IN8nButton, INodeUi, IRunDataDisplayMode, IUpdateInformation } from '@/Interface';

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
import type { BaseTextKey } from '@/plugins/i18n';
import { useNDVStore } from '@/stores/ndv.store';
import { useSegment } from '@/stores/segment.store';
import { getMappedResult } from '@/utils/mappingUtils';
import { createEventBus } from 'n8n-design-system/utils';

const DISPLAY_MODES_WITH_DATA_MAPPING = ['table', 'json', 'schema'];

export default defineComponent({
	name: 'ParameterInputFull',
	components: {
		ParameterOptions,
		DraggableTarget,
		ParameterInputWrapper,
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
		},
		path: {
			type: String,
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
			dataMappingTooltipButtons: [] as IN8nButton[],
			mappingTooltipEnabled: false,
		};
	},
	mounted() {
		const mappingTooltipDismissHandler = this.onMappingTooltipDismissed.bind(this);
		this.dataMappingTooltipButtons = [
			{
				attrs: {
					label: this.i18n.baseText('_reusableBaseText.dismiss' as BaseTextKey),
					'data-test-id': 'dismiss-mapping-tooltip',
				},
				listeners: {
					onClick: mappingTooltipDismissHandler,
				},
			},
		];
	},
	computed: {
		...mapStores(useNDVStore),
		node(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
		hint(): string | null {
			return this.i18n.nodeText().hint(this.parameter, this.path);
		},
		isInputTypeString(): boolean {
			return this.parameter.type === 'string';
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
			return this.ndvStore.isDNVDataEmpty('input');
		},
		displayMode(): IRunDataDisplayMode {
			return this.ndvStore.inputPanelDisplayMode;
		},
		showMappingTooltip(): boolean {
			return (
				this.mappingTooltipEnabled &&
				!this.ndvStore.isMappingOnboarded &&
				this.focused &&
				this.isInputTypeString &&
				!this.isInputDataEmpty &&
				DISPLAY_MODES_WITH_DATA_MAPPING.includes(this.displayMode)
			);
		},
	},
	methods: {
		onFocus() {
			this.focused = true;
			setTimeout(() => {
				this.mappingTooltipEnabled = true;
			}, 500);
			if (!this.parameter.noDataExpression) {
				this.ndvStore.setMappableNDVInputFocus(this.parameter.displayName);
			}
		},
		onBlur() {
			this.focused = false;
			this.mappingTooltipEnabled = false;
			if (!this.parameter.noDataExpression) {
				this.ndvStore.setMappableNDVInputFocus('');
			}
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
			const updatedValue = getMappedResult(this.parameter, newParamValue, this.value);
			const prevValue = this.isResourceLocator ? this.value.value : this.value;

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

					if (!this.ndvStore.isMappingOnboarded) {
						this.showMessage({
							title: this.i18n.baseText('dataMapping.success.title'),
							message: this.i18n.baseText('dataMapping.success.moreInfo'),
							type: 'success',
							dangerouslyUseHTMLString: true,
						});

						this.ndvStore.disableMappingHint();
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
		onMappingTooltipDismissed() {
			this.ndvStore.disableMappingHint(false);
		},
	},
	watch: {
		showMappingTooltip(newValue: boolean) {
			if (!newValue) {
				this.$telemetry.track('User viewed data mapping tooltip', { type: 'param focus' });
			}
		},
	},
});
</script>

<style module>
.wrapper {
	position: relative;

	&:hover {
		.options {
			opacity: 1;
		}
	}
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
