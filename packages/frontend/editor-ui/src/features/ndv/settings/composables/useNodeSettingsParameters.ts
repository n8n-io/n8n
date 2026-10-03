import get from 'lodash/get';
import set from 'lodash/set';
import { computed, type Ref } from 'vue';
import {
	type INode,
	type INodeParameters,
	type INodeProperties,
	type INodeTypeDescription,
	type NodeParameterValue,
	type NodeParameterValueType,
	type DeploymentCondition,
	NodeHelpers,
	deepCopy,
	isExpression,
	isINodePropertyOptionsList,
} from 'n8n-workflow';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import {
	mustHideDuringCustomApiCall,
	setValue,
	updateDynamicConnections,
	updateParameterByPath,
} from '@/features/ndv/shared/ndv.utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { CHAT_TRIGGER_NODE_TYPE, KEEP_AUTH_IN_NDV_FOR_NODES } from '@/app/constants';
import {
	getMainAuthField,
	getNodeAuthFields,
	isAuthRelatedParameter,
} from '@/app/utils/nodeTypesUtils';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';
import { reconcileNodeFromAIKeys } from '@/features/ndv/parameters/utils/fromAIOverride.utils';

const hasPublicDisplayCondition = (parameter: INodeProperties, value: boolean) =>
	parameter.displayOptions?.show?.public?.includes(value) ?? false;

const stripPublicDisplayCondition = (parameter: INodeProperties): INodeProperties => {
	const displayOptions = parameter.displayOptions;
	if (!displayOptions?.show?.public) {
		return parameter;
	}

	const { public: _public, ...show } = displayOptions.show;

	return {
		...parameter,
		displayOptions: {
			...displayOptions,
			...(Object.keys(show).length > 0 ? { show } : {}),
		},
	};
};

/**
 * Declarations that share a name also share one stored value, which carries over when
 * another of them becomes visible. A value only fits declarations of the same shape.
 * `options` and `string` both hold plain strings, so they share one.
 */
export function getParameterValueShape(parameter: INodeProperties): string {
	const type = parameter.type === 'options' ? 'string' : parameter.type;
	const list = parameter.typeOptions?.multipleValues === true ? '[]' : '';
	// getNodeParameters strips the "=" of these, which would break a carried expression
	const expression = parameter.noDataExpression === true ? '!expr' : '';
	return `${type}${list}${expression}`;
}

const PLAIN_PARAMETER_TYPES = new Set<INodeProperties['type']>([
	'string',
	'number',
	'boolean',
	'options',
	'dateTime',
	'color',
]);

export function isObjectInPlainParameter(parameter: INodeProperties, value: unknown): boolean {
	return (
		PLAIN_PARAMETER_TYPES.has(parameter.type) &&
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value)
	);
}

const mixedShapeDeclarationsCache = new WeakMap<
	INodeProperties[],
	Map<string, INodeProperties[]>
>();

function getMixedShapeDeclarations(properties: INodeProperties[]) {
	const cached = mixedShapeDeclarationsCache.get(properties);
	if (cached) return cached;

	const byName = new Map<string, INodeProperties[]>();
	for (const property of properties) {
		byName.set(property.name, [...(byName.get(property.name) ?? []), property]);
	}
	const mixed = new Map(
		[...byName].filter(
			([, declarations]) => new Set(declarations.map(getParameterValueShape)).size > 1,
		),
	);
	mixedShapeDeclarationsCache.set(properties, mixed);
	return mixed;
}

// The same resolution getNodeParameters does internally for its display checks
function getDisplayValues(nodeType: INodeTypeDescription, values: INodeParameters, node: INode) {
	return (
		NodeHelpers.getNodeParameters(nodeType.properties, values, true, true, node, nodeType, {
			onlySimpleTypes: true,
			dataIsResolved: true,
		}) ?? {}
	);
}

type Visibility = { declaration: INodeProperties; shape: string } | 'hidden' | 'ambiguous';

function getVisibleDeclaration(
	declarations: INodeProperties[],
	displayValues: INodeParameters,
	node: INode,
	nodeType: INodeTypeDescription,
): Visibility {
	const visible = declarations.filter((declaration) =>
		NodeHelpers.displayParameter(displayValues, declaration, node, nodeType),
	);
	if (visible.length === 0) return 'hidden';
	const shapes = new Set(visible.map(getParameterValueShape));
	return shapes.size === 1 ? { declaration: visible[0], shape: [...shapes][0] } : 'ambiguous';
}

// Editor session memory only, never saved with the workflow
const valuesByShape = new Map<string, NodeParameterValueType>();

const stashKey = (nodeId: string, name: string, shape: string) =>
	JSON.stringify([nodeId, name, shape]);

function stashValue(
	nodeId: string,
	name: string,
	shape: string,
	value: NodeParameterValueType | undefined,
) {
	const key = stashKey(nodeId, name, shape);
	if (value === undefined) {
		valuesByShape.delete(key);
	} else {
		valuesByShape.set(key, deepCopy(value));
	}
}

function getStashedValue(nodeId: string, name: string, shape: string) {
	const value = valuesByShape.get(stashKey(nodeId, name, shape));
	return value === undefined ? undefined : deepCopy(value);
}

// A restored value can come from a declaration with other options. Loaded option lists
// are not known here, so only fixed ones are checked.
function isOffered(declaration: INodeProperties, value: NodeParameterValueType): boolean {
	if (!['options', 'multiOptions'].includes(declaration.type) || isExpression(value)) return true;
	if (!declaration.options || !isINodePropertyOptionsList(declaration.options)) return true;

	const offered = declaration.options.map((option) => option.value);
	return (Array.isArray(value) ? value : [value]).every((item) =>
		offered.some((option) => option === item),
	);
}

/**
 * When a change hides a name or shows a declaration of another shape under it, the old
 * value is stashed under its shape. A declaration that shows up gets back the value it
 * held before, or its default.
 */
function swapValuesByShape(
	nodeType: INodeTypeDescription,
	node: INode,
	parameters: INodeParameters,
	changedPath: string,
): INodeParameters | undefined {
	const declarations = getMixedShapeDeclarations(nodeType.properties);
	if (declarations.size === 0) return undefined;

	const changedName = changedPath.split(/[.[]/)[0];
	const before = getDisplayValues(nodeType, node.parameters, node);
	const after = getDisplayValues(nodeType, parameters, node);
	const swaps = [...declarations].flatMap(([name, candidates]) => {
		if (name === changedName) return [];
		const from = getVisibleDeclaration(candidates, before, node, nodeType);
		const to = getVisibleDeclaration(candidates, after, node, nodeType);
		if (from === 'ambiguous' || to === 'ambiguous' || from === to) return [];
		if (from !== 'hidden' && to !== 'hidden' && from.shape === to.shape) return [];
		return [{ name, from, to }];
	});
	if (swaps.length === 0) return undefined;

	return swaps.reduce<INodeParameters>((patched, { name, from, to }) => {
		if (from !== 'hidden') {
			const previous = node.parameters[name];
			// A value that already does not fit its declaration is not worth restoring
			const fits = !isObjectInPlainParameter(from.declaration, previous);
			stashValue(node.id, name, from.shape, fits ? previous : undefined);
		}
		// getNodeParameters drops the value of a hidden name
		if (to === 'hidden') return patched;

		const { [name]: _replaced, ...rest } = patched;
		const restored = getStashedValue(node.id, name, to.shape);
		return restored !== undefined && isOffered(to.declaration, restored)
			? { ...rest, [name]: restored }
			: rest;
	}, parameters);
}

/**
 * A debounced write can land after the change that hid the name or showed a declaration
 * of another shape. Such a value belongs to the declaration that emitted it, so it is
 * stashed instead of written.
 */
function stashLateWriteOfOtherShape(
	nodeType: INodeTypeDescription,
	node: INode,
	parameterData: IUpdateInformation & { name: `parameters.${string}` },
	value: NodeParameterValue,
): boolean {
	const name = parameterData.name.slice('parameters.'.length);
	const { valueShape } = parameterData;
	if (!valueShape || /[.[]/.test(name)) return false;

	const candidates = getMixedShapeDeclarations(nodeType.properties).get(name);
	if (!candidates) return false;

	const displayValues = getDisplayValues(nodeType, node.parameters, node);
	const visible = getVisibleDeclaration(candidates, displayValues, node, nodeType);
	if (visible === 'ambiguous') return false;
	if (visible !== 'hidden' && visible.shape === valueShape) return false;

	stashValue(node.id, name, valueShape, value);
	return true;
}

export function useNodeSettingsParameters() {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const ndvStore = computed(() => useNDVStore(workflowDocumentStore.value.documentId));
	const nodeTypesStore = useNodeTypesStore();
	const settingsStore = useSettingsStore();
	const { check: envFeatureFlag } = useEnvFeatureFlag();
	const telemetry = useTelemetry();
	const nodeHelpers = useNodeHelpers();
	const workflowHelpers = useWorkflowHelpers();
	const canvasOperations = useCanvasOperations();
	const externalHooks = useExternalHooks();

	function updateNodeParameter(
		nodeValues: Ref<INodeParameters>,
		parameterData: IUpdateInformation & { name: `parameters.${string}` },
		newValue: NodeParameterValue,
		node: INode,
		isToolNode: boolean,
	) {
		const nodeTypeDescription = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeTypeDescription) {
			return;
		}

		if (stashLateWriteOfOtherShape(nodeTypeDescription, node, parameterData, newValue)) {
			return;
		}

		// Get only the parameters which are different to the defaults
		let nodeParameters = NodeHelpers.getNodeParameters(
			nodeTypeDescription.properties,
			node.parameters,
			false,
			false,
			node,
			nodeTypeDescription,
		);

		const oldNodeParameters = Object.assign({}, nodeParameters);

		// Copy the data because it is the data of vuex so make sure that
		// we do not edit it directly
		nodeParameters = deepCopy(nodeParameters);

		const parameterPath = updateParameterByPath(
			parameterData.name,
			newValue,
			nodeParameters,
			nodeTypeDescription,
			node.typeVersion,
		);

		const swapped =
			nodeParameters && swapValuesByShape(nodeTypeDescription, node, nodeParameters, parameterPath);
		if (swapped) {
			nodeParameters = swapped;
		}

		// Get the parameters with the now new defaults according to the
		// from the user actually defined parameters
		nodeParameters = NodeHelpers.getNodeParameters(
			nodeTypeDescription.properties,
			nodeParameters as INodeParameters,
			true,
			false,
			node,
			nodeTypeDescription,
		);

		if (isToolNode) {
			const updatedDescription = NodeHelpers.getUpdatedToolDescription(
				nodeTypeDescription,
				nodeParameters,
				node.parameters,
			);

			if (updatedDescription && nodeParameters) {
				nodeParameters.toolDescription = updatedDescription;
			}

			if (nodeParameters) {
				reconcileNodeFromAIKeys(nodeTypeDescription.properties, nodeParameters);
			}
		}

		if (NodeHelpers.isDefaultNodeName(node.name, nodeTypeDescription, node.parameters ?? {})) {
			const newName = NodeHelpers.makeNodeName(nodeParameters ?? {}, nodeTypeDescription);
			// Account for unique-ified nodes with `<name><digit>`
			if (!node.name.startsWith(newName)) {
				// We need a timeout here to support events reacting to the valueChange based on node names
				setTimeout(async () => await canvasOperations.renameNode(node.name, newName));
			}
		}

		for (const [key, value] of Object.entries(nodeParameters as object)) {
			if (value !== null && value !== undefined) {
				setValue(nodeValues, `parameters.${key}`, value as string);
			}
		}

		// Update the data in vuex
		const updateInformation: IUpdateInformation = {
			name: node.name,
			value: nodeParameters,
		};

		const connections = workflowDocumentStore.value.connectionsBySourceNode;

		const updatedConnections = updateDynamicConnections(node, connections, parameterData);

		if (updatedConnections) {
			workflowDocumentStore.value.setConnections(updatedConnections);
		}

		workflowDocumentStore.value.setNodeParameters(updateInformation);

		void externalHooks.run('nodeSettings.valueChanged', {
			parameterPath,
			newValue,
			parameters: nodeTypeDescription.properties,
			oldNodeParameters,
		});

		nodeHelpers.updateNodeParameterIssuesByName(node.name);
		nodeHelpers.updateNodeCredentialIssuesByName(node.name);
		telemetry.trackNodeParametersValuesChange(nodeTypeDescription.name, parameterData);
	}

	function handleFocus(node: INodeUi | undefined, path: string, parameter: INodeProperties) {
		if (!node) return;

		const focusPanelStore = useFocusPanelStore();

		focusPanelStore.openWithFocusedNodeParameter({
			nodeId: node.id,
			parameterPath: path,
			parameter,
		});

		if (ndvStore.value.activeNode) {
			ndvStore.value.unsetActiveNodeName();
			ndvStore.value.resetNDVPushRef();
		}
	}

	async function shouldDisplayNodeParameter(
		nodeParameters: INodeParameters,
		node: INodeUi | null,
		parameter: INodeProperties,
		path: string | undefined = '',
		displayKey: 'displayOptions' | 'disabledOptions' = 'displayOptions',
	): Promise<boolean> {
		// Fast path: hidden parameters are never displayed
		if (parameter.type === 'hidden') {
			return false;
		}

		if (
			displayKey === 'displayOptions' &&
			typeof parameter.envFeatureFlag === 'string' &&
			!envFeatureFlag.value(parameter.envFeatureFlag)
		) {
			return false;
		}

		// Cache node type lookup - used multiple times
		const nodeType = node ? nodeTypesStore.getNodeType(node.type, node.typeVersion) : null;
		const nodeTypeValue = node?.type ?? '';

		let effectiveParameter = parameter;

		if (
			displayKey === 'displayOptions' &&
			nodeTypeValue === CHAT_TRIGGER_NODE_TYPE &&
			settingsStore.isPublicChatTriggerDisabled
		) {
			if (
				effectiveParameter.name === 'public' ||
				hasPublicDisplayCondition(effectiveParameter, true)
			) {
				return false;
			}

			if (hasPublicDisplayCondition(effectiveParameter, false)) {
				effectiveParameter = stripPublicDisplayCondition(effectiveParameter);
			}
		}

		const deployment: DeploymentCondition = settingsStore.isCloudDeployment ? 'cloud' : 'hosted';

		if (
			displayKey === 'displayOptions' &&
			effectiveParameter.displayOptions?.showOnDeployment &&
			effectiveParameter.displayOptions.showOnDeployment !== deployment
		) {
			return false;
		}

		// Fast path: hide parameters explicitly marked as cloud-only on cloud deployments
		if (effectiveParameter.displayOptions?.hideOnCloud && settingsStore.isCloudDeployment) {
			return false;
		}

		// Fast path: if no display/disabled options defined, no need for further checks
		const hasDisplayOptions = effectiveParameter[displayKey] !== undefined;

		// Check custom API call - only compute if needed
		if (
			nodeHelpers.isCustomApiCallSelected(nodeParameters) &&
			mustHideDuringCustomApiCall(effectiveParameter, nodeParameters)
		) {
			return false;
		}

		// Auth-related parameter handling - only compute if not in KEEP_AUTH_IN_NDV_FOR_NODES
		if (!KEEP_AUTH_IN_NDV_FOR_NODES.includes(nodeTypeValue)) {
			const mainNodeAuthField = getMainAuthField(nodeType);

			if (mainNodeAuthField) {
				// Check if parameter is the main auth field itself
				if (effectiveParameter.name === mainNodeAuthField.name) {
					return false;
				}

				// Only compute auth fields if we have a main auth field
				// TODO: For now, hide all fields that are used in authentication fields displayOptions
				// Ideally, we should check if any non-auth field depends on it before hiding it but
				// since there is no such case, omitting it to avoid additional computation
				if (isAuthRelatedParameter(getNodeAuthFields(nodeType), effectiveParameter)) {
					return false;
				}
			}
		}

		// Hide chat hub toggle on chat trigger when module isn't enabled.
		// Remove this check when feature is generally available.
		if (
			nodeType?.name === CHAT_TRIGGER_NODE_TYPE &&
			effectiveParameter.name === 'availableInChat' &&
			!settingsStore.isChatFeatureEnabled
		) {
			return false;
		}

		// Fast path: no display options means parameter should be displayed
		if (!hasDisplayOptions) {
			return true;
		}

		// Get raw values at path
		const rawValues = path ? (get(nodeParameters, path) as INodeParameters) : nodeParameters;

		if (!rawValues) {
			return false;
		}

		// Check if any expressions need resolution
		const keys = Object.keys(rawValues);
		const keyCount = keys.length;

		// Fast path: no keys means nothing to resolve
		if (keyCount === 0) {
			return nodeHelpers.displayParameter(
				nodeParameters,
				effectiveParameter,
				path,
				node,
				displayKey,
			);
		}

		// Check if we have any expressions to resolve (scan first to avoid unnecessary work)
		let hasExpressions = false;
		for (let i = 0; i < keyCount; i++) {
			const value = rawValues[keys[i]];
			if (typeof value === 'string' && value.charAt(0) === '=') {
				hasExpressions = true;
				break;
			}
		}

		// Fast path: no expressions means we can use original parameters directly
		if (!hasExpressions) {
			return nodeHelpers.displayParameter(
				nodeParameters,
				effectiveParameter,
				path,
				node,
				displayKey,
			);
		}

		// Resolve expressions - use index-based iteration for better performance
		const nodeParams: INodeParameters = {};
		const pendingKeys: string[] = [];
		let parameterGotResolved = false;

		// First pass: resolve non-dependent expressions and collect plain values
		for (let i = 0; i < keyCount; i++) {
			const key = keys[i];
			const value = rawValues[key];

			if (typeof value === 'string' && value.charCodeAt(0) === 61) {
				// 61 is '='
				// Check if expression depends on other parameters that haven't been resolved yet
				if (value.includes('$parameter')) {
					// Check if any remaining key is referenced in this expression
					let hasDependency = false;
					for (let j = i + 1; j < keyCount; j++) {
						if (value.includes(keys[j])) {
							hasDependency = true;
							break;
						}
					}
					// Also check already-deferred keys in pendingKeys
					if (!hasDependency) {
						for (let j = 0; j < pendingKeys.length; j++) {
							if (value.includes(pendingKeys[j])) {
								hasDependency = true;
								break;
							}
						}
					}
					if (hasDependency) {
						pendingKeys.push(key);
						continue;
					}
				}

				// Resolve expression
				try {
					nodeParams[key] = (await workflowHelpers.resolveExpression(
						value,
						nodeParams,
					)) as NodeParameterValue;
				} catch {
					nodeParams[key] = '';
				}
				parameterGotResolved = true;
			} else {
				nodeParams[key] = rawValues[key];
			}
		}

		// Second pass: resolve pending expressions (those with dependencies)
		// Use index-based iteration to avoid shift() which is O(n)
		const maxIterations = pendingKeys.length * 2; // Safety limit
		let iterations = 0;
		let pendingIndex = 0;
		while (pendingIndex < pendingKeys.length && iterations < maxIterations) {
			iterations++;
			const key = pendingKeys[pendingIndex];
			const value = rawValues[key] as string;

			// Check if dependencies are now resolved (only check remaining items)
			let hasDependency = false;
			for (let j = pendingIndex + 1; j < pendingKeys.length; j++) {
				if (value.includes(pendingKeys[j])) {
					hasDependency = true;
					break;
				}
			}

			if (hasDependency) {
				// Move to next, will revisit this key in remaining unresolved keys
				pendingKeys.push(key);
				pendingIndex++;
				continue;
			}

			try {
				nodeParams[key] = (await workflowHelpers.resolveExpression(
					value,
					nodeParams,
				)) as NodeParameterValue;
			} catch {
				nodeParams[key] = '';
			}
			parameterGotResolved = true;
			pendingIndex++;
		}

		// Handle any remaining unresolved keys (circular dependencies or safety limit)
		for (let i = pendingIndex; i < pendingKeys.length; i++) {
			const key = pendingKeys[i];
			try {
				nodeParams[key] = (await workflowHelpers.resolveExpression(
					rawValues[key] as string,
					nodeParams,
				)) as NodeParameterValue;
			} catch {
				nodeParams[key] = '';
			}
			parameterGotResolved = true;
		}

		if (parameterGotResolved) {
			if (path) {
				const resolvedValues = deepCopy(nodeParameters);
				set(resolvedValues, path, nodeParams);
				return nodeHelpers.displayParameter(
					resolvedValues,
					effectiveParameter,
					path,
					node,
					displayKey,
				);
			}
			return nodeHelpers.displayParameter(nodeParams, effectiveParameter, '', node, displayKey);
		}

		return nodeHelpers.displayParameter(nodeParameters, effectiveParameter, path, node, displayKey);
	}

	return {
		setValue,
		shouldDisplayNodeParameter,
		updateParameterByPath,
		updateNodeParameter,
		handleFocus,
	};
}
