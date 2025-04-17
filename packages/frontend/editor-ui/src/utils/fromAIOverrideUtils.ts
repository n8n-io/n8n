import {
	extractFromAICalls,
	FROM_AI_AUTO_GENERATED_MARKER,
	type NodeParameterValueType,
	type NodePropertyTypes,
} from 'n8n-workflow';
import { i18n } from '@/plugins/i18n';
import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export type OverrideContext = {
	parameter: {
		name: string;
		displayName: string;
		type: NodePropertyTypes;
		noDataExpression?: boolean;
		typeOptions?: { editor?: string };
	};
	value: NodeParameterValueType;
	path: string;
};

type ExtraPropValue = {
	initialValue: string;
	tooltip: string;
	type: NodePropertyTypes;
	typeOptions?: { rows?: number };
};

type FromAIExtraProps = 'description';

export type FromAIOverride = {
	type: 'fromAI';
	readonly extraProps: Record<FromAIExtraProps, ExtraPropValue>;
	extraPropValues: Partial<Record<string, NodeParameterValueType>>;
};

function sanitizeFromAiParameterName(s: string) {
	s = s.replace(/[^a-zA-Z0-9\-]/g, '_');

	if (s.length >= 64) {
		s = s.slice(0, 63);
	}

	return s;
}

// nodeName | [nodeName, highestUnsupportedVersion]
const NODE_DENYLIST = [
	'toolCode',
	'toolHttpRequest',
	'mcpClientTool',
	['toolWorkflow', 1.2],
] as const;

const PATH_DENYLIST = [
	'parameters.name',
	// this is used in vector store tools
	'parameters.toolName',
	'parameters.description',
	// This is used in e.g. the telegram node if the dropdown selects manual mode
	'parameters.toolDescription',
];

const PROP_TYPE_DENYLIST = ['options', 'credentialsSelect'];

export const fromAIExtraProps: Record<FromAIExtraProps, ExtraPropValue> = {
	description: {
		initialValue: '',
		type: 'string',
		typeOptions: { rows: 2 },
		tooltip: i18n.baseText('parameterOverride.descriptionTooltip'),
	},
};

function isExtraPropKey(
	extraProps: FromAIOverride['extraProps'],
	key: PropertyKey,
): key is keyof FromAIOverride['extraProps'] {
	return extraProps.hasOwnProperty(key);
}

export function updateFromAIOverrideValues(override: FromAIOverride, expr: string) {
	const { extraProps, extraPropValues } = override;
	const overrides = parseOverrides(expr);
	if (overrides) {
		for (const [key, value] of Object.entries(overrides)) {
			if (isExtraPropKey(extraProps, key)) {
				if (extraProps[key].initialValue === value) {
					delete extraPropValues[key];
				} else {
					extraPropValues[key] = value;
				}
			}
		}
	}
}

function fieldTypeToFromAiType(propType: NodePropertyTypes) {
	switch (propType) {
		case 'boolean':
		case 'number':
		case 'json':
			return propType;
		default:
			return 'string';
	}
}

export function isFromAIOverrideValue(s: string) {
	return s.startsWith(`={{ ${FROM_AI_AUTO_GENERATED_MARKER} $fromAI(`);
}

function getBestQuoteChar(description: string) {
	if (description.includes('\n')) return '`';

	if (!description.includes('`')) return '`';
	if (!description.includes('"')) return '"';
	return "'";
}

// Note that this is not *technically* unique, as two lists with the
// same list name and the same property display name could theoretically
// exist within one node. However, this is unlikely to happen in practice.
export function buildUniqueName(props: Pick<OverrideContext, 'parameter' | 'path'>) {
	const path = props.path.split('.');

	// include any list segments in the path (e.g. .myListName[0].) for uniqueness
	// but drop brackets to avoid token limits
	const filteredPaths = path
		.filter((x) => /\[\d+\]/i.test(x))
		.map((x) => x.replaceAll(/[\[\]]/gi, ''));
	let result = [...filteredPaths, props.parameter.displayName].join('_');

	// Langchain requires the name to be <64 characters
	if (filteredPaths.length > 1) {
		// Prefer clipping the list names over the display name
		result = result.slice(-63);
	} else {
		result = result.slice(0, 63);
	}

	return result;
}

export function buildValueFromOverride(
	override: FromAIOverride,
	props: Pick<OverrideContext, 'parameter' | 'path'>,
	includeMarker: boolean,
) {
	const { extraPropValues, extraProps } = override;
	const marker = includeMarker ? `${FROM_AI_AUTO_GENERATED_MARKER} ` : '';
	const key = sanitizeFromAiParameterName(buildUniqueName(props));
	const description =
		extraPropValues?.description?.toString() ?? extraProps.description.initialValue;

	// We want to escape these characters here as the generated formula needs to be valid JS code, and we risk
	// closing the string prematurely without it.
	// If we don't escape \ then <my \' description> as  would end up as 'my \\' description' in
	// the generated code, causing an unescaped quoteChar to close the string.
	// We try to minimize this by looking for an unused quote char first
	const quoteChar = getBestQuoteChar(description);
	const sanitizedDescription = description
		.replaceAll(/\\/g, '\\\\')
		.replaceAll(quoteChar, `\\${quoteChar}`);
	const type = fieldTypeToFromAiType(props.parameter.type);

	return `={{ ${marker}$fromAI('${key}', ${quoteChar}${sanitizedDescription}${quoteChar}, '${type}') }}`;
}

export function parseOverrides(
	expression: string,
): Record<keyof FromAIOverride['extraProps'], string | undefined> | null {
	try {
		// `extractFromAICalls` has different escape semantics from JS strings
		// Specifically it makes \ escape any following character.
		// So we need to escape our \ so we don't drop them accidentally
		// However ` used in the description cause \` to appear here, which would break
		// So we take the hit and expose the bug for backticks only, turning \` into `.
		const preparedExpression = expression.replace(/\\[^`]/g, '\\\\');

		const calls = extractFromAICalls(preparedExpression);
		if (calls.length === 1) {
			return {
				description: calls[0].description,
			};
		}
	} catch (e) {}

	return null;
}

function isDeniedNode(nodeDenyData: string | readonly [string, number], node: INodeUi) {
	if (typeof nodeDenyData === 'string') {
		return node.type.endsWith(nodeDenyData);
	} else {
		const [name, version] = nodeDenyData;
		return node.type.endsWith(name) && node.typeVersion <= version;
	}
}

export function canBeContentOverride(
	props: Pick<OverrideContext, 'path' | 'parameter'>,
	node: INodeUi,
) {
	if (NODE_DENYLIST.some((x) => isDeniedNode(x, node))) return false;

	if (PATH_DENYLIST.includes(props.path)) return false;

	if (PROP_TYPE_DENYLIST.includes(props.parameter.type)) return false;

	const nodeType = useNodeTypesStore().getNodeType(node.type, node?.typeVersion);
	const codex = nodeType?.codex;
	if (
		!codex?.categories?.includes('AI') ||
		!codex?.subcategories?.AI?.includes('Tools') ||
		codex?.subcategories?.AI?.includes('Vector Stores') // vector stores do not support fromAI
	)
		return false;

	return !props.parameter.noDataExpression;
}

export function makeOverrideValue(
	context: OverrideContext,
	node: INodeUi | null | undefined,
): FromAIOverride | null {
	if (!node) return null;

	if (canBeContentOverride(context, node)) {
		const fromAiOverride: FromAIOverride = {
			type: 'fromAI',
			extraProps: fromAIExtraProps,
			extraPropValues: {},
		};
		updateFromAIOverrideValues(fromAiOverride, context.value?.toString() ?? '');
		return fromAiOverride;
	}

	return null;
}
