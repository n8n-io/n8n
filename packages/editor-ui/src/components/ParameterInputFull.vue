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
				@optionSelected="optionSelected"
				@menu-expanded="onMenuExpanded"
			/>
		</template>
		<template>
			<div
				:class="{
					[$style['resource-locator']]: isResourceLocatorParameter,
					[$style['multiple-modes']]: hasMultipleModes,
				}"
			>
				<div
					v-if="hasMultipleModes"
					:class="$style['mode-selector']"
				>
					<n8n-select
						v-model="selectedMode"
						size="small"
						@change="onModeSelected"
						filterable
					>
						<n8n-option
							v-for="mode in parameter.modes"
							:key="mode.name"
							:label="$locale.baseText(getModeLabel(mode.name)) || mode.displayName"
							:value="mode.name">
						</n8n-option>
					</n8n-select>
				</div>
				<div
					:class="{ [$style['input-container']]: true }"
				>
					<DraggableTarget type="mapping" :disabled="parameter.noDataExpression || isReadOnly" :sticky="true" :stickyOffset="4" @drop="onDrop">
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
								:currentMode="currentMode"
								@valueChanged="valueChanged"
								@focus="onFocus"
								@blur="onBlur"
								inputSize="small" />
						</template>
					</DraggableTarget>
				</div>
			</div>
			<input-hint :class="$style.hint" :hint="$locale.nodeText().hint(parameter, path)" />
		</template>
		<n8n-text v-if="parameter.type === 'resourceLocator' && infoText" size="small">{{ infoText }}</n8n-text>
	</n8n-input-label>
</template>

<script lang="ts">
import Vue from 'vue';

import {
	INodeUi,
	IUpdateInformation,
} from '@/Interface';
import { INodePropertyMode } from 'n8n-workflow';

import ParameterInput from '@/components/ParameterInput.vue';
import InputHint from './ParameterInputHint.vue';
import ParameterOptions from './ParameterOptions.vue';
import DraggableTarget from '@/components/DraggableTarget.vue';
import mixins from 'vue-typed-mixins';
import { showMessage } from './mixins/showMessage';
import { LOCAL_STORAGE_MAPPING_FLAG } from '@/constants';
import { hasExpressionMapping } from './helpers';
import { getParameterModeLabel } from './ResourceLocator/helpers';

export default mixins(
	showMessage,
)
	.extend({
		name: 'ParameterInputFull',
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
				selectedMode: '',
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
		mounted() {
			if (this.parameter.modes) {
				// List mode is selected by default if it's available
				const listMode = this.parameter.modes.find((mode : INodePropertyMode) => mode.name === 'list');
				this.selectedMode = listMode ? listMode.name : this.parameter.modes[0].name;
			}
		},
		computed: {
			node (): INodeUi | null {
				return this.$store.getters.activeNode;
			},
			isResourceLocatorParameter (): boolean {
				return this.parameter.type === 'resourceLocator';
			},
			infoText (): string {
				return this.currentMode.hint ?  this.currentMode.hint : this.parameter.description || '';
			},
			currentMode (): INodePropertyMode {
				return this.findModeByName(this.selectedMode) || {} as INodePropertyMode;
			},
			hasMultipleModes (): boolean {
				return this.parameter.modes && this.parameter.modes.length > 1;
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
						const prevValue = this.value;
						let updatedValue: string;
						if (typeof prevValue === 'string' && prevValue.startsWith('=') && prevValue.length > 1) {
							updatedValue = `${prevValue} ${data}`;
						}
						else {
							updatedValue = `=${data}`;
						}

						const parameterData = {
							node: this.node.name,
							name: this.path,
							value: updatedValue,
						};

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
			onModeSelected (value: string): void {
				this.selectedMode = value;
			},
			findModeByName (name: string): INodePropertyMode | null {
				if (this.parameter.modes) {
					return this.parameter.modes.find((mode: INodePropertyMode) => mode.name === name) || null;
				}
				return null;
			},
			getModeLabel (name: string): string | null {
				return getParameterModeLabel(name);
			},
		},
	});
</script>

<style lang="scss" module>
	.hint {
		margin-top: var(--spacing-4xs);
	}

	.resource-locator {
		display: flex;

		.input-container {
			width: 100%;
			input {
				border-radius: 0 var(--border-radius-base) var(--border-radius-base) 0;
			}
		}

		&.multiple-modes {
			.input-container {
				flex-basis: calc(100% - 100px);
				flex-grow: 1;
			}
		}

	}

	.mode-selector {
		flex-basis: 100px;

		input {
			border-radius: var(--border-radius-base) 0 0 var(--border-radius-base);
			border-right: none;
			overflow: hidden;
			text-overflow: ellipsis;

			&:focus {
				border-right: var(--color-secondary) var(--border-style-base) var(--border-width-base);
			}
		}
	}
</style>
