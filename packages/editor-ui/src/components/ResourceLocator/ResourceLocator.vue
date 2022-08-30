<template>
	<ResourceLocatorDropdown
		:show="showResourceDropdown"
		:selected="tempValue"
		:filterable="!!currentMode.search"
		:resources="currentResources"
		:loading="loadingResources"
		:filter="searchFilter"
		@hide="onDropdownHide"
		@selected="onListItemSelected"
		@filter="onSearchFilter"
	>
		<div
			:class="{
				['resource-locator']: true,
				[$style['resource-locator']]: true,
				[$style['multiple-modes']]: hasMultipleModes,
			}"
		>
			<div v-if="hasMultipleModes" :class="$style['mode-selector']">
				<n8n-select
					v-model="selectedMode"
					filterable
					:size="inputSize"
					:disabled="isReadOnly"
					@change="onModeSelected"
				>
					<n8n-option
						v-for="mode in parameter.modes"
						:key="mode.name"
						:label="$locale.baseText(getModeLabel(mode.name)) || mode.displayName"
						:value="mode.name"
						:disabled="isValueExpression && mode.name === 'list'"
						:title="
							isValueExpression && mode.name === 'list'
								? $locale.baseText('resourceLocator.modeSelector.listMode.disabled.title')
								: ''
						"
					>
					</n8n-option>
				</n8n-select>
			</div>

			<div :class="$style['input-container']">
				<DraggableTarget
					type="mapping"
					:disabled="hasOnlyListMode"
					:sticky="true"
					:stickyOffset="4"
					@drop="onDrop"
				>
					<template v-slot="{ droppable, activeDrop }">
						<div
							:class="{
								...inputClasses,
								[$style['droppable']]: droppable,
								[$style['activeDrop']]: activeDrop,
							}"
						>
							<n8n-input
								v-if="isValueExpression || droppable || forceShowExpression"
								type="text"
								:size="inputSize"
								:value="activeDrop || forceShowExpression ? '' : expressionDisplayValue"
								:title="displayTitle"
								@keydown.stop
							/>
							<n8n-input
								v-else
								v-model="tempValue"
								:class="{
									['droppable']: droppable,
									['activeDrop']: activeDrop,
								}"
								:size="inputSize"
								:value="displayValue"
								:disabled="isReadOnly"
								:readonly="selectedMode === 'list'"
								:title="displayTitle"
								:placeholder="currentMode.placeholder ? currentMode.placeholder : ''"
								type="text"
								@change="onInputChange"
								@keydown.stop
								@focus="onInputFocus"
								@blur="onInputBlur"
							>
								<div
									v-if="currentMode.name === 'list'"
									slot="suffix"
									:class="$style['list-mode-icon-container']"
								>
									<i
										:class="{
											['el-input__icon']: true,
											['el-icon-arrow-down']: true,
											[$style['select-icon']]: true,
											[$style['is-reverse']]: showResourceDropdown,
										}"
									></i>
								</div>
							</n8n-input>
						</div>
					</template>
				</DraggableTarget>
				<parameter-issues v-if="resourceIssues" :issues="resourceIssues" />
			</div>

			<parameter-input-hint v-if="infoText" class="mt-4xs" :hint="infoText" />
		</div>
	</ResourceLocatorDropdown>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';

import { INode, INodeProperties, INodePropertyMode, IResourceLocatorResult } from 'n8n-workflow';
import {
	getParameterModeLabel,
	hasOnlyListMode,
	validateResourceLocatorParameter,
} from './helpers';

import DraggableTarget from '@/components/DraggableTarget.vue';
import ExpressionEdit from '@/components/ExpressionEdit.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import ParameterInputHint from '@/components/ParameterInputHint.vue';
import ResourceLocatorDropdown from './ResourceLocatorDropdown.vue';
import Vue, { PropType } from 'vue';
import { IResourceLocatorReqParams, IResourceLocatorResponse } from '@/Interface';
import { debounceHelper } from '../mixins/debounce';

export default mixins(debounceHelper).extend({
	name: 'ResourceLocator',
	components: {
		DraggableTarget,
		ExpressionEdit,
		ParameterIssues,
		ParameterInputHint,
		ResourceLocatorDropdown,
	},
	props: {
		parameter: {
			type: Object as () => INodeProperties,
			required: true,
		},
		value: {
			type: String,
			default: '',
		},
		mode: {
			type: String,
			default: '',
		},
		inputSize: {
			type: String,
			default: 'small',
			validator: (size) => {
				return ['mini', 'small', 'medium', 'large', 'xlarge'].includes(size);
			},
		},
		parameterIssues: {
			type: Array as PropType<string[]>,
			default() {
				return [];
			},
		},
		displayValue: {
			type: String,
			default: '',
		},
		displayTitle: {
			type: String,
			default: '',
		},
		expressionDisplayValue: {
			type: String,
			default: '',
		},
		parameterInputClasses: {
			type: Object,
			default() {
				return {};
			},
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		forceShowExpression: {
			type: Boolean,
			default: false,
		},
		isValueExpression: {
			type: Boolean,
			default: false,
		},
		expressionEditDialogVisible: {
			type: Boolean,
			default: false,
		},
		node: {
			type: Object as PropType<INode>,
		},
		path: {
			type: String,
		},
	},
	data() {
		return {
			selectedMode: '',
			tempValue: '',
			resourceIssues: [] as string[],
			loadingResources: false,
			errorLoadingResources: false,
			showResourceDropdown: false,
			searchFilter: '',
			cachedResponses: {} as {[key: string]: {results: IResourceLocatorResult[], nextPageToken: string | number | null}},
		};
	},
	computed: {
		inputPlaceholder(): string {
			return this.currentMode.placeholder ? this.currentMode.placeholder : '';
		},
		infoText(): string {
			return this.currentMode.hint ? this.currentMode.hint : this.parameter.description || '';
		},
		currentMode(): INodePropertyMode {
			return this.findModeByName(this.selectedMode) || ({} as INodePropertyMode);
		},
		hasMultipleModes(): boolean {
			return this.parameter.modes && this.parameter.modes.length > 1 ? true : false;
		},
		hasOnlyListMode(): boolean {
			return hasOnlyListMode(this.parameter);
		},
		inputClasses(): { [c: string]: boolean } {
			const classes = {
				...this.parameterInputClasses,
				[this.$style['list-mode-input-container']]: this.selectedMode === 'list',
			};
			if (this.resourceIssues.length) {
				classes['has-issues'] = true;
			}
			return classes;
		},
		currentRequestParams(): IResourceLocatorReqParams {
			return {
				nodeTypeAndVersion: {
					name: this.node.type,
					version: this.node.typeVersion,
				},
				path: this.path,
				// methodName: loadOptionsMethod,
				// loadOptions,
				// currentNodeParameters: resolvedNodeParameters,
				credentials: this.node.credentials,
				...(this.$data.searchFilter ? {filter: this.$data.searchFilter}: {}),
			} as IResourceLocatorReqParams; // todo
		},
		currentRequestKey(): string {
			return JSON.stringify(this.currentRequestParams);
		},
		currentResources(): IResourceLocatorResult[] {
			return this.cachedResponses[this.currentRequestKey] ? this.cachedResponses[this.currentRequestKey].results : [];
		},
	},
	watch: {
		parameterIssues() {
			this.validate();
		},
		hasMultipleModes(newValue: boolean) {
			this.setDefaultMode();
		},
		value() {
			this.tempValue = this.displayValue as string;
			this.validate();
		},
		isValueExpression(newValue: boolean) {
			if (newValue === true) {
				this.switchFromListMode();
			}
		},
		mode(newMode: string) {
			if (this.selectedMode !== newMode) {
				this.selectedMode = newMode;
				this.validate();
			}
		},
	},
	mounted() {
		this.selectedMode = this.mode;
		this.tempValue = this.displayValue as string;
		this.setDefaultMode();
	},
	methods: {
		setDefaultMode(): void {
			if (this.parameter.modes && this.selectedMode === '') {
				// List mode is selected by default if it's available
				const listMode = this.parameter.modes.find(
					(mode: INodePropertyMode) => mode.name === 'list',
				);
				this.selectedMode = listMode ? listMode.name : this.parameter.modes[0].name;
				this.validate();
			}
		},
		validate(): void {
			const valueToValidate = this.displayValue
				? this.displayValue.toString()
				: (this.value
					? this.value.toString()
					: '');
			const validationErrors: string[] = validateResourceLocatorParameter(
				valueToValidate,
				this.currentMode,
			);
			this.resourceIssues = this.parameterIssues.concat(validationErrors);
		},
		findModeByName(name: string): INodePropertyMode | null {
			if (this.parameter.modes) {
				return this.parameter.modes.find((mode: INodePropertyMode) => mode.name === name) || null;
			}
			return null;
		},
		getModeLabel(name: string): string | null {
			return getParameterModeLabel(name);
		},
		onInputChange(value: string): void {
			this.$emit('valueChanged', { value, mode: this.selectedMode });
		},
		onModeSelected(value: string): void {
			this.validate();
			if (value === 'list') {
				this.tempValue = '';
				this.$emit('valueChanged', { value: '', mode: 'list' });
				this.$emit('modeChanged', { value: '', mode: value });
			} else {
				this.$emit('modeChanged', { mode: value, value: this.value });
			}
		},
		onDrop(data: string) {
			this.switchFromListMode();
			this.$emit('drop', data);
		},
		onSearchFilter(filter: string) {
			this.searchFilter = filter;
			this.loadingResources = true;
			this.callDebounced('loadResources', { debounceTime: 500, trailing: true });
		},
		async loadInitialResources(): Promise<void> {
			if (!this.cachedResponses[this.currentRequestKey]) {
				this.loadResources();
			}
		},
		async loadResources () {
			this.loadingResources = true;
			this.errorLoadingResources = false;

			try {
				const params = this.currentRequestParams;
				const paramsKey = this.currentRequestKey;

				if (this.cachedResponses[paramsKey]) {
					const nextPageToken = this.cachedResponses[paramsKey].nextPageToken;
					if (nextPageToken) {
						params.paginationToken = nextPageToken;
					} else { // end of results
						this.loadingResources = false;
						return;
					}
				}

				const response: IResourceLocatorResponse = await this.$store.dispatch(
					'nodeTypes/getResourceLocatorResults',
					params,
				);

				const toCache = {
					results: (this.cachedResponses[paramsKey] ? this.cachedResponses[paramsKey].results : []).concat(response.results),
					nextPageToken: response.paginationToken || null,
				};

				this.cachedResponses = {
					...this.cachedResponses,
					[paramsKey]: toCache,
				};

				await Vue.nextTick();

				this.loadingResources = false;
			} catch (e) {
				this.errorLoadingResources = true;
			}
		},
		onInputFocus(): void {
			if (this.selectedMode !== 'list') {
				return;
			}

			this.showResourceDropdown = true;
			if (this.showResourceDropdown) {
				this.loadInitialResources();
			}
		},
		switchFromListMode(): void {
			if (this.selectedMode === 'list' && this.parameter.modes) {
				// Find the first mode that's not list mode
				const mode = this.parameter.modes.find((m) => m.name !== 'list');
				if (mode) {
					this.selectedMode = mode.name;
					this.$emit('modeChanged', { value: this.value, mode: mode.name });
				}
			}
		},
		onDropdownHide() {
			this.showResourceDropdown = false;
		},
		onListItemSelected(value: string) {
			this.onInputChange(value);
			this.showResourceDropdown = false;
		},
		onInputBlur() {
			if (!this.currentMode.search && this.showResourceDropdown) {
				this.showResourceDropdown = false;
			}
		},
	},
});
</script>

<style lang="scss" module>
:root {
	--mode-selector-width: 92px;
}

.mode-selector {
	--input-background-color: initial;
	--input-font-color: initial;
	--input-border-color: initial;
	flex-basis: var(--mode-selector-width);

	input {
		border-radius: var(--border-radius-base) 0 0 var(--border-radius-base);
		border-right: none;
		overflow: hidden;

		&:focus {
			border-right: none;
		}

		&:disabled {
			cursor: not-allowed !important;
		}
	}
}

.resource-locator {
	display: flex;
	flex-wrap: wrap;

	.input-container {
		display: flex;
		align-items: center;
		width: 100%;

		div:first-child {
			display: flex;
			flex-grow: 1;
		}

		&:hover .edit-window-button {
			display: inline;
		}
	}

	&.multiple-modes {
		.input-container {
			display: flex;
			align-items: center;
			flex-basis: calc(100% - var(--mode-selector-width));
			flex-grow: 1;

			input {
				border-radius: 0 var(--border-radius-base) var(--border-radius-base) 0;
			}
		}
	}
}

.edit-window-button {
	display: none;
}

.expand-input-icon-container {
	display: flex;
	height: 100%;
	align-items: center;
}

.has-issues {
	--input-border-color: var(--color-danger);
}

.droppable {
	--input-border-color: var(--color-secondary-tint-1);
	--input-background-color: var(--color-secondary-tint-2);
	--input-border-style: dashed;
}

.activeDrop {
	--input-border-color: var(--color-success);
	--input-background-color: var(--color-success-tint-2);
	--input-border-style: solid;

	textarea,
	input {
		cursor: grabbing !important;
	}
}

.select-icon {
	cursor: pointer;
	font-size: 14px;
	transition: transform 0.3s, -webkit-transform 0.3s;
	-webkit-transform: rotateZ(0);
	transform: rotateZ(0);

	&.is-reverse {
		-webkit-transform: rotateZ(180deg);
		transform: rotateZ(180deg);
	}
}

.list-mode-input-container * {
	cursor: pointer;
}
</style>
