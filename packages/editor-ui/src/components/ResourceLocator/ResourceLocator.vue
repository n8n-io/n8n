<template>
	<div
		ref="container"
		class="resource-locator"
		:data-test-id="`resource-locator-${parameter.name}`"
	>
		<ResourceLocatorDropdown
			ref="dropdown"
			v-on-click-outside="hideResourceDropdown"
			:model-value="modelValue ? modelValue.value : ''"
			:show="resourceDropdownVisible"
			:filterable="isSearchable"
			:filter-required="requiresSearchFilter"
			:resources="currentQueryResults"
			:loading="currentQueryLoading"
			:filter="searchFilter"
			:has-more="currentQueryHasMore"
			:error-view="currentQueryError"
			:width="width"
			:event-bus="eventBus"
			@update:model-value="onListItemSelected"
			@filter="onSearchFilter"
			@load-more="loadResourcesDebounced"
		>
			<template #error>
				<div :class="$style.error" data-test-id="rlc-error-container">
					<n8n-text color="text-dark" align="center" tag="div">
						{{ $locale.baseText('resourceLocator.mode.list.error.title') }}
					</n8n-text>
					<n8n-text v-if="hasCredential || credentialsNotSet" size="small" color="text-base">
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
				<div :class="$style.background"></div>
				<div v-if="hasMultipleModes" :class="$style.modeSelector">
					<n8n-select
						:model-value="selectedMode"
						:size="inputSize"
						:disabled="isReadOnly"
						:placeholder="$locale.baseText('resourceLocator.modeSelector.placeholder')"
						data-test-id="rlc-mode-selector"
						@update:model-value="onModeSelected"
					>
						<n8n-option
							v-for="mode in parameter.modes"
							:key="mode.name"
							:value="mode.name"
							:label="getModeLabel(mode)"
							:disabled="isValueExpression && mode.name === 'list'"
							:title="
								isValueExpression && mode.name === 'list'
									? $locale.baseText('resourceLocator.mode.list.disabled.title')
									: ''
							"
						>
							{{ getModeLabel(mode) }}
						</n8n-option>
					</n8n-select>
				</div>

				<div :class="$style.inputContainer" data-test-id="rlc-input-container">
					<DraggableTarget
						type="mapping"
						:disabled="hasOnlyListMode"
						:sticky="true"
						:sticky-offset="isValueExpression ? [26, 3] : [3, 3]"
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
									ref="input"
									:model-value="expressionDisplayValue"
									:path="path"
									:rows="3"
									@update:model-value="onInputChange"
									@modal-opener-click="$emit('modalOpenerClick')"
								/>
								<n8n-input
									v-else
									ref="input"
									:class="{ [$style.selectInput]: isListMode }"
									:size="inputSize"
									:model-value="valueToDisplay"
									:disabled="isReadOnly"
									:readonly="isListMode"
									:title="displayTitle"
									:placeholder="inputPlaceholder"
									type="text"
									data-test-id="rlc-input"
									@update:model-value="onInputChange"
									@focus="onInputFocus"
									@blur="onInputBlur"
								>
									<template v-if="isListMode" #suffix>
										<i
											:class="{
												['el-input__icon']: true,
												['el-icon-arrow-down']: true,
												[$style.selectIcon]: true,
												[$style.isReverse]: resourceDropdownVisible,
											}"
										/>
									</template>
								</n8n-input>
							</div>
						</template>
					</DraggableTarget>
					<ParameterIssues
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
		</ResourceLocatorDropdown>
	</div>
</template>

<script lang="ts">
import type { DynamicNodeParameters, IResourceLocatorResultExpanded } from '@/Interface';
import DraggableTarget from '@/components/DraggableTarget.vue';
import ExpressionParameterInput from '@/components/ExpressionParameterInput.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { getAppNameFromNodeName, getMainAuthField, hasOnlyListMode } from '@/utils/nodeTypesUtils';
import { isResourceLocatorValue } from '@/utils/typeGuards';
import stringify from 'fast-json-stable-stringify';
import type { EventBus } from 'n8n-design-system/utils';
import { createEventBus } from 'n8n-design-system/utils';
import type {
	INode,
	INodeCredentials,
	INodeListSearchItems,
	INodeParameterResourceLocator,
	INodeParameters,
	INodeProperties,
	INodePropertyMode,
	NodeParameterValue,
} from 'n8n-workflow';
import { mapStores } from 'pinia';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import ResourceLocatorDropdown from './ResourceLocatorDropdown.vue';
import { useDebounce } from '@/composables/useDebounce';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useRouter } from 'vue-router';

interface IResourceLocatorQuery {
	results: INodeListSearchItems[];
	nextPageToken: unknown;
	error: boolean;
	loading: boolean;
}

export default defineComponent({
	name: 'ResourceLocator',
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
		modelValue: {
			type: Object as PropType<INodeParameterResourceLocator>,
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
			type: {} as PropType<unknown>,
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		expressionDisplayValue: {
			type: String,
			default: '',
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
			required: true,
		},
		path: {
			type: String,
			required: true,
		},
		loadOptionsMethod: {
			type: String,
		},
		eventBus: {
			type: Object as PropType<EventBus>,
			default: () => createEventBus(),
		},
	},
	setup() {
		const router = useRouter();
		const workflowHelpers = useWorkflowHelpers({ router });

		const { callDebounced } = useDebounce();

		return { callDebounced, workflowHelpers };
	},
	data() {
		return {
			resourceDropdownVisible: false,
			resourceDropdownHiding: false,
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
			if (typeof this.modelValue !== 'object') {
				// legacy mode
				return '';
			}

			if (!this.modelValue) {
				return this.parameter.modes ? this.parameter.modes[0].name : '';
			}

			return this.modelValue.mode;
		},
		isListMode(): boolean {
			return this.selectedMode === 'list';
		},
		hasCredential(): boolean {
			const node = this.ndvStore.activeNode;
			if (!node) {
				return false;
			}
			return !!(node?.credentials && Object.keys(node.credentials).length === 1);
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
			if (typeof this.modelValue !== 'object') {
				return this.modelValue;
			}

			if (this.isListMode) {
				return this.modelValue ? this.modelValue.cachedResultName || this.modelValue.value : '';
			}

			return this.modelValue ? this.modelValue.value : '';
		},
		urlValue(): string | null {
			if (this.isListMode && typeof this.modelValue === 'object') {
				return this.modelValue?.cachedResultUrl || null;
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
					const resolved = this.workflowHelpers.resolveExpression(expression);

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
					if (param !== this.parameter.name && this.node?.parameters) {
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
			return !!this.currentResponse?.nextPageToken;
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
			if (this.resourceDropdownVisible && curr && !prev) {
				const inputRef = this.$refs.input as HTMLInputElement | undefined;
				if (inputRef) {
					inputRef.focus();
				}
			}
		},
		isValueExpression(newValue: boolean) {
			if (newValue) {
				this.switchFromListMode();
			}
		},
		currentMode(mode: INodePropertyMode) {
			if (
				mode.extractValue?.regex &&
				isResourceLocatorValue(this.modelValue) &&
				this.modelValue.__regex !== mode.extractValue.regex
			) {
				this.$emit('update:modelValue', { ...this.modelValue, __regex: mode.extractValue.regex });
			}
		},
		dependentParametersValues(currentValue, oldValue) {
			const isUpdated = oldValue !== null && currentValue !== null && oldValue !== currentValue;
			// Reset value if dependent parameters change
			if (
				isUpdated &&
				this.modelValue &&
				isResourceLocatorValue(this.modelValue) &&
				this.modelValue.value !== ''
			) {
				this.$emit('update:modelValue', {
					...this.modelValue,
					cachedResultName: '',
					cachedResultUrl: '',
					value: '',
				});
			}
		},
	},
	mounted() {
		this.eventBus.on('refreshList', this.refreshList);
		window.addEventListener('resize', this.setWidth);

		useNDVStore().$subscribe((mutation, state) => {
			// Update the width when main panel dimension change
			this.setWidth();
		});

		setTimeout(() => {
			this.setWidth();
		}, 0);
	},
	beforeUnmount() {
		this.eventBus.off('refreshList', this.refreshList);
		window.removeEventListener('resize', this.setWidth);
	},
	methods: {
		setWidth() {
			const containerRef = this.$refs.container as HTMLElement | undefined;
			if (containerRef) {
				this.width = containerRef?.offsetWidth;
			}
		},
		getLinkAlt(entity: NodeParameterValue) {
			if (this.selectedMode === 'list' && entity) {
				return this.$locale.baseText('resourceLocator.openSpecificResource', {
					interpolate: { entity: entity.toString(), appName: this.appName },
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
		onKeyDown(e: KeyboardEvent) {
			if (this.resourceDropdownVisible && !this.isSearchable) {
				this.eventBus.emit('keyDown', e);
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
			if (!node?.credentials) {
				return;
			}
			const credentialKey = Object.keys(node.credentials)[0];
			if (!credentialKey) {
				return;
			}
			const id = node.credentials[credentialKey].id;
			if (!id) {
				return;
			}
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
		getModeLabel(mode: INodePropertyMode): string | null {
			if (mode.name === 'id' || mode.name === 'url' || mode.name === 'list') {
				return this.$locale.baseText(`resourceLocator.mode.${mode.name}`);
			}

			return mode.displayName;
		},
		onInputChange(value: string): void {
			const params: INodeParameterResourceLocator = { __rl: true, value, mode: this.selectedMode };
			if (this.isListMode) {
				const resource = this.currentQueryResults.find((resource) => resource.value === value);
				if (resource?.name) {
					params.cachedResultName = resource.name;
				}

				if (resource?.url) {
					params.cachedResultUrl = resource.url;
				}
			}
			this.$emit('update:modelValue', params);
		},
		onModeSelected(value: string): void {
			if (typeof this.modelValue !== 'object') {
				this.$emit('update:modelValue', { __rl: true, value: this.modelValue, mode: value });
			} else if (value === 'url' && this.modelValue?.cachedResultUrl) {
				this.$emit('update:modelValue', {
					__rl: true,
					mode: value,
					value: this.modelValue.cachedResultUrl,
				});
			} else if (
				value === 'id' &&
				this.selectedMode === 'list' &&
				this.modelValue &&
				this.modelValue.value
			) {
				this.$emit('update:modelValue', { __rl: true, mode: value, value: this.modelValue.value });
			} else {
				this.$emit('update:modelValue', { __rl: true, mode: value, value: '' });
			}

			this.trackEvent('User changed resource locator mode', { mode: value });
		},
		trackEvent(event: string, params?: { [key: string]: string }): void {
			this.$telemetry.track(event, {
				instance_id: this.rootStore.instanceId,
				workflow_id: this.workflowsStore.workflowId,
				node_type: this.node?.type,
				resource: this.node?.parameters && this.node.parameters.resource,
				operation: this.node?.parameters && this.node.parameters.operation,
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
			void this.callDebounced(this.loadResources, {
				debounceTime: 1000,
				trailing: true,
			});
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

			let paginationToken: string | undefined;

			try {
				if (cachedResponse) {
					const nextPageToken = cachedResponse.nextPageToken as string;
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

				const resolvedNodeParameters = this.workflowHelpers.resolveRequiredParameters(
					this.parameter,
					params.parameters,
				) as INodeParameters;
				const loadOptionsMethod = this.getPropertyArgument(
					this.currentMode,
					'searchListMethod',
				) as string;

				const requestParams: DynamicNodeParameters.ResourceLocatorResultsRequest = {
					nodeTypeAndVersion: {
						name: this.node.type,
						version: this.node.typeVersion,
					},
					path: this.path,
					methodName: loadOptionsMethod,
					currentNodeParameters: resolvedNodeParameters,
					credentials: this.node.credentials,
				};

				if (params.filter) {
					requestParams.filter = params.filter;
				}

				if (paginationToken) {
					requestParams.paginationToken = paginationToken;
				}

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
			if (!this.isListMode || this.resourceDropdownVisible) {
				return;
			}

			void this.loadInitialResources();
			this.showResourceDropdown();
		},
		switchFromListMode(): void {
			if (this.isListMode && this.parameter.modes && this.parameter.modes.length > 1) {
				let mode = this.findModeByName('id');
				if (!mode) {
					mode = this.parameter.modes.filter((mode) => mode.name !== 'list')[0];
				}

				if (mode) {
					this.$emit('update:modelValue', {
						__rl: true,
						value:
							this.modelValue && typeof this.modelValue === 'object' ? this.modelValue.value : '',
						mode: mode.name,
					});
				}
			}
		},
		onDropdownHide() {
			if (!this.currentQueryError) {
				this.hideResourceDropdown();
			}
		},
		hideResourceDropdown() {
			if (!this.resourceDropdownVisible) {
				return;
			}

			this.resourceDropdownVisible = false;

			const inputRef = this.$refs.input as HTMLInputElement | undefined;
			this.resourceDropdownHiding = true;
			void this.$nextTick(() => {
				inputRef?.blur?.();
				this.resourceDropdownHiding = false;
			});
		},
		showResourceDropdown() {
			if (this.resourceDropdownVisible || this.resourceDropdownHiding) {
				return;
			}

			this.resourceDropdownVisible = true;
		},
		onListItemSelected(value: string) {
			this.onInputChange(value);
			this.hideResourceDropdown();
		},
		onInputBlur() {
			if (!this.isSearchable || this.currentQueryError) {
				this.hideResourceDropdown();
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
	position: relative;

	--input-issues-width: 28px;

	.inputContainer {
		display: flex;
		align-items: center;
		width: 100%;

		--input-border-top-left-radius: 0;
		--input-border-bottom-left-radius: 0;

		> div {
			width: 100%;
		}
	}

	.background {
		position: absolute;
		background-color: var(--color-background-input-triple);
		top: 0;
		bottom: 0;
		left: 0;
		right: var(--input-issues-width);
		border: 1px solid var(--border-color-base);
		border-radius: var(--border-radius-base);
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
	transition: transform 0.3s;
	transform: rotateZ(0);

	&.isReverse {
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
	padding-left: var(--spacing-2xs);
	padding-top: var(--spacing-4xs);
	align-self: flex-start;
}

.parameter-issues {
	width: 25px !important;
}
</style>
