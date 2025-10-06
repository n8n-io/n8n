<script setup lang="ts">
import type { ResourceLocatorRequestDto, ActionResultRequestDto } from '@n8n/api-types';
import type { IResourceLocatorResultExpanded, IUpdateInformation } from '@/Interface';
import DraggableTarget from '@/components/DraggableTarget.vue';
import ExpressionParameterInput from '@/components/ExpressionParameterInput.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import { useDebounce } from '@/composables/useDebounce';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { ndvEventBus } from '@/event-bus';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import {
	getAppNameFromNodeName,
	getMainAuthField,
	hasOnlyListMode as hasOnlyListModeUtil,
} from '@/utils/nodeTypesUtils';
import stringify from 'fast-json-stable-stringify';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import {
	isResourceLocatorValue,
	type INode,
	type INodeListSearchItems,
	type INodeParameterResourceLocator,
	type INodeParameters,
	type INodeProperties,
	type INodePropertyMode,
	type INodePropertyModeTypeOptions,
	type NodeParameterValue,
} from 'n8n-workflow';
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onMounted,
	type Ref,
	ref,
	useCssModule,
	watch,
} from 'vue';
import ResourceLocatorDropdown from './ResourceLocatorDropdown.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { onClickOutside, type VueInstance } from '@vueuse/core';
import {
	buildValueFromOverride,
	isFromAIOverrideValue,
	makeOverrideValue,
	updateFromAIOverrideValues,
	type FromAIOverride,
} from '../../utils/fromAIOverrideUtils';
import { completeExpressionSyntax } from '@/utils/expressions';
import { useProjectsStore } from '@/stores/projects.store';
import FromAiOverrideButton from '@/components/ParameterInputOverrides/FromAiOverrideButton.vue';
import FromAiOverrideField from '@/components/ParameterInputOverrides/FromAiOverrideField.vue';
import ParameterOverrideSelectableList from '@/components/ParameterInputOverrides/ParameterOverrideSelectableList.vue';

import {
	N8nIcon,
	N8nInput,
	N8nLink,
	N8nNotice,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
/**
 * Regular expression to check if the error message contains credential-related phrases.
 */
const CHECK_CREDENTIALS_REGEX = /check\s+(your\s+)?credentials?/i;
/**
 * Error codes and messages that indicate a permission error.
 */
const PERMISSION_ERROR_CODES = ['401', '403'];
const NODE_API_AUTH_ERROR_MESSAGES = [
	'NodeApiError: Authorization failed',
	'NodeApiError: Unable to sign without access token',
	'secretOrPrivateKey must be an asymmetric key when using RS256',
];

interface IResourceLocatorQuery {
	results: INodeListSearchItems[];
	nextPageToken: unknown;
	error: boolean;
	errorDetails?: {
		message?: string;
		description?: string;
		httpCode?: string;
		stackTrace?: string;
	};
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

const workflowHelpers = useWorkflowHelpers();
const { callDebounced } = useDebounce();
const i18n = useI18n();
const telemetry = useTelemetry();
const $style = useCssModule();

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
const projectsStore = useProjectsStore();

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

/**
 * Check if the current response contains an error that indicates a credential issue.
 * We do this by checking error http code
 * But, since out NodeApiErrors sometimes just return 500, we also check the message and stack trace
 */
const hasCredentialError = computed(() => {
	const stackTraceContainsCredentialError = (currentResponse.value?.errorDetails?.stackTrace ?? '')
		.split('\n')
		.some((line) => NODE_API_AUTH_ERROR_MESSAGES.includes(line.trim()));

	return (
		PERMISSION_ERROR_CODES.includes(currentResponse.value?.errorDetails?.httpCode ?? '') ||
		NODE_API_AUTH_ERROR_MESSAGES.includes(currentResponse.value?.errorDetails?.message ?? '') ||
		stackTraceContainsCredentialError
	);
});

const credentialsRequiredAndNotSet = computed(() => {
	if (!props.node) return false;
	if (skipCredentialsCheckInRLC.value) return false;
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
const valueToDisplay = computed<INodeParameterResourceLocator['value']>(() => {
	if (typeof props.modelValue !== 'object') {
		return `${props.modelValue}`;
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
		projectId: projectsStore.currentProjectId,
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

const skipCredentialsCheckInRLC = computed(
	() => !!getPropertyArgument(currentMode.value, 'skipCredentialsCheckInRLC'),
);

const requiresSearchFilter = computed(
	() => !!getPropertyArgument(currentMode.value, 'searchFilterRequired'),
);

const fromAIOverride = ref<FromAIOverride | null>(
	makeOverrideValue(
		{
			value: props.modelValue?.value ?? '',
			...props,
		},
		props.node,
	),
);

const canBeContentOverride = computed(() => {
	if (!props.node) return false;

	return fromAIOverride.value !== null;
});

const isContentOverride = computed(
	() =>
		canBeContentOverride.value &&
		!!isFromAIOverrideValue(props.modelValue?.value?.toString() ?? ''),
);

const showOverrideButton = computed(
	() => canBeContentOverride.value && !isContentOverride.value && !props.isReadOnly,
);

const allowNewResources = computed(() => {
	if (!props.node) {
		return undefined;
	}

	const addNewResourceOptions = getPropertyArgument(currentMode.value, 'allowNewResource');

	if (!addNewResourceOptions || typeof addNewResourceOptions !== 'object') {
		return undefined;
	}

	return {
		label: i18n.baseText(addNewResourceOptions.label as BaseTextKey, {
			interpolate: {
				resourceName: searchFilter.value
					? searchFilter.value
					: (addNewResourceOptions.defaultName ?? ''),
			},
		}),
		method: addNewResourceOptions.method,
		url: addNewResourceOptions.url,
	};
});

const handleAddResourceClick = async () => {
	if (!props.node || !allowNewResources.value) {
		return;
	}

	const { method: addNewResourceMethodName, url: redirectUrl } = allowNewResources.value;

	if (redirectUrl) {
		let resolvedUrl = redirectUrl;

		if (resolvedUrl.includes('{{$projectId}}')) {
			resolvedUrl = resolvedUrl.replace(
				/\{\{\$projectId\}\}/g,
				projectsStore.currentProjectId ?? '',
			);
		}

		hideResourceDropdown();
		openResource(resolvedUrl);
		return;
	}

	const resolvedNodeParameters = workflowHelpers.resolveRequiredParameters(
		props.parameter,
		currentRequestParams.value.parameters,
	);

	if (!resolvedNodeParameters || !addNewResourceMethodName) {
		return;
	}

	const requestParams: ActionResultRequestDto = {
		nodeTypeAndVersion: {
			name: props.node.type,
			version: props.node.typeVersion,
		},
		path: props.path,
		currentNodeParameters: resolvedNodeParameters,
		credentials: props.node.credentials,
		handler: addNewResourceMethodName,
		payload: {
			name: searchFilter.value,
		},
	};

	const newResource = (await nodeTypesStore.getNodeParameterActionResult(
		requestParams,
	)) as NodeParameterValue;
	if (typeof newResource === 'boolean') {
		return;
	}

	refreshList();
	await loadResources();
	searchFilter.value = '';
	onListItemSelected(newResource);
};

const onAddResourceClicked = computed(() =>
	allowNewResources.value && (allowNewResources.value.method || allowNewResources.value.url)
		? handleAddResourceClick
		: undefined,
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
	async (newValue) => {
		if (newValue) {
			switchFromListMode();
		}
		await nextTick();
		inputRef.value?.focus();
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
): string | number | boolean | INodePropertyModeTypeOptions['allowNewResource'] | undefined {
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

function getModeLabel(mode: INodePropertyMode): string | undefined {
	if (mode.name === 'id' || mode.name === 'url' || mode.name === 'list') {
		return i18n.baseText(`resourceLocator.mode.${mode.name}`);
	}

	return mode.displayName;
}

function onInputChange(value: INodeParameterResourceLocator['value']): void {
	const params: INodeParameterResourceLocator = { __rl: true, value, mode: selectedMode.value };
	if (isListMode.value) {
		const resource = currentQueryResults.value.find((result) => result.value === value);
		if (resource?.name) {
			params.cachedResultName = resource.name;
		}

		if (resource?.url) {
			params.cachedResultUrl = resource.url;
		}
	} else {
		params.value = completeExpressionSyntax(value);
	}
	emit('update:modelValue', params);
}

function onInputMouseDown(event: MouseEvent): void {
	if (isListMode.value) {
		event.preventDefault();
	}
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
	} else if (value === 'id' && selectedMode.value === 'list' && props.modelValue?.value) {
		emit('update:modelValue', { __rl: true, mode: value, value: props.modelValue.value });
	} else {
		const currentValue = props.modelValue?.value ?? '';
		emit('update:modelValue', { __rl: true, mode: value, value: currentValue });
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
	// Force reactivity by creating a completely new cached responses object
	const existingResponse = cachedResponses.value[paramsKey] || {};
	const newResponse = { ...existingResponse, ...response };

	cachedResponses.value = {
		...cachedResponses.value,
		[paramsKey]: newResponse,
	};
}

async function loadResources() {
	const params = currentRequestParams.value;
	const paramsKey = currentRequestKey.value;
	const cachedResponse = cachedResponses.value[paramsKey];

	if (credentialsRequiredAndNotSet.value) {
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

		const requestParams: ResourceLocatorRequestDto = {
			nodeTypeAndVersion: {
				name: props.node.type,
				version: props.node.typeVersion,
			},
			path: props.path,
			methodName: loadOptionsMethod,
			currentNodeParameters: resolvedNodeParameters,
			credentials: props.node.credentials,
			projectId: projectsStore.currentProjectId,
		};

		if (params.filter) {
			requestParams.filter = params.filter;
		}

		if (paginationToken) {
			requestParams.paginationToken = paginationToken;
		}

		const response = await nodeTypesStore.getResourceLocatorResults(requestParams);

		const responseData = {
			results: (cachedResponse?.results ?? []).concat(response.results),
			nextPageToken: response.paginationToken ?? null,
			loading: false,
			error: false,
		};

		// Store response under the original key to prevent cache pollution
		setResponse(paramsKey, responseData);

		// If the key changed during the request, also store under current key to prevent infinite loading
		const currentKey = currentRequestKey.value;
		if (currentKey !== paramsKey) {
			setResponse(currentKey, responseData);
		}

		if (params.filter && !hasCompletedASearch.value) {
			hasCompletedASearch.value = true;
			trackEvent('User searched resource locator list');
		}
	} catch (e) {
		const errorData = {
			loading: false,
			error: true,
			errorDetails: {
				message: removeDuplicateTextFromErrorMessage(e.message),
				description: e.description,
				httpCode: e.httpCode,
				stackTrace: e.stacktrace,
			},
		};

		// Store error under the original key
		setResponse(paramsKey, errorData);

		// If the key changed during the request, also store under current key to prevent infinite loading
		const currentKey = currentRequestKey.value;
		if (currentKey !== paramsKey) {
			setResponse(currentKey, errorData);
		}
	}
}

/**
 * Removes duplicate credential-related sentences from error messages.
 * We are already showing a link to create/check the credentials, so we don't need to repeat the same message.
 */
function removeDuplicateTextFromErrorMessage(message: string): string {
	let segments: string[] = [];

	// Split message into sentences or segments
	if (/[-–—]/.test(message)) {
		// By various dash types
		segments = message.split(/\s*[-–—]\s*/);
	} else {
		// By sentence boundaries
		segments = message.split(/(?<=[.!?])\s+/);
	}

	// Filter out segments containing credential check phrases
	const filteredSegments = segments.filter((segment: string) => {
		if (!segment.trim()) return false;
		return !CHECK_CREDENTIALS_REGEX.test(segment);
	});

	return filteredSegments.join(' ').trim();
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

function onListItemSelected(value: INodeParameterResourceLocator['value']) {
	onInputChange(value);
	hideResourceDropdown();
}

function onInputBlur(event: FocusEvent) {
	// Do not blur if focus is within the dropdown
	const newTarget = event.relatedTarget;
	if (newTarget instanceof HTMLElement && dropdownRef.value?.isWithinDropdown(newTarget)) {
		return;
	}

	if (!isSearchable.value || currentQueryError.value) {
		hideResourceDropdown();
	}
	emit('blur');
}

function applyOverride() {
	if (!props.node || !fromAIOverride.value) return;

	telemetry.track('User turned on fromAI override', {
		nodeType: props.node.type,
		parameter: props.path,
	});
	updateFromAIOverrideValues(fromAIOverride.value, props.modelValue.value?.toString() ?? '');

	emit('update:modelValue', {
		...props.modelValue,
		value: buildValueFromOverride(fromAIOverride.value, props, true),
	});
}

function removeOverride() {
	if (!props.node || !fromAIOverride.value) return;

	telemetry.track('User turned off fromAI override', {
		nodeType: props.node.type,
		parameter: props.path,
	});
	emit('update:modelValue', {
		...props.modelValue,
		value: buildValueFromOverride(fromAIOverride.value, props, false),
	});
	void setTimeout(() => {
		inputRef.value?.focus();
		inputRef.value?.select();
	}, 0);
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
			:model-value="modelValue"
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
			:allow-new-resources="allowNewResources"
			@update:model-value="onListItemSelected"
			@filter="onSearchFilter"
			@load-more="loadResourcesDebounced"
			@add-resource-click="onAddResourceClicked"
		>
			<template #error>
				<div :class="$style.errorContainer" data-test-id="rlc-error-container">
					<N8nText
						v-if="credentialsRequiredAndNotSet || currentResponse.errorDetails"
						color="text-dark"
						align="center"
						tag="div"
					>
						{{ i18n.baseText('resourceLocator.mode.list.error.title') }}
					</N8nText>
					<div v-if="currentResponse.errorDetails" :class="$style.errorDetails">
						<N8nText size="small">
							<span v-if="currentResponse.errorDetails.httpCode" data-test-id="rlc-error-code">
								{{ currentResponse.errorDetails.httpCode }} -
							</span>
							<span data-test-id="rlc-error-message">{{
								currentResponse.errorDetails.message
							}}</span>
						</N8nText>
						<N8nNotice
							v-if="currentResponse.errorDetails.description"
							theme="warning"
							:class="$style.errorDescription"
						>
							{{ currentResponse.errorDetails.description }}
						</N8nNotice>
					</div>
					<div
						v-if="hasCredentialError || credentialsRequiredAndNotSet"
						data-test-id="permission-error-link"
					>
						<a
							v-if="credentialsRequiredAndNotSet"
							:class="$style['credential-link']"
							@click="createNewCredential"
						>
							{{ i18n.baseText('resourceLocator.mode.list.error.description.noCredentials') }}
						</a>
						<a v-else :class="$style['credential-link']" @click="openCredential">
							{{ i18n.baseText('resourceLocator.mode.list.error.description.checkCredentials') }}
						</a>
					</div>
				</div>
			</template>
			<div
				:class="{
					[$style.resourceLocator]: true,
					[$style.multipleModes]: hasMultipleModes,
					[$style.inputContainerInputCorners]:
						hasMultipleModes && canBeContentOverride && !isContentOverride,
				}"
			>
				<div
					:class="[
						$style.background,
						{
							[$style.backgroundOverride]: showOverrideButton,
						},
					]"
				></div>
				<div v-if="hasMultipleModes" :class="$style.modeSelector">
					<N8nSelect
						:model-value="selectedMode"
						:size="inputSize"
						:disabled="isReadOnly"
						:placeholder="i18n.baseText('resourceLocator.modeSelector.placeholder')"
						data-test-id="rlc-mode-selector"
						@update:model-value="onModeSelected"
					>
						<N8nOption
							v-for="mode in parameter.modes"
							:key="mode.name"
							:data-test-id="`mode-${mode.name}`"
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
						</N8nOption>
					</N8nSelect>
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
								:class="[
									{
										[$style.listModeInputContainer]: isListMode,
										[$style.droppable]: droppable,
										[$style.activeDrop]: activeDrop,
										[$style.rightNoCorner]: canBeContentOverride && !isContentOverride,
									},
								]"
								@keydown.stop="onKeyDown"
							>
								<FromAiOverrideField
									v-if="fromAIOverride && isContentOverride"
									:class="[$style.inputField, $style.fromAiOverrideField]"
									:is-read-only="isReadOnly"
									@close="removeOverride"
								/>
								<ExpressionParameterInput
									v-else-if="isValueExpression || forceShowExpression"
									ref="inputRef"
									:class="$style.inputField"
									:model-value="expressionDisplayValue"
									:path="path"
									:rows="3"
									@update:model-value="onInputChange"
									@modal-opener-click="emit('modalOpenerClick')"
								/>
								<N8nInput
									v-else
									ref="inputRef"
									:class="[
										$style.inputField,
										{
											[$style.selectInput]: isListMode,
											[$style.rightNoCorner]: canBeContentOverride && !isContentOverride,
										},
									]"
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
									@mousedown="onInputMouseDown"
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
								</N8nInput>
								<div v-if="showOverrideButton" :class="$style.overrideButtonInline">
									<FromAiOverrideButton @click="applyOverride" />
								</div>
							</div>
						</template>
					</DraggableTarget>
					<ParameterIssues
						v-if="parameterIssues && parameterIssues.length"
						:issues="parameterIssues"
						:class="$style['parameter-issues']"
					/>
					<div v-else-if="urlValue" :class="$style.openResourceLink">
						<N8nLink theme="text" @click.stop="openResource(urlValue)">
							<N8nIcon icon="external-link" :title="getLinkAlt(valueToDisplay)" />
						</N8nLink>
					</div>
				</div>
			</div>
		</ResourceLocatorDropdown>
		<ParameterOverrideSelectableList
			v-if="isContentOverride && fromAIOverride"
			v-model="fromAIOverride"
			:parameter="parameter"
			:path="path"
			:is-read-only="isReadOnly"
			@update="(x: IUpdateInformation) => onInputChange(x.value?.toString())"
		/>
	</div>
</template>

<style lang="scss" module>
@use './resourceLocator.scss';
</style>
