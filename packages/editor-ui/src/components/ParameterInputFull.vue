<template>
	<n8n-input-label
		:label="hideLabel ? '' : $locale.nodeText().inputLabelDisplayName(parameter, path)"
		:tooltipText="hideLabel ? '' : $locale.nodeText().inputLabelDescription(parameter, path)"
		:showTooltip="focused"
		:showOptions="menuExpanded || focused || forceShowExpression"
		:bold="false"
		:size="label.size"
		color="text-dark"
	>
		<template #options>
			<parameter-options
				:parameter="parameter"
				:value="value"
				:isReadOnly="isReadOnly"
				:showOptions="displayOptions"
				:showExpressionSelector="showExpressionSelector"
				@optionSelected="optionSelected"
				@menu-expanded="onMenuExpanded"
			/>
		</template>
		<template>
			<draggable-target
				type="mapping"
				:disabled="isDropDisabled"
				:sticky="true"
				:stickyOffset="isValueExpression ? [26, 3] : [3, 3]"
				@drop="onDrop"
			>
				<template #default="{ droppable, activeDrop }">
					<n8n-tooltip
						placement="left"
						:manual="true"
						:value="showMappingTooltip"
						:buttons="dataMappingTooltipButtons"
					>
						<template #content>
							<span
								v-html="
									$locale.baseText(`dataMapping.${displayMode}Hint`, {
										interpolate: { name: parameter.displayName },
									})
								"
							/>
						</template>
						<parameter-input-wrapper
							ref="param"
							:parameter="parameter"
							:value="value"
							:path="path"
							:isReadOnly="isReadOnly"
							:droppable="droppable"
							:activeDrop="activeDrop"
							:forceShowExpression="forceShowExpression"
							:hint="hint"
							:hide-issues="hideIssues"
							@valueChanged="valueChanged"
							@textInput="onTextInput"
							@focus="onFocus"
							@blur="onBlur"
							@drop="onDrop"
							inputSize="small"
						/>
					</n8n-tooltip>
				</template>
			</draggable-target>
		</template>
	</n8n-input-label>
</template>

<script lang="ts">
import type { PropType } from 'vue';

import type { IN8nButton, INodeUi, IRunDataDisplayMode, IUpdateInformation } from '@/Interface';

import ParameterOptions from '@/components/ParameterOptions.vue';
import DraggableTarget from '@/components/DraggableTarget.vue';
import mixins from 'vue-typed-mixins';
import { useToast } from '@/composables';
import {
	hasExpressionMapping,
	isResourceLocatorValue,
	hasOnlyListMode,
	isValueExpression,
} from '@/utils';
import ParameterInputWrapper from '@/components/ParameterInputWrapper.vue';
import type {
	INodeParameters,
	INodeProperties,
	INodePropertyMode,
	IParameterLabel,
} from 'n8n-workflow';
import type { BaseTextKey } from '@/plugins/i18n';
import { mapStores } from 'pinia';
import { useNDVStore } from '@/stores/ndv.store';
import { useSegment } from '@/stores/segment.store';
import { externalHooks } from '@/mixins/externalHooks';
import { getMappedResult } from '@/utils/mappingUtils';

type ParamterInputWrapperRef = InstanceType<typeof ParameterInputWrapper>;

const DISPLAY_MODES_WITH_DATA_MAPPING = ['table', 'json', 'schema'];

export default mixins(externalHooks).extend({
	name: 'parameter-input-full',
	components: {
		ParameterOptions,
		DraggableTarget,
		ParameterInputWrapper,
	},
	setup() {
		return {
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
	props: {
		displayOptions: {
			type: Boolean,
			default: false,
		},
		isReadOnly: {
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
			type: [Number, String, Boolean, Array, Object] as PropType<INodeParameters>,
		},
		label: {
			type: Object as PropType<IParameterLabel>,
			default: () => ({
				size: 'small',
			}),
		},
	},
	created() {
		const mappingTooltipDismissHandler = this.onMappingTooltipDismissed.bind(this);
		this.dataMappingTooltipButtons = [
			{
				attrs: {
					label: this.$locale.baseText('_reusableBaseText.dismiss' as BaseTextKey),
					'data-test-id': 'dismiss-mapping-tooltip',
				},
				listeners: {
					click: mappingTooltipDismissHandler,
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
			return this.$locale.nodeText().hint(this.parameter, this.path);
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
			const paramRef = this.$refs.param as ParamterInputWrapperRef | undefined;
			paramRef?.$emit('optionSelected', command);
		},
		valueChanged(parameterData: IUpdateInformation) {
			this.$emit('valueChanged', parameterData);
		},
		onTextInput(parameterData: IUpdateInformation) {
			const paramRef = this.$refs.param as ParamterInputWrapperRef | undefined;

			if (isValueExpression(this.parameter, parameterData.value)) {
				paramRef?.$emit('optionSelected', 'addExpression');
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

					this.$emit('valueChanged', parameterData);

					if (!this.ndvStore.isMappingOnboarded) {
						this.showMessage({
							title: this.$locale.baseText('dataMapping.success.title'),
							message: this.$locale.baseText('dataMapping.success.moreInfo'),
							type: 'success',
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
