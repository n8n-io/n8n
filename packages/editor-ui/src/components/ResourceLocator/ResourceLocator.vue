<script setup lang="ts">
import type { DynamicNodeParameters, IResourceLocatorResultExpanded } from '@/Interface';
import DraggableTarget from '@/components/DraggableTarget.vue';
import ExpressionParameterInput from '@/components/ExpressionParameterInput.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import { useDebounce } from '@/composables/useDebounce';
import { useI18n } from '@/composables/useI18n';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { ndvEventBus } from '@/event-bus';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@/stores/root.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import {
	getAppNameFromNodeName,
	getMainAuthField,
	hasOnlyListMode as hasOnlyListModeUtil,
} from '@/utils/nodeTypesUtils';
import { isResourceLocatorValue } from '@/utils/typeGuards';
import stringify from 'fast-json-stable-stringify';
import type { EventBus } from 'n8n-design-system/utils';
import { createEventBus } from 'n8n-design-system/utils';
import type {
	INode,
	INodeListSearchItems,
	INodeParameterResourceLocator,
	INodeParameters,
	INodeProperties,
	INodePropertyMode,
	INodePropertyModeTypeOptions,
	NodeParameterValue,
} from 'n8n-workflow';
import { computed, nextTick, onBeforeUnmount, onMounted, type Ref, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import ResourceLocatorDropdown from './ResourceLocatorDropdown.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { onClickOutside, type VueInstance } from '@vueuse/core';

interface IResourceLocatorQuery {
	results: INodeListSearchItems[];
	nextPageToken: unknown;
	error: boolean;
	loading: boolean;
}

type Props = {
	modelValue: INodeParameterResourceLocator;
	parameter: INodeProperties;
	path: string;
	loadOptionsMethod?: string;
	node?: INode;
	inputSize?: 'mini' | 'small' | 'medium' | 'large' | 'xlarge';
	parameterIssues?: string[];
	dependentParametersValues?: string | null;
	displayTitle?: string;
	isReadOnly?: boolean;
	expressionComputedValue: unknown;
	expressionDisplayValue?: string;
	forceShowExpression?: boolean;
	isValueExpression?: boolean;
	expressionEditDialogVisible?: boolean;
	eventBus?: EventBus;
};

const props = withDefaults(defineProps<Props>(), {
	node: undefined,
	loadOptionsMethod: undefined,
	inputSize: 'small',
	parameterIssues: () => [],
	dependentParametersValues: null,
	displayTitle: '',
	isReadOnly: false,
	expressionDisplayValue: '',
	forceShowExpression: false,
	isValueExpression: false,
	expressionEditDialogVisible: false,
	eventBus: () => createEventBus(),
});
const emit = defineEmits<{
	'update:modelValue': [value: INodeParameterResourceLocator];
	drop: [value: string];
	blur: [];
	modalOpenerClick: [];
}>();

const router = useRouter();
const workflowHelpers = useWorkflowHelpers({ router });
const { callDebounced } = useDebounce();
const i18n = useI18n();
const telemetry = useTelemetry();

const resourceDropdownVisible = ref(false);
const resourceDropdownHiding = ref(false);
const searchFilter = ref('');
const cachedResponses = ref<Record<string, IResourceLocatorQuery>>({});
const hasCompletedASearch = ref(false);
const width = ref(0);
const inputRef = ref<HTMLInputElement>();
const containerRef = ref<HTMLDivElement>();
const dropdownRef = ref<InstanceType<typeof ResourceLocatorDropdown>>();

const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const rootStore = useRootStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();

const appName = computed(() => {
	if (!props.node) {
		return '';
	}

	const nodeType = nodeTypesStore.getNodeType(props.node.type);
	return getAppNameFromNodeName(nodeType?.displayName ?? '');
});

const selectedMode = computed(() => {
	if (typeof props.modelValue !== 'object') {
		// legacy mode
		return '';
	}

	if (!props.modelValue) {
		return props.parameter.modes ? props.parameter.modes[0].name : '';
	}

	return props.modelValue.mode;
});

const isListMode = computed(() => selectedMode.value === 'list');

const hasCredential = computed(() => {
	const node = ndvStore.activeNode;
	if (!node) {
		return false;
	}
	return !!(node?.credentials && Object.keys(node.credentials).length === 1);
});

const credentialsNotSet = computed(() => {
	if (!props.node) return false;
	const nodeType = nodeTypesStore.getNodeType(props.node.type);
	if (nodeType) {
		const usesCredentials = nodeType.credentials !== undefined && nodeType.credentials.length > 0;
		if (usesCredentials && !props.node.credentials) {
			return true;
		}
	}
	return false;
});

const inputPlaceholder = computed(() => {
	if (currentMode.value.placeholder) {
		return currentMode.value.placeholder;
	}
	const defaults: { [key: string]: string } = {
		list: i18n.baseText('resourceLocator.mode.list.placeholder'),
		id: i18n.baseText('resourceLocator.id.placeholder'),
		url: i18n.baseText('resourceLocator.url.placeholder'),
	};

	return defaults[selectedMode.value] ?? '';
});

const currentMode = computed<INodePropertyMode>(
	() => findModeByName(selectedMode.value) ?? ({} as INodePropertyMode),
);

const hasMultipleModes = computed(() => {
	return props.parameter.modes && props.parameter.modes.length > 1;
});

const hasOnlyListMode = computed(() => hasOnlyListModeUtil(props.parameter));
const valueToDisplay = computed<NodeParameterValue>(() => {
	if (typeof props.modelValue !== 'object') {
		return props.modelValue;
	}

	if (isListMode.value) {
		return props.modelValue?.cachedResultName ?? props.modelValue?.value ?? '';
	}

	return props.modelValue?.value ?? '';
});

const urlValue = computed(() => {
	if (isListMode.value && typeof props.modelValue === 'object') {
		return props.modelValue?.cachedResultUrl ?? null;
	}

	if (selectedMode.value === 'url') {
		if (
			props.isValueExpression &&
			typeof props.expressionComputedValue === 'string' &&
			props.expressionComputedValue.startsWith('http')
		) {
			return props.expressionComputedValue;
		}

		if (typeof valueToDisplay.value === 'string' && valueToDisplay.value.startsWith('http')) {
			return valueToDisplay.value;
		}
	}

	if (currentMode.value.url) {
		const value = props.isValueExpression ? props.expressionComputedValue : valueToDisplay.value;
		if (typeof value === 'string') {
			const expression = currentMode.value.url.replace(/\{\{\$value\}\}/g, value);
			const resolved = workflowHelpers.resolveExpression(expression);

			return typeof resolved === 'string' ? resolved : null;
		}
	}

	return null;
});

const currentRequestParams = computed(() => {
	return {
		parameters: props.node?.parameters ?? {},
		credentials: props.node?.credentials ?? {},
		filter: searchFilter.value,
	};
});

const currentRequestKey = computed(() => {
	const cacheKeys = { ...currentRequestParams.value };
	cacheKeys.parameters = Object.keys(props.node?.parameters ?? {}).reduce(
		(accu: INodeParameters, param) => {
			if (param !== props.parameter.name && props.node?.parameters) {
				accu[param] = props.node.parameters[param];
			}

			return accu;
		},
		{},
	);
	return stringify(cacheKeys);
});

const currentResponse = computed(() => cachedResponses.value[currentRequestKey.value] ?? null);

const currentQueryResults = computed<IResourceLocatorResultExpanded[]>(() => {
	const results = currentResponse.value?.results ?? [];

	return results.map(
		(result: INodeListSearchItems): IResourceLocatorResultExpanded => ({
			...result,
			...(result.name && result.url ? { linkAlt: getLinkAlt(result.name) } : {}),
		}),
	);
});

const currentQueryHasMore = computed(() => !!currentResponse.value?.nextPageToken);

const currentQueryLoading = computed(
	() =>
		(requiresSearchFilter.value && searchFilter.value === '') ||
		!currentResponse.value ||
		!!currentResponse.value?.loading,
);

const currentQueryError = computed(() => {
	return !!(currentResponse.value && currentResponse.value.error);
});

const isSearchable = computed(() => !!getPropertyArgument(currentMode.value, 'searchable'));

const requiresSearchFilter = computed(
	() => !!getPropertyArgument(currentMode.value, 'searchFilterRequired'),
);

watch(currentQueryError, (curr, prev) => {
	if (resourceDropdownVisible.value && curr && !prev) {
		if (inputRef.value) {
			inputRef.value.focus();
		}
	}
});

watch(
	() => props.isValueExpression,
	(newValue) => {
		if (newValue) {
			switchFromListMode();
		}
	},
);

watch(currentMode, (mode) => {
	if (
		mode.extractValue?.regex &&
		isResourceLocatorValue(props.modelValue) &&
		props.modelValue.__regex !== mode.extractValue.regex
	) {
		emit('update:modelValue', { ...props.modelValue, __regex: mode.extractValue.regex as string });
	}
});

watch(
	() => props.dependentParametersValues,
	(currentValue, oldValue) => {
		const isUpdated = oldValue !== null && currentValue !== null && oldValue !== currentValue;
		// Reset value if dependent parameters change
		if (
			isUpdated &&
			props.modelValue &&
			isResourceLocatorValue(props.modelValue) &&
			props.modelValue.value !== ''
		) {
			emit('update:modelValue', {
				...props.modelValue,
				cachedResultName: '',
				cachedResultUrl: '',
				value: '',
			});
		}
	},
);

onMounted(() => {
	props.eventBus.on('refreshList', refreshList);
	window.addEventListener('resize', setWidth);

	useNDVStore().$subscribe(() => {
		// Update the width when main panel dimension change
		setWidth();
	});

	setTimeout(() => {
		setWidth();
	}, 0);
});

onBeforeUnmount(() => {
	props.eventBus.off('refreshList', refreshList);
	window.removeEventListener('resize', setWidth);
});

onClickOutside(dropdownRef as Ref<VueInstance>, hideResourceDropdown);

function setWidth() {
	if (containerRef.value) {
		width.value = containerRef.value.offsetWidth;
	}
}

function getLinkAlt(entity: NodeParameterValue) {
	if (selectedMode.value === 'list' && entity) {
		return i18n.baseText('resourceLocator.openSpecificResource', {
			interpolate: { entity: entity.toString(), appName: appName.value },
		});
	}
	return i18n.baseText('resourceLocator.openResource', {
		interpolate: { appName: appName.value },
	});
}

function refreshList() {
	cachedResponses.value = {};
	trackEvent('User refreshed resource locator list');
}

function onKeyDown(e: KeyboardEvent) {
	if (resourceDropdownVisible.value && !isSearchable.value) {
		props.eventBus.emit('keyDown', e);
	}
}

function openResource(url: string) {
	window.open(url, '_blank');
	trackEvent('User clicked resource locator link');
}

function getPropertyArgument(
	parameter: INodePropertyMode,
	argumentName: keyof INodePropertyModeTypeOptions,
): string | number | boolean | undefined {
	return parameter.typeOptions?.[argumentName];
}

function openCredential(): void {
	const node = ndvStore.activeNode;
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
	uiStore.openExistingCredential(id);
}

function createNewCredential(): void {
	if (!props.node) return;
	const nodeType = nodeTypesStore.getNodeType(props.node.type);
	if (!nodeType) {
		return;
	}

	const defaultCredentialType = nodeType.credentials?.[0].name ?? '';
	const mainAuthType = getMainAuthField(nodeType);
	const showAuthOptions =
		mainAuthType !== null &&
		Array.isArray(mainAuthType.options) &&
		mainAuthType.options?.length > 0;

	ndvEventBus.emit('credential.createNew', {
		type: defaultCredentialType,
		showAuthOptions,
	});
}

function findModeByName(name: string): INodePropertyMode | null {
	if (props.parameter.modes) {
		return props.parameter.modes.find((mode: INodePropertyMode) => mode.name === name) ?? null;
	}
	return null;
}

function getModeLabel(mode: INodePropertyMode): string | null {
	if (mode.name === 'id' || mode.name === 'url' || mode.name === 'list') {
		return i18n.baseText(`resourceLocator.mode.${mode.name}`);
	}

	return mode.displayName;
}

function onInputChange(value: NodeParameterValue): void {
	const params: INodeParameterResourceLocator = { __rl: true, value, mode: selectedMode.value };
	if (isListMode.value) {
		const resource = currentQueryResults.value.find((result) => result.value === value);
		if (resource?.name) {
			params.cachedResultName = resource.name;
		}

		if (resource?.url) {
			params.cachedResultUrl = resource.url;
		}
	}
	emit('update:modelValue', params);
}

function onModeSelected(value: string): void {
	if (typeof props.modelValue !== 'object') {
		emit('update:modelValue', { __rl: true, value: props.modelValue, mode: value });
	} else if (value === 'url' && props.modelValue?.cachedResultUrl) {
		emit('update:modelValue', {
			__rl: true,
			mode: value,
			value: props.modelValue.cachedResultUrl,
		});
	} else if (
		value === 'id' &&
		selectedMode.value === 'list' &&
		props.modelValue &&
		props.modelValue.value
	) {
		emit('update:modelValue', { __rl: true, mode: value, value: props.modelValue.value });
	} else {
		emit('update:modelValue', { __rl: true, mode: value, value: '' });
	}

	trackEvent('User changed resource locator mode', { mode: value });
}

function trackEvent(event: string, params?: { [key: string]: string }): void {
	telemetry.track(event, {
		instance_id: rootStore.instanceId,
		workflow_id: workflowsStore.workflowId,
		node_type: props.node?.type,
		resource: props.node?.parameters.resource,
		operation: props.node?.parameters.operation,
		field_name: props.parameter.name,
		...params,
	});
}

function onDrop(data: string) {
	switchFromListMode();
	emit('drop', data);
}

function onSearchFilter(filter: string) {
	searchFilter.value = filter;
	loadResourcesDebounced();
}

async function loadInitialResources(): Promise<void> {
	if (!currentResponse.value || currentResponse.value.error) {
		searchFilter.value = '';
		await loadResources();
	}
}

function loadResourcesDebounced() {
	if (currentResponse.value?.error) {
		// Clear error response immediately when retrying to show loading state
		delete cachedResponses.value[currentRequestKey.value];
	}

	void callDebounced(loadResources, {
		debounceTime: 1000,
		trailing: true,
	});
}

function setResponse(paramsKey: string, response: Partial<IResourceLocatorQuery>) {
	cachedResponses.value = {
		...cachedResponses.value,
		[paramsKey]: { ...cachedResponses.value[paramsKey], ...response },
	};
}

async function loadResources() {
	const params = currentRequestParams.value;
	const paramsKey = currentRequestKey.value;
	const cachedResponse = cachedResponses.value[paramsKey];

	if (credentialsNotSet.value) {
		setResponse(paramsKey, { error: true });
		return;
	}

	if (requiresSearchFilter.value && !params.filter) {
		return;
	}

	if (!props.node) {
		return;
	}

	let paginationToken: string | undefined;

	try {
		if (cachedResponse) {
			const nextPageToken = cachedResponse.nextPageToken as string;
			if (nextPageToken) {
				paginationToken = nextPageToken;
				setResponse(paramsKey, { loading: true });
			} else if (cachedResponse.error) {
				setResponse(paramsKey, { error: false, loading: true });
			} else {
				return; // end of results
			}
		} else {
			setResponse(paramsKey, {
				loading: true,
				error: false,
				results: [],
				nextPageToken: null,
			});
		}

		const resolvedNodeParameters = workflowHelpers.resolveRequiredParameters(
			props.parameter,
			params.parameters,
		) as INodeParameters;
		const loadOptionsMethod = getPropertyArgument(currentMode.value, 'searchListMethod') as string;

		const requestParams: DynamicNodeParameters.ResourceLocatorResultsRequest = {
			nodeTypeAndVersion: {
				name: props.node.type,
				version: props.node.typeVersion,
			},
			path: props.path,
			methodName: loadOptionsMethod,
			currentNodeParameters: resolvedNodeParameters,
			credentials: props.node.credentials,
		};

		if (params.filter) {
			requestParams.filter = params.filter;
		}

		if (paginationToken) {
			requestParams.paginationToken = paginationToken;
		}

		const response = await nodeTypesStore.getResourceLocatorResults(requestParams);

		setResponse(paramsKey, {
			results: (cachedResponse?.results ?? []).concat(response.results),
			nextPageToken: response.paginationToken ?? null,
			loading: false,
			error: false,
		});

		if (params.filter && !hasCompletedASearch.value) {
			hasCompletedASearch.value = true;
			trackEvent('User searched resource locator list');
		}
	} catch (e) {
		setResponse(paramsKey, {
			loading: false,
			error: true,
		});
	}
}

function onInputFocus(): void {
	if (!isListMode.value || resourceDropdownVisible.value) {
		return;
	}

	void loadInitialResources();
	showResourceDropdown();
}

function switchFromListMode(): void {
	if (isListMode.value && props.parameter.modes && props.parameter.modes.length > 1) {
		const mode =
			findModeByName('id') ?? props.parameter.modes.filter(({ name }) => name !== 'list')[0];

		if (mode) {
			emit('update:modelValue', {
				__rl: true,
				value:
					props.modelValue && typeof props.modelValue === 'object' ? props.modelValue.value : '',
				mode: mode.name,
			});
		}
	}
}

function hideResourceDropdown() {
	if (!resourceDropdownVisible.value) {
		return;
	}

	resourceDropdownVisible.value = false;
	resourceDropdownHiding.value = true;

	void nextTick(() => {
		inputRef.value?.blur();
		resourceDropdownHiding.value = false;
	});
}

function showResourceDropdown() {
	if (resourceDropdownVisible.value || resourceDropdownHiding.value) {
		return;
	}

	resourceDropdownVisible.value = true;
}

function onListItemSelected(value: NodeParameterValue) {
	onInputChange(value);
	hideResourceDropdown();
}

function onInputBlur() {
	if (!isSearchable.value || currentQueryError.value) {
		hideResourceDropdown();
	}
	emit('blur');
}
</script>

<template>
	<div
		ref="containerRef"
		class="resource-locator"
		:data-test-id="`resource-locator-${parameter.name}`"
	>
		<ResourceLocatorDropdown
			ref="dropdownRef"
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
						{{ i18n.baseText('resourceLocator.mode.list.error.title') }}
					</n8n-text>
					<n8n-text v-if="hasCredential || credentialsNotSet" size="small" color="text-base">
						{{ i18n.baseText('resourceLocator.mode.list.error.description.part1') }}
						<a v-if="credentialsNotSet" @click="createNewCredential">{{
							i18n.baseText('resourceLocator.mode.list.error.description.part2.noCredentials')
						}}</a>
						<a v-else-if="hasCredential" @click="openCredential">{{
							i18n.baseText('resourceLocator.mode.list.error.description.part2.hasCredentials')
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
						:placeholder="i18n.baseText('resourceLocator.modeSelector.placeholder')"
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
									? i18n.baseText('resourceLocator.mode.list.disabled.title')
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
									ref="inputRef"
									:model-value="expressionDisplayValue"
									:path="path"
									:rows="3"
									@update:model-value="onInputChange"
									@modal-opener-click="emit('modalOpenerClick')"
								/>
								<n8n-input
									v-else
									ref="inputRef"
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

<style lang="scss" module>
@import './resourceLocator.scss';
</style>
