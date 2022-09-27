<template>
	<n8n-input-label
		:label="hideLabel? '': $locale.nodeText().inputLabelDisplayName(parameter, path)"
		:tooltipText="hideLabel? '': $locale.nodeText().inputLabelDescription(parameter, path)"
		:showTooltip="focused"
		:showOptions="menuExpanded || focused || forceShowExpression"
		:bold="false"
		size="small"
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
				:stickyOffset="4"
				@drop="onDrop"
			>
				<template v-slot="{ droppable, activeDrop }">
					<parameter-input
						ref="param"
						:parameter="parameter"
						:value="value"
						:displayOptions="displayOptions"
						:path="path"
						:isReadOnly="isReadOnly"
						:droppable="droppable"
						:activeDrop="activeDrop"
						:forceShowExpression="forceShowExpression"
						@valueChanged="valueChanged"
						@focus="onFocus"
						@blur="onBlur"
						@drop="onDrop"
						inputSize="small" />
				</template>
			</draggable-target>
			<input-hint :class="$style.hint" :hint="$locale.nodeText().hint(parameter, path)" />
		</template>
	</n8n-input-label>
</template>

<script lang="ts">
import Vue from 'vue';

import {
	INodeUi,
	IUpdateInformation,
} from '@/Interface';

import ParameterInput from '@/components/ParameterInput.vue';
import InputHint from './ParameterInputHint.vue';
import ParameterOptions from './ParameterOptions.vue';
import DraggableTarget from '@/components/DraggableTarget.vue';
import mixins from 'vue-typed-mixins';
import { showMessage } from './mixins/showMessage';
import { LOCAL_STORAGE_MAPPING_FLAG } from '@/constants';
import { hasExpressionMapping } from './helpers';
import { hasOnlyListMode } from './ResourceLocator/helpers';
import { INodePropertyMode } from 'n8n-workflow';
import { isResourceLocatorValue } from '@/typeGuards';

export default mixins(
	showMessage,
)
	.extend({
		name: 'parameter-input-full',
		components: {
			ParameterInput,
			InputHint,
			ParameterOptions,
			DraggableTarget,
		},
		data() {
			return {
				focused: false,
				menuExpanded: false,
				forceShowExpression: false,
			};
		},
		props: [
			'displayOptions',
			'isReadOnly',
			'parameter',
			'path',
			'value',
			'hideLabel',
		],
		computed: {
			node (): INodeUi | null {
				return this.$store.getters.activeNode;
			},
			isResourceLocator (): boolean {
				return  this.parameter.type === 'resourceLocator';
			},
			isDropDisabled (): boolean {
				return this.parameter.noDataExpression || this.isReadOnly || this.isResourceLocator;
			},
			showExpressionSelector (): boolean {
				return this.isResourceLocator ? !hasOnlyListMode(this.parameter): true;
			},
		},
		methods: {
			onFocus() {
				this.focused = true;
				if (!this.parameter.noDataExpression) {
					this.$store.commit('ui/setMappableNDVInputFocus', this.parameter.displayName);
				}
			},
			onBlur() {
				this.focused = false;
				if (!this.parameter.noDataExpression) {
					this.$store.commit('ui/setMappableNDVInputFocus', '');
				}
			},
			onMenuExpanded(expanded: boolean) {
				this.menuExpanded = expanded;
			},
			optionSelected (command: string) {
				if (this.$refs.param) {
					(this.$refs.param as Vue).$emit('optionSelected', command);
				}
			},
			valueChanged (parameterData: IUpdateInformation) {
				this.$emit('valueChanged', parameterData);
			},
			onDrop(data: string) {
				this.forceShowExpression = true;
				setTimeout(() => {
					if (this.node) {
						const prevValue = this.isResourceLocator ? this.value.value : this.value;
						let updatedValue: string;
						if (typeof prevValue === 'string' && prevValue.startsWith('=') && prevValue.length > 1) {
							updatedValue = `${prevValue} ${data}`;
						}
						else {
							updatedValue = `=${data}`;
						}


						let parameterData;
						if (this.isResourceLocator) {
							if (!isResourceLocatorValue(this.value)) {
								parameterData = {
									node: this.node.name,
									name: this.path,
									value: { __rl: true, value: updatedValue, mode: '' },
								};
							}
							else if (this.value.mode === 'list' && this.parameter.modes && this.parameter.modes.length > 1) {
								let mode = this.parameter.modes.find((mode: INodePropertyMode) => mode.name === 'id') || null;
								if (!mode) {
									mode = this.parameter.modes.filter((mode: INodePropertyMode) => mode.name !== 'list')[0];
								}

								parameterData = {
									node: this.node.name,
									name: this.path,
									value: { __rl: true, value: updatedValue, mode: mode ? mode.name : '' },
								};
							}
							else {
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

						if (window.localStorage.getItem(LOCAL_STORAGE_MAPPING_FLAG) !== 'true') {
							this.$showMessage({
								title: this.$locale.baseText('dataMapping.success.title'),
								message: this.$locale.baseText('dataMapping.success.moreInfo'),
								type: 'success',
							});

							window.localStorage.setItem(LOCAL_STORAGE_MAPPING_FLAG, 'true');
						}

						this.$store.commit('ui/setMappingTelemetry', {
							dest_node_type: this.node.type,
							dest_parameter: this.path,
							dest_parameter_mode: typeof prevValue === 'string' && prevValue.startsWith('=')? 'expression': 'fixed',
							dest_parameter_empty: prevValue === '' || prevValue === undefined,
							dest_parameter_had_mapping: typeof prevValue === 'string' && prevValue.startsWith('=') && hasExpressionMapping(prevValue),
							success: true,
						});
					}
					this.forceShowExpression = false;
				}, 200);
			},
		},
	});
</script>

<style lang="scss" module>
	.hint {
		margin-top: var(--spacing-4xs);
	}
</style>
