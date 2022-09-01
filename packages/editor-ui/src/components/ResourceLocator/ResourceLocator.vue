<template>
	<ResourceLocatorDropdown
		:show="showResourceDropdown"
		:selected="tempValue"
		:filterable="!!currentMode.search"
		:resources="currentQueryResults"
		:loading="currentQueryLoading || !currentResponse"
		:filter="searchFilter"
		:hasMore="currentQueryHasMore"
		:errorView="currentQueryError"
		@hide="onDropdownHide"
		@selected="onListItemSelected"
		@filter="onSearchFilter"
		@loadMore="loadResourcesDeboucned"
	>
		<template #error>
			<div :class="$style.error">
				<n8n-text color="text-dark" align="center" tag="div">
					{{ $locale.baseText('resourceLocator.listModeDropdown.error.title') }}
				</n8n-text>
				<n8n-text size="small" color="text-base" v-if="hasCredential">
					{{ $locale.baseText('resourceLocator.listModeDropdown.error.description1') }}
					<a @click="openCredential">{{ $locale.baseText('resourceLocator.listModeDropdown.error.description2') }}</a>
					{{ $locale.baseText('resourceLocator.listModeDropdown.error.description3') }}
				</n8n-text>
			</div>
		</template>
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
								:class="{
									['droppable']: droppable,
									['activeDrop']: activeDrop,
								}"
								:size="inputSize"
								:value="valueToDislay"
								:disabled="isReadOnly"
								:readonly="selectedMode === 'list'"
								:title="displayTitle"
								:placeholder="currentMode.placeholder ? currentMode.placeholder : ''"
								type="text"
								@input="onInputChange"
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

import { ILoadOptions, INode, INodeCredentials, INodeParameterResourceLocator, INodeParameters, INodeProperties, INodePropertyMode, INodeTypeDescription, IResourceLocatorResult } from 'n8n-workflow';
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
import { INodeUi, IResourceLocatorReqParams, IResourceLocatorResponse } from '@/Interface';
import { debounceHelper } from '../mixins/debounce';
import stringify from 'fast-json-stable-stringify';
import { workflowHelpers } from '../mixins/workflowHelpers';
import { nodeHelpers } from '../mixins/nodeHelpers';

interface IResourceLocatorQuery {
	results: IResourceLocatorResult[];
	nextPageToken: string | number | null;
	error: boolean;
	loading: boolean;
}

export default mixins(debounceHelper, workflowHelpers, nodeHelpers).extend({
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
			type: Object as PropType<INodeProperties>,
			required: true,
		},
		value: {
			type: Object as PropType<INodeParameterResourceLocator>,
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
		loadOptionsMethod: {
			type: String,
		},
	},
	data() {
		return {
			selectedMode: '',
			tempValue: '',
			resourceIssues: [] as string[],
			showResourceDropdown: false,
			searchFilter: '',
			cachedResponses: {} as {[key: string]: IResourceLocatorQuery},
		};
	},
	computed: {
		hasCredential(): boolean {
			const node = this.$store.getters.activeNode as INodeUi | null;
			if (!node) {
				return false;
			}
			return !!(node && node.credentials && Object.keys(node.credentials).length === 1);
		},
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
		valueToDislay(): string {
			if (this.selectedMode === 'list') {
				return this.value.cachedResultName || this.displayValue;
			}

			return this.displayValue;
		},
		currentRequestParams(): { parameters: INodeParameters, credentials: INodeCredentials | undefined, filter: string } {
			return {
				parameters: this.node.parameters,
				credentials: this.node.credentials,
				filter: this.searchFilter,
			};
		},
		currentRequestKey(): string {
			return stringify(this.currentRequestParams);
		},
		currentResponse(): IResourceLocatorQuery | null {
			return this.cachedResponses[this.currentRequestKey] || null;
		},
		currentQueryResults(): IResourceLocatorResult[] {
			return this.currentResponse ? this.currentResponse.results : [];
		},
		currentQueryHasMore(): boolean {
			return !!(this.currentResponse && this.currentResponse.nextPageToken);
		},
		currentQueryLoading(): boolean {
			return !!(this.currentResponse && this.currentResponse.loading);
		},
		currentQueryError(): boolean {
			return !!(this.currentResponse && this.currentResponse.error);
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
		openCredential(): void {
			const node = this.$store.getters.activeNode as INodeUi | null;
			if (!node || !node.credentials) {
				return;
			}
			const credentialKey = Object.keys(node.credentials)[0];
			if (!credentialKey) {
				return;
			}
			const id = node.credentials[credentialKey].id;
			this.$store.dispatch('ui/openExisitngCredential', { id });
		},
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
			const params: INodeParameterResourceLocator = { value, mode: this.selectedMode };
			if (this.selectedMode === 'list') {
				const resource = this.currentQueryResults.find((resource) => resource.value === value);
				if (resource && resource.name) {
					params.cachedResultName = resource.name;
				}

				if (resource && resource.url) {
					params.cachedResultUrl = resource.url;
				}
			}
			this.$emit('valueChanged', params);
		},
		onModeSelected(value: string): void {
			this.validate();
			if (value === 'list') {
				this.tempValue = '';
				this.$emit('valueChanged', { value: '', mode: 'list' });
				this.$emit('modeChanged', { value: '', mode: value });
			} else {
				this.$emit('modeChanged', { mode: value, value: this.value.value });
			}
		},
		onDrop(data: string) {
			this.switchFromListMode();
			this.$emit('drop', data);
		},
		onSearchFilter(filter: string) {
			this.searchFilter = filter;
			this.loadResourcesDeboucned();
		},
		async loadInitialResources(): Promise<void> {
			if (!this.currentResponse || (this.currentResponse && this.currentResponse.error)) {
				this.loadResources();
			}
		},
		loadResourcesDeboucned () {
			this.callDebounced('loadResources', { debounceTime: 500, trailing: true });
		},
		setResponse(paramsKey: string, props: Partial<IResourceLocatorQuery>) {
			this.cachedResponses = {
				...this.cachedResponses,
				[paramsKey]: { ...this.cachedResponses[paramsKey], ...props },
			};
		},
		async loadResources () {
			const params = this.currentRequestParams;
			const paramsKey = this.currentRequestKey;
			const cachedResponse = this.cachedResponses[paramsKey];

			let paginationToken: null | string | number = null;

			try {
				if (cachedResponse) {
					const nextPageToken = cachedResponse.nextPageToken;
					if (nextPageToken) {
						paginationToken = nextPageToken;
						this.setResponse(paramsKey, { loading: true });
					} else if (cachedResponse.error) {
						this.setResponse(paramsKey, { error: false, loading: true });
					}
					else {
						return; // end of results
					}
				}
				else {
					this.setResponse(paramsKey, {
						loading: true,
						error: false,
						results: [],
						nextPageToken: null,
					});
				}

				const resolvedNodeParameters = this.resolveParameter(params.parameters) as INodeParameters;
				const loadOptionsMethod = this.getPropertyArgument(this.parameter, 'loadOptionsMethod') as string | undefined;
				const loadOptions = this.getPropertyArgument(this.parameter, 'loadOptions') as ILoadOptions | undefined;

				const requestParams: IResourceLocatorReqParams = {
					nodeTypeAndVersion: {
						name: this.node.type,
						version: this.node.typeVersion,
					},
					path: this.path,
					methodName: loadOptionsMethod,
					loadOptions,
					currentNodeParameters: resolvedNodeParameters,
					credentials: this.node.credentials,
					...(paginationToken? { paginationToken } : {}),
				};

				const response: IResourceLocatorResponse = await this.$store.dispatch(
					'nodeTypes/getResourceLocatorResults',
					requestParams,
				);

				this.setResponse(paramsKey, {
					results: (cachedResponse ? cachedResponse.results : []).concat(response.results),
					nextPageToken: response.paginationToken || null,
					loading: false,
					error: false,
				});
			} catch (e) {
				this.setResponse(paramsKey, {
					loading: false,
					error: true,
				});
			}
		},
		onInputFocus(): void {
			if (this.selectedMode !== 'list') {
				return;
			}

			this.loadInitialResources();
			this.showResourceDropdown = true;
		},
		switchFromListMode(): void {
			if (this.selectedMode === 'list' && this.parameter.modes) {
				// Find the first mode that's not list mode
				const mode = this.parameter.modes.find((m) => m.name !== 'list');
				if (mode) {
					this.selectedMode = mode.name;
					this.$emit('modeChanged', { value: this.value.value, mode: mode.name });
				}
			}
		},
		onDropdownHide() {
			this.showResourceDropdown = false;
			this.searchFilter = '';
		},
		onListItemSelected(value: string) {
			this.onInputChange(value);
			this.showResourceDropdown = false;
		},
		onInputBlur() {
			if (!this.currentMode.search || this.currentQueryError) {
				this.onDropdownHide();
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

.error {
	max-width: 170px;
	word-break: normal;
	text-align: center;
}
</style>
