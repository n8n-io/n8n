import { UnexpectedError } from '@n8n/errors';
import type {
	INode,
	INodeCredentialDescription,
	INodeParameters,
	INodeProperties,
	INodePropertyOptions,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers } from 'n8n-workflow';

import { CUSTOM_API_CALL_KEY } from '@/constants';

import {
	ADDITIONAL_FIELDS,
	actionVersionRefs,
	buildInputProperties,
	buildRoutedActionProperties,
	type ActionVersionsRef,
	type ActionView,
	type InputNaming,
} from './node-description.generator';
import {
	OPERATION_PARAMETER,
	PIN_ACTION_ID_PARAMETER,
	PIN_ACTION_NAME_PARAMETER,
	operationOptions,
	pinProperties,
	pinValues,
	readPin,
	showFor,
	type ActionVersionRef,
} from './version-pin';

/**
 * Adds custom actions to an existing node (the parent), for example a node with `resource`
 * and `operation`. The editor and parameter resolution use the extended description.
 * `RoutingNode` runs a separate run-time description when a custom action is selected.
 *
 * Stored values. Saved workflows contain them, so they must never change.
 */
export const CUSTOM_RESOURCE_VALUE = '__CUSTOM_ACTION__';
export const CUSTOM_RESOURCE_NAME = 'Custom';
export const PARENT_INPUT_PREFIX = 'customAction_';

const RESOURCE_PARAMETER = 'resource';
const AUTHENTICATION_PARAMETER = 'authentication';

/** The prefix keeps the inputs apart from the parameters of the parent. */
export const PARENT_NAMING: InputNaming = {
	parameterName: (inputName) => `${PARENT_INPUT_PREFIX}${inputName}`,
	additionalFields: `${PARENT_INPUT_PREFIX}${ADDITIONAL_FIELDS}`,
};

export type ParentShape = 'resource' | 'operation';

const isOption = (value: unknown): value is INodePropertyOptions =>
	typeof value === 'object' && value !== null && 'value' in value && !('type' in value);

const isOptionsProperty = (property: INodeProperties, name: string) =>
	property.name === name && property.type === 'options';

function isSingleMain(
	connections: INodeTypeDescription['inputs'] | INodeTypeDescription['outputs'],
): boolean {
	// A string is an expression that computes the connections.
	if (!Array.isArray(connections) || connections.length !== 1) return false;
	const [connection] = connections;
	const type = typeof connection === 'string' ? connection : connection.type;
	return type === NodeConnectionTypes.Main;
}

/** `RoutingNode` selects a credential by `authentication` only. Other conditions would not apply. */
function hasSelectableCredentials(credentials: INodeCredentialDescription[] | undefined): boolean {
	if (!credentials || credentials.length === 0) return false;
	if (credentials.length === 1) {
		const { show = {}, hide = {} } = credentials[0].displayOptions ?? {};
		return [...Object.keys(show), ...Object.keys(hide)].every(
			(key) => key === AUTHENTICATION_PARAMETER || key === '@version',
		);
	}
	// Each credential must show for values of `authentication` and for nothing else.
	return credentials.every(({ displayOptions }) => {
		const show = displayOptions?.show ?? {};
		return (
			displayOptions?.hide === undefined &&
			show[AUTHENTICATION_PARAMETER] !== undefined &&
			Object.keys(show).length === 1
		);
	});
}

const isReservedName = (name: string) =>
	name.startsWith(PARENT_INPUT_PREFIX) ||
	name === PIN_ACTION_ID_PARAMETER ||
	name === PIN_ACTION_NAME_PARAMETER;

/** Structural check of one description. `undefined`: the node cannot be a parent. Does not check credential types. */
export function parentShape(description: INodeTypeDescription): ParentShape | undefined {
	if (description.group.includes('trigger')) return undefined;
	if (description.polling || description.webhooks !== undefined) return undefined;
	if (!isSingleMain(description.inputs) || !isSingleMain(description.outputs)) return undefined;
	if (!hasSelectableCredentials(description.credentials)) return undefined;

	const { properties } = description;
	if (properties.some((property) => isReservedName(property.name))) return undefined;
	if (properties.some((property) => isOptionsProperty(property, RESOURCE_PARAMETER))) {
		return 'resource';
	}

	const operations = properties.filter((property) =>
		isOptionsProperty(property, OPERATION_PARAMETER),
	);
	if (operations.length === 0) return undefined;
	// A parent value that reads as a pin would select a custom action.
	const readsAsPin = operations.some((property) =>
		(property.options ?? [])
			.filter(isOption)
			.some((option) => readPin({ [OPERATION_PARAMETER]: option.value }) !== undefined),
	);
	return readsAsPin ? undefined : 'operation';
}

/** Copies the property and its options. The new options go before `Custom API Call`, else at the end. */
function withOptions(property: INodeProperties, added: INodePropertyOptions[]): INodeProperties {
	const options = [...(property.options ?? [])];
	const apiCallIndex = options.findIndex(
		(option) => isOption(option) && option.value === CUSTOM_API_CALL_KEY,
	);
	options.splice(apiCallIndex === -1 ? options.length : apiCallIndex, 0, ...added);
	return { ...property, options };
}

/** `displayOptions.show` for the Custom resource. A new object for each call. */
const customShow = () => ({ [RESOURCE_PARAMETER]: [CUSTOM_RESOURCE_VALUE] });

/** The pins of a parent. In the resource shape they show for the Custom resource only. */
function parentPinProperties(shape: ParentShape, refs: ActionVersionsRef[]): INodeProperties[] {
	// No condition in the operation shape: the `operation` value of a deleted action is not known,
	// and the stored name must stay for the error.
	if (shape === 'operation') return pinProperties(refs);
	return pinProperties(refs).map((pin) => ({ ...pin, displayOptions: { show: customShow() } }));
}

/**
 * Description for the editor and for parameter resolution. Always a new description.
 * Without actions it has the pins and, in the resource shape, the Action property: the engine
 * and the editor resolve the parameters against it, so a node keeps the selection of a deleted
 * action and fails with its name.
 */
export function extendParentDescription(
	description: INodeTypeDescription,
	shape: ParentShape,
	actions: ActionView[],
): INodeTypeDescription {
	const refs = actionVersionRefs(actions);
	const hasActions = refs.length > 0;

	// The editor needs no request. Only the run-time description has routing.
	const resourceShow = shape === 'resource' ? customShow() : {};
	const inputProperties = actions.flatMap((action) =>
		action.versions.flatMap((version) =>
			buildInputProperties(
				version,
				{ ...resourceShow, ...showFor(action.id, version.version) },
				PARENT_NAMING,
			),
		),
	);

	let properties: INodeProperties[];
	if (shape === 'resource') {
		// Without actions, the editor shows no empty Custom resource.
		properties = description.properties.map((property) =>
			hasActions && isOptionsProperty(property, RESOURCE_PARAMETER)
				? withOptions(property, [{ name: CUSTOM_RESOURCE_NAME, value: CUSTOM_RESOURCE_VALUE }])
				: property,
		);
		properties.push({
			displayName: 'Action',
			name: OPERATION_PARAMETER,
			type: 'options',
			noDataExpression: true,
			// Never an action value: a save strips a value equal to the default, and the pin is lost.
			default: '',
			options: operationOptions(refs),
			displayOptions: { show: resourceShow },
		});
	} else {
		// Each property gets its own option objects.
		properties = description.properties.map((property) =>
			hasActions && isOptionsProperty(property, OPERATION_PARAMETER)
				? withOptions(property, operationOptions(refs))
				: property,
		);
	}

	return {
		...description,
		properties: [...properties, ...parentPinProperties(shape, refs), ...inputProperties],
	};
}

/**
 * Builds what the descriptions of a parent build for one action. Throws `UnexpectedError`
 * for stored data that the generator does not accept.
 */
export function assertParentActionValid(action: ActionView): void {
	buildRoutedActionProperties([action], PARENT_NAMING);
}

const PLACEHOLDER_REF: ActionVersionRef = {
	actionId: 'eligibility',
	actionName: 'Eligibility',
	version: 1,
};

const versionsOf = (version: INodeTypeDescription['version']) =>
	Array.isArray(version) ? version : [version];

/** The values of `authentication` that select a credential. `[undefined]`: the default applies. */
function authenticationValues(description: INodeTypeDescription): (string | undefined)[] {
	if ((description.credentials ?? []).length < 2) return [undefined];
	const values = description.properties
		.filter((property) => isOptionsProperty(property, AUTHENTICATION_PARAMETER))
		.flatMap((property) => (property.options ?? []).filter(isOption))
		.map((option) => option.value)
		.filter((value): value is string => typeof value === 'string');
	return values.length > 0 ? [...new Set(values)] : [undefined];
}

/**
 * True when a parameter of the parent stops each custom action before `execute`.
 * Mirrors the engine: it resolves the node parameters against the extended description,
 * then checks them. A required parent parameter without a value that shows for a custom
 * action is an issue. In the resource shape, a parent `operation` that shows for the
 * Custom resource gives a second Action dropdown.
 */
export function blocksCustomActions(
	description: INodeTypeDescription,
	shape: ParentShape,
): boolean {
	const extended = extendParentDescription(description, shape, []);
	const parentOperations = description.properties.filter(
		(property) => property.name === OPERATION_PARAMETER,
	);

	for (const typeVersion of versionsOf(description.version)) {
		for (const authentication of authenticationValues(description)) {
			const node: INode = {
				id: 'eligibility',
				name: 'Eligibility',
				type: description.name,
				typeVersion,
				position: [0, 0],
				parameters: {
					...(authentication !== undefined && { [AUTHENTICATION_PARAMETER]: authentication }),
					...parentPinValues(shape, PLACEHOLDER_REF),
				},
			};
			node.parameters =
				NodeHelpers.getNodeParameters(
					extended.properties,
					node.parameters,
					true,
					false,
					node,
					extended,
				) ?? {};

			if (
				shape === 'resource' &&
				parentOperations.some((property) =>
					NodeHelpers.displayParameter(node.parameters, property, node, extended),
				)
			) {
				return true;
			}

			const issues = NodeHelpers.getNodeParametersIssues(extended.properties, node, extended);
			const names = Object.keys(issues?.parameters ?? {});
			if (names.some((name) => !isReservedName(name))) return true;
		}
	}
	return false;
}

/** Description that `RoutingNode` runs for a custom action. Holds only the custom action properties. */
export function buildParentRuntimeDescription(
	description: INodeTypeDescription,
	actions: ActionView[],
): INodeTypeDescription {
	// Input properties show for the version only: this description has no `resource` property.
	const { refs, options, inputProperties } = buildRoutedActionProperties(actions, PARENT_NAMING);
	if (refs.length === 0) {
		throw new UnexpectedError('A parent node has no custom action with a version');
	}

	return {
		displayName: description.displayName,
		name: description.name,
		group: description.group,
		version: description.version,
		description: description.description,
		defaults: description.defaults,
		inputs: description.inputs,
		outputs: description.outputs,
		credentials: description.credentials,
		// No base URL: a custom action URL is absolute.
		requestDefaults: { json: true },
		// The host comes from an administrator, not from n8n. See `RoutingNode`.
		userDefinedEndpoint: true,
		properties: [
			{
				displayName: 'Action',
				name: OPERATION_PARAMETER,
				type: 'options',
				noDataExpression: true,
				default: '',
				options,
			},
			...pinProperties(refs),
			...inputProperties,
		],
	};
}

/** Parameter values that select one version in a parent node. */
export function parentPinValues(shape: ParentShape, ref: ActionVersionRef): Record<string, string> {
	return shape === 'resource'
		? { [RESOURCE_PARAMETER]: CUSTOM_RESOURCE_VALUE, ...pinValues(ref) }
		: pinValues(ref);
}

/** True when the node parameters select a custom action, also one that does not exist any more. */
export function isCustomActionSelected(shape: ParentShape, parameters: INodeParameters): boolean {
	if (shape === 'resource') return parameters[RESOURCE_PARAMETER] === CUSTOM_RESOURCE_VALUE;
	// `parentShape` makes sure that no built-in `operation` value reads as a pin.
	return readPin(parameters) !== undefined;
}
