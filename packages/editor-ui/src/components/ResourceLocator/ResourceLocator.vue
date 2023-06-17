<template>
	<div
		class="resource-locator"
		ref="container"
		:data-test-id="`resource-locator-${parameter.name}`"
	>
		<resource-locator-dropdown
			:value="value ? value.value : ''"
			:show="showResourceDropdown"
			:filterable="isSearchable"
			:filterRequired="requiresSearchFilter"
			:resources="currentQueryResults"
			:loading="currentQueryLoading"
			:filter="searchFilter"
			:hasMore="currentQueryHasMore"
			:errorView="currentQueryError"
			:width="width"
			@input="onListItemSelected"
			@hide="onDropdownHide"
			@filter="onSearchFilter"
			@loadMore="loadResourcesDebounced"
			ref="dropdown"
		>
			<template #error>
				<div :class="$style.error" data-test-id="rlc-error-container">
					<n8n-text color="text-dark" align="center" tag="div">
						{{ $locale.baseText('resourceLocator.mode.list.error.title') }}
					</n8n-text>
					<n8n-text size="small" color="text-base" v-if="hasCredential || credentialsNotSet">
						{{ $locale.baseText('resourceLocator.mode.list.error.description.part1') }}
						<a v-if="credentialsNotSet" @click="createNewCredential">{{
							$locale.baseText('resourceLocator.mode.list.error.description.part2.noCredentials')
						}}</a>
						<a v-else-if="hasCredential" @click="openCredential">{{
							$locale.baseText('resourceLocator.mode.list.error.description.part2.hasCredentials')
						}}</a>
					</n8n-text>
				</div>
			</template>
			<div
				:class="{
					[$style.resourceLocator]: true,
					[$style.multipleModes]: hasMultipleModes,
				}"
			>
				<div v-if="hasMultipleModes" :class="$style.modeSelector">
					<n8n-select
						:value="selectedMode"
						filterable
						:size="inputSize"
						:disabled="isReadOnly"
						@change="onModeSelected"
						:placeholder="$locale.baseText('resourceLocator.modeSelector.placeholder')"
						data-test-id="rlc-mode-selector"
					>
						<n8n-option
							v-for="mode in parameter.modes"
							:key="mode.name"
							:label="$locale.baseText(getModeLabel(mode.name)) || mode.displayName"
							:value="mode.name"
							:disabled="isValueExpression && mode.name === 'list'"
							:title="
								isValueExpression && mode.name === 'list'
									? $locale.baseText('resourceLocator.mode.list.disabled.title')
									: ''
							"
						>
						</n8n-option>
					</n8n-select>
				</div>

				<div :class="$style.inputContainer" data-test-id="rlc-input-container">
					<draggable-target
						type="mapping"
						:disabled="hasOnlyListMode"
						:sticky="true"
						:stickyOffset="isValueExpression ? [26, 3] : [3, 3]"
						@drop="onDrop"
					>
						<template #default="{ droppable, activeDrop }">
							<div
								:class="{
									[$style.listModeInputContainer]: isListMode,
									[$style.droppable]: droppable,
									[$style.activeDrop]: activeDrop,
								}"
								@keydown.stop="onKeyDown"
							>
								<ExpressionParameterInput
									v-if="isValueExpression || forceShowExpression"
									:value="expressionDisplayValue"
									:path="path"
									isForRecordLocator
									@valueChanged="onInputChange"
									@modalOpenerClick="$emit('modalOpenerClick')"
									ref="input"
								/>
								<n8n-input
									v-else
									:class="{ [$style.selectInput]: isListMode }"
									:size="inputSize"
									:value="valueToDisplay"
									:disabled="isReadOnly"
									:readonly="isListMode"
									:title="displayTitle"
									:placeholder="inputPlaceholder"
									type="text"
									ref="input"
									data-test-id="rlc-input"
									@input="onInputChange"
									@focus="onInputFocus"
									@blur="onInputBlur"
								>
									<template v-if="isListMode" #suffix>
										<i
											:class="{
												['el-input__icon']: true,
												['el-icon-arrow-down']: true,
												[$style.selectIcon]: true,
												[$style.isReverse]: showResourceDropdown,
											}"
										/>
									</template>
								</n8n-input>
							</div>
						</template>
					</draggable-target>
					<parameter-issues
						v-if="parameterIssues && parameterIssues.length"
						:issues="parameterIssues"
						:class="$style['parameter-issues']"
					/>
					<div v-else-if="urlValue" :class="$style.openResourceLink">
						<n8n-link theme="text" @click.stop="openResource(urlValue)">
							<font-awesome-icon icon="external-link-alt" :title="getLinkAlt(valueToDisplay)" />
						</n8n-link>
					</div>
				</div>
			</div>
		</resource-locator-dropdown>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import type {
	ILoadOptions,
	INode,
	INodeCredentials,
	INodeListSearchItems,
	INodeParameterResourceLocator,
	INodeParameters,
	INodeProperties,
	INodePropertyMode,
	NodeParameterValue,
} from 'n8n-workflow';
import ExpressionParameterInput from '@/components/ExpressionParameterInput.vue';
import DraggableTarget from '@/components/DraggableTarget.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import ResourceLocatorDropdown from './ResourceLocatorDropdown.vue';
import type { PropType } from 'vue';
import type { IResourceLocatorReqParams, IResourceLocatorResultExpanded } from '@/Interface';
import { debounceHelper } from '@/mixins/debounce';
import stringify from 'fast-json-stable-stringify';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { nodeHelpers } from '@/mixins/nodeHelpers';
import {
	getAppNameFromNodeName,
	isResourceLocatorValue,
	hasOnlyListMode,
	getMainAuthField,
} from '@/utils';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

type ResourceLocatorDropdownRef = InstanceType<typeof ResourceLocatorDropdown>;

interface IResourceLocatorQuery {
	results: INodeListSearchItems[];
	nextPageToken: unknown;
	error: boolean;
	loading: boolean;
}

export default defineComponent({
	name: 'resource-locator',
	mixins: [debounceHelper, workflowHelpers, nodeHelpers],
	components: {
		DraggableTarget,
		ExpressionParameterInput,
		ParameterIssues,
		ResourceLocatorDropdown,
	},
	props: {
		parameter: {
			type: Object as PropType<INodeProperties>,
			required: true,
		},
		value: {
			type: [Object, String] as PropType<
				INodeParameterResourceLocator | NodeParameterValue | undefined
			>,
		},
		inputSize: {
			type: String,
			default: 'small',
			validator: (size: string) => {
				return ['mini', 'small', 'medium', 'large', 'xlarge'].includes(size);
			},
		},
		parameterIssues: {
			type: Array as PropType<string[]>,
			default: () => [],
		},
		dependentParametersValues: {
			type: [String, null] as PropType<string | null>,
			default: null,
		},
		displayTitle: {
			type: String,
			default: '',
		},
		expressionComputedValue: {
			type: String,
			default: '',
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		expressionDisplayValue: {
			type: String,
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
			showResourceDropdown: false,
			searchFilter: '',
			cachedResponses: {} as { [key: string]: IResourceLocatorQuery },
			hasCompletedASearch: false,
			width: 0,
		};
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore, useRootStore, useUIStore, useWorkflowsStore),
		appName(): string {
			if (!this.node) {
				return '';
			}

			const nodeType = this.nodeTypesStore.getNodeType(this.node.type);
			return getAppNameFromNodeName(nodeType?.displayName || '');
		},
		selectedMode(): string {
			if (typeof this.value !== 'object') {
				// legacy mode
				return '';
			}

			if (!this.value) {
				return this.parameter.modes ? this.parameter.modes[0].name : '';
			}

			return this.value.mode;
		},
		isListMode(): boolean {
			return this.selectedMode === 'list';
		},
		hasCredential(): boolean {
			const node = this.ndvStore.activeNode;
			if (!node) {
				return false;
			}
			return !!(node && node.credentials && Object.keys(node.credentials).length === 1);
		},
		credentialsNotSet(): boolean {
			const nodeType = this.nodeTypesStore.getNodeType(this.node?.type);
			if (nodeType) {
				const usesCredentials =
					nodeType.credentials !== undefined && nodeType.credentials.length > 0;
				if (usesCredentials && !this.node?.credentials) {
					return true;
				}
			}
			return false;
		},
		inputPlaceholder(): string {
			if (this.currentMode.placeholder) {
				return this.currentMode.placeholder;
			}
			const defaults: { [key: string]: string } = {
				list: this.$locale.baseText('resourceLocator.mode.list.placeholder'),
				id: this.$locale.baseText('resourceLocator.id.placeholder'),
				url: this.$locale.baseText('resourceLocator.url.placeholder'),
			};

			return defaults[this.selectedMode] || '';
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
		valueToDisplay(): NodeParameterValue {
			if (typeof this.value !== 'object') {
				return this.value;
			}

			if (this.isListMode) {
				return this.value ? this.value.cachedResultName || this.value.value : '';
			}

			return this.value ? this.value.value : '';
		},
		urlValue(): string | null {
			if (this.isListMode && typeof this.value === 'object') {
				return (this.value && this.value.cachedResultUrl) || null;
			}

			if (this.selectedMode === 'url') {
				if (
					this.isValueExpression &&
					typeof this.expressionComputedValue === 'string' &&
					this.expressionComputedValue.startsWith('http')
				) {
					return this.expressionComputedValue;
				}

				if (typeof this.valueToDisplay === 'string' && this.valueToDisplay.startsWith('http')) {
					return this.valueToDisplay;
				}
			}

			if (this.currentMode.url) {
				const value = this.isValueExpression ? this.expressionComputedValue : this.valueToDisplay;
				if (typeof value === 'string') {
					const expression = this.currentMode.url.replace(/\{\{\$value\}\}/g, value);
					const resolved = this.resolveExpression(expression);

					return typeof resolved === 'string' ? resolved : null;
				}
			}

			return null;
		},
		currentRequestParams(): {
			parameters: INodeParameters;
			credentials: INodeCredentials | undefined;
			filter: string;
		} {
			return {
				parameters: this.node.parameters,
				credentials: this.node.credentials,
				filter: this.searchFilter,
			};
		},
		currentRequestKey(): string {
			const cacheKeys = { ...this.currentRequestParams };
			cacheKeys.parameters = Object.keys(this.node ? this.node.parameters : {}).reduce(
				(accu: INodeParameters, param) => {
					if (param !== this.parameter.name && this.node && this.node.parameters) {
						accu[param] = this.node.parameters[param];
					}

					return accu;
				},
				{},
			);
			return stringify(cacheKeys);
		},
		currentResponse(): IResourceLocatorQuery | null {
			return this.cachedResponses[this.currentRequestKey] || null;
		},
		currentQueryResults(): IResourceLocatorResultExpanded[] {
			const results = this.currentResponse ? this.currentResponse.results : [];

			return results.map(
				(result: INodeListSearchItems): IResourceLocatorResultExpanded => ({
					...result,
					...(result.name && result.url ? { linkAlt: this.getLinkAlt(result.name) } : {}),
				}),
			);
		},
		currentQueryHasMore(): boolean {
			return !!(this.currentResponse && this.currentResponse.nextPageToken);
		},
		currentQueryLoading(): boolean {
			if (this.requiresSearchFilter && this.searchFilter === '') {
				return false;
			}
			if (!this.currentResponse) {
				return true;
			}
			return !!(this.currentResponse && this.currentResponse.loading);
		},
		currentQueryError(): boolean {
			return !!(this.currentResponse && this.currentResponse.error);
		},
		isSearchable(): boolean {
			return !!this.getPropertyArgument(this.currentMode, 'searchable');
		},
		requiresSearchFilter(): boolean {
			return !!this.getPropertyArgument(this.currentMode, 'searchFilterRequired');
		},
	},
	watch: {
		currentQueryError(curr: boolean, prev: boolean) {
			if (this.showResourceDropdown && curr && !prev) {
				const inputRef = this.$refs.input as HTMLInputElement | undefined;
				if (inputRef) {
					inputRef.focus();
				}
			}
		},
		isValueExpression(newValue: boolean) {
			if (newValue === true) {
				this.switchFromListMode();
			}
		},
		currentMode(mode: INodePropertyMode) {
			if (
				mode.extractValue &&
				mode.extractValue.regex &&
				isResourceLocatorValue(this.value) &&
				this.value.__regex !== mode.extractValue.regex
			) {
				this.$emit('input', { ...this.value, __regex: mode.extractValue.regex });
			}
		},
		dependentParametersValues(currentValue, oldValue) {
			const isUpdated = oldValue !== null && currentValue !== null && oldValue !== currentValue;
			// Reset value if dependent parameters change
			if (
				isUpdated &&
				this.value &&
				isResourceLocatorValue(this.value) &&
				this.value.value !== ''
			) {
				this.$emit('input', {
					...this.value,
					cachedResultName: '',
					cachedResultUrl: '',
					value: '',
				});
			}
		},
	},
	mounted() {
		this.$on('refreshList', this.refreshList);
		window.addEventListener('resize', this.setWidth);
		useNDVStore().$subscribe((mutation, state) => {
			// Update the width when main panel dimension change
			this.setWidth();
		});
		setTimeout(() => {
			this.setWidth();
		}, 0);
	},
	beforeDestroy() {
		window.removeEventListener('resize', this.setWidth);
	},
	methods: {
		setWidth() {
			const containerRef = this.$refs.container as HTMLElement | undefined;
			if (containerRef) {
				this.width = containerRef?.offsetWidth;
			}
		},
		getLinkAlt(entity: string) {
			if (this.selectedMode === 'list' && entity) {
				return this.$locale.baseText('resourceLocator.openSpecificResource', {
					interpolate: { entity, appName: this.appName },
				});
			}
			return this.$locale.baseText('resourceLocator.openResource', {
				interpolate: { appName: this.appName },
			});
		},
		refreshList() {
			this.cachedResponses = {};
			this.trackEvent('User refreshed resource locator list');
		},
		onKeyDown(e: MouseEvent) {
			const dropdownRef = this.$refs.dropdown as ResourceLocatorDropdownRef | undefined;
			if (dropdownRef && this.showResourceDropdown && !this.isSearchable) {
				dropdownRef.$emit('keyDown', e);
			}
		},
		openResource(url: string) {
			window.open(url, '_blank');
			this.trackEvent('User clicked resource locator link');
		},
		getPropertyArgument(
			parameter: INodePropertyMode,
			argumentName: string,
		): string | number | boolean | undefined {
			if (parameter.typeOptions === undefined) {
				return undefined;
			}

			// @ts-ignore
			if (parameter.typeOptions[argumentName] === undefined) {
				return undefined;
			}

			// @ts-ignore
			return parameter.typeOptions[argumentName];
		},
		openCredential(): void {
			const node = this.ndvStore.activeNode;
			if (!node || !node.credentials) {
				return;
			}
			const credentialKey = Object.keys(node.credentials)[0];
			if (!credentialKey) {
				return;
			}
			const id = node.credentials[credentialKey].id;
			this.uiStore.openExistingCredential(id);
		},
		createNewCredential(): void {
			const nodeType = this.nodeTypesStore.getNodeType(this.node?.type);
			if (!nodeType) {
				return;
			}
			const mainAuthType = getMainAuthField(nodeType);
			const showAuthSelector =
				mainAuthType !== null &&
				Array.isArray(mainAuthType.options) &&
				mainAuthType.options?.length > 0;
			this.uiStore.openNewCredential('', showAuthSelector);
		},
		findModeByName(name: string): INodePropertyMode | null {
			if (this.parameter.modes) {
				return this.parameter.modes.find((mode: INodePropertyMode) => mode.name === name) || null;
			}
			return null;
		},
		getModeLabel(name: string): string | null {
			if (name === 'id' || name === 'url' || name === 'list') {
				return this.$locale.baseText(`resourceLocator.mode.${name}`);
			}

			return null;
		},
		onInputChange(value: string): void {
			const params: INodeParameterResourceLocator = { __rl: true, value, mode: this.selectedMode };
			if (this.isListMode) {
				const resource = this.currentQueryResults.find((resource) => resource.value === value);
				if (resource && resource.name) {
					params.cachedResultName = resource.name;
				}

				if (resource && resource.url) {
					params.cachedResultUrl = resource.url;
				}
			}
			this.$emit('input', params);
		},
		onModeSelected(value: string): void {
			if (typeof this.value !== 'object') {
				this.$emit('input', { __rl: true, value: this.value, mode: value });
			} else if (value === 'url' && this.value && this.value.cachedResultUrl) {
				this.$emit('input', { __rl: true, mode: value, value: this.value.cachedResultUrl });
			} else if (value === 'id' && this.selectedMode === 'list' && this.value && this.value.value) {
				this.$emit('input', { __rl: true, mode: value, value: this.value.value });
			} else {
				this.$emit('input', { __rl: true, mode: value, value: '' });
			}

			this.trackEvent('User changed resource locator mode', { mode: value });
		},
		trackEvent(event: string, params?: { [key: string]: string }): void {
			this.$telemetry.track(event, {
				instance_id: this.rootStore.instanceId,
				workflow_id: this.workflowsStore.workflowId,
				node_type: this.node && this.node.type,
				resource: this.node && this.node.parameters && this.node.parameters.resource,
				operation: this.node && this.node.parameters && this.node.parameters.operation,
				field_name: this.parameter.name,
				...params,
			});
		},
		onDrop(data: string) {
			this.switchFromListMode();
			this.$emit('drop', data);
		},
		onSearchFilter(filter: string) {
			this.searchFilter = filter;
			this.loadResourcesDebounced();
		},
		async loadInitialResources(): Promise<void> {
			if (!this.currentResponse || (this.currentResponse && this.currentResponse.error)) {
				this.searchFilter = '';
				await this.loadResources();
			}
		},
		loadResourcesDebounced() {
			void this.callDebounced('loadResources', { debounceTime: 1000, trailing: true });
		},
		setResponse(paramsKey: string, props: Partial<IResourceLocatorQuery>) {
			this.cachedResponses = {
				...this.cachedResponses,
				[paramsKey]: { ...this.cachedResponses[paramsKey], ...props },
			};
		},
		async loadResources() {
			const params = this.currentRequestParams;
			const paramsKey = this.currentRequestKey;
			const cachedResponse = this.cachedResponses[paramsKey];

			if (this.requiresSearchFilter && !params.filter) {
				return;
			}

			let paginationToken: unknown = null;

			try {
				if (cachedResponse) {
					const nextPageToken = cachedResponse.nextPageToken;
					if (nextPageToken) {
						paginationToken = nextPageToken;
						this.setResponse(paramsKey, { loading: true });
					} else if (cachedResponse.error) {
						this.setResponse(paramsKey, { error: false, loading: true });
					} else {
						return; // end of results
					}
				} else {
					this.setResponse(paramsKey, {
						loading: true,
						error: false,
						results: [],
						nextPageToken: null,
					});
				}

				const resolvedNodeParameters = this.resolveParameter(params.parameters) as INodeParameters;
				const loadOptionsMethod = this.getPropertyArgument(this.currentMode, 'searchListMethod') as
					| string
					| undefined;
				const searchList = this.getPropertyArgument(this.currentMode, 'searchList') as
					| ILoadOptions
					| undefined;

				const requestParams: IResourceLocatorReqParams = {
					nodeTypeAndVersion: {
						name: this.node.type,
						version: this.node.typeVersion,
					},
					path: this.path,
					methodName: loadOptionsMethod,
					searchList,
					currentNodeParameters: resolvedNodeParameters,
					credentials: this.node.credentials,
					...(params.filter ? { filter: params.filter } : {}),
					...(paginationToken ? { paginationToken } : {}),
				};

				const response = await this.nodeTypesStore.getResourceLocatorResults(requestParams);

				this.setResponse(paramsKey, {
					results: (cachedResponse ? cachedResponse.results : []).concat(response.results),
					nextPageToken: response.paginationToken || null,
					loading: false,
					error: false,
				});

				if (params.filter && !this.hasCompletedASearch) {
					this.hasCompletedASearch = true;
					this.trackEvent('User searched resource locator list');
				}
			} catch (e) {
				this.setResponse(paramsKey, {
					loading: false,
					error: true,
				});
			}
		},
		onInputFocus(): void {
			if (!this.isListMode || this.showResourceDropdown) {
				return;
			}

			void this.loadInitialResources();
			this.showResourceDropdown = true;
		},
		switchFromListMode(): void {
			if (this.isListMode && this.parameter.modes && this.parameter.modes.length > 1) {
				let mode = this.findModeByName('id');
				if (!mode) {
					mode = this.parameter.modes.filter((mode) => mode.name !== 'list')[0];
				}

				if (mode) {
					this.$emit('input', {
						__rl: true,
						value: this.value && typeof this.value === 'object' ? this.value.value : '',
						mode: mode.name,
					});
				}
			}
		},
		onDropdownHide() {
			if (!this.currentQueryError) {
				this.showResourceDropdown = false;
			}
		},
		onListItemSelected(value: string) {
			this.onInputChange(value);
			this.showResourceDropdown = false;
		},
		onInputBlur() {
			if (!this.isSearchable || this.currentQueryError) {
				this.showResourceDropdown = false;
			}
			this.$emit('blur');
		},
	},
});
</script>

<style lang="scss" module>
$--mode-selector-width: 92px;

.modeSelector {
	--input-background-color: initial;
	--input-font-color: initial;
	--input-border-color: initial;
	flex-basis: $--mode-selector-width;

	input {
		border-radius: var(--border-radius-base) 0 0 var(--border-radius-base);
		border-right: none;
		overflow: hidden;

		&:focus {
			border-right: var(--border-base);
		}

		&:disabled {
			cursor: not-allowed !important;
		}
	}
}

.resourceLocator {
	display: flex;
	flex-wrap: wrap;

	.inputContainer {
		display: flex;
		align-items: center;
		width: 100%;

		> div {
			width: 100%;
		}
	}

	&.multipleModes {
		.inputContainer {
			display: flex;
			align-items: center;
			flex-basis: calc(100% - $--mode-selector-width);
			flex-grow: 1;

			input {
				border-radius: 0 var(--border-radius-base) var(--border-radius-base) 0;
			}
		}
	}
}

.droppable {
	--input-border-color: var(--color-secondary-tint-1);
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

.selectInput input {
	padding-right: 30px !important;
	overflow: hidden;
	text-overflow: ellipsis;
}

.selectIcon {
	cursor: pointer;
	font-size: 14px;
	transition: transform 0.3s, -webkit-transform 0.3s;
	-webkit-transform: rotateZ(0);
	transform: rotateZ(0);

	&.isReverse {
		-webkit-transform: rotateZ(180deg);
		transform: rotateZ(180deg);
	}
}

.listModeInputContainer * {
	cursor: pointer;
}

.error {
	max-width: 170px;
	word-break: normal;
	text-align: center;
}

.openResourceLink {
	width: 25px !important;
	margin-left: var(--spacing-2xs);
}

.parameter-issues {
	width: 25px !important;
}
</style>
