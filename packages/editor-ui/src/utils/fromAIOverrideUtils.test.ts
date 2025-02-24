import type { FromAIOverride, OverrideContext } from './fromAIOverrideUtils';
import {
	buildValueFromOverride,
	fromAIExtraProps,
	isFromAIOverrideValue,
	makeOverrideValue,
	parseOverrides,
} from './fromAIOverrideUtils';
import type { INodeTypeDescription, NodePropertyTypes } from 'n8n-workflow';

const DISPLAY_NAME = 'aDisplayName';
const PARAMETER_NAME = 'aName';

const makeContext = (
	value: string,
	path?: string,
	type: NodePropertyTypes = 'string',
): OverrideContext => ({
	parameter: {
		name: PARAMETER_NAME,
		displayName: DISPLAY_NAME,
		type,
	},
	value,
	path: path ?? `parameters.${PARAMETER_NAME}`,
});

const MOCK_NODE_TYPE_MIXIN = {
	version: 0,
	defaults: {},
	inputs: [],
	outputs: [],
	properties: [],
	displayName: '',
	group: [],
	description: '',
};

const AI_NODE_TYPE: INodeTypeDescription = {
	name: 'AN_AI_NODE_TYPE',
	codex: {
		categories: ['AI'],
		subcategories: {
			AI: ['Tools'],
		},
	},
	...MOCK_NODE_TYPE_MIXIN,
};

const AI_DENYLIST_NODE_TYPE: INodeTypeDescription = {
	name: 'toolCode',
	codex: {
		categories: ['AI'],
		subcategories: {
			AI: ['Tools'],
		},
	},
	...MOCK_NODE_TYPE_MIXIN,
};

const AI_VECTOR_STORE_NODE_TYPE: INodeTypeDescription = {
	name: 'aVectorStore',
	codex: {
		categories: ['AI'],
		subcategories: {
			AI: ['Tools', 'Vector Stores'],
		},
	},
	...MOCK_NODE_TYPE_MIXIN,
};

const NON_AI_NODE_TYPE: INodeTypeDescription = {
	name: 'AN_NOT_AI_NODE_TYPE',
	...MOCK_NODE_TYPE_MIXIN,
};

describe('makeOverrideValue', () => {
	test.each<[string, ...Parameters<typeof makeOverrideValue>]>([
		['null nodeType', makeContext(''), null],
		['non-ai node type', makeContext(''), NON_AI_NODE_TYPE],
		['ai node type on denylist', makeContext(''), AI_DENYLIST_NODE_TYPE],
		['vector store type', makeContext(''), AI_VECTOR_STORE_NODE_TYPE],
		['denied parameter name', makeContext('', 'parameters.toolName'), AI_NODE_TYPE],
		['denied parameter type', makeContext('', undefined, 'credentialsSelect'), AI_NODE_TYPE],
	])('should not create an override for %s', (_name, context, nodeType) => {
		expect(makeOverrideValue(context, nodeType)).toBeNull();
	});

	it('should create an fromAI override', () => {
		const result = makeOverrideValue(
			makeContext(`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('${DISPLAY_NAME}') }}`),
			AI_NODE_TYPE,
		);

		expect(result).not.toBeNull();
		expect(result?.type).toEqual('fromAI');
	});

	it('parses existing fromAI overrides', () => {
		const description = 'a description';
		const result = makeOverrideValue(
			makeContext(
				`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('${DISPLAY_NAME}', \`${description}\`) }}`,
			),
			AI_NODE_TYPE,
		);

		expect(result).toBeDefined();
		expect(result?.extraPropValues.description).toEqual(description);
	});

	it('parses an existing fromAI override with default values without adding extraPropValue entry', () => {
		const result = makeOverrideValue(
			makeContext("={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('aName', ``) }}"),
			AI_NODE_TYPE,
		);

		expect(result).toBeDefined();
		expect(result?.extraPropValues.description).not.toBeDefined();
	});
});

describe('FromAiOverride', () => {
	it('correctly identifies override values', () => {
		expect(isFromAIOverrideValue('={{ $fromAI() }}')).toBe(false);
		expect(isFromAIOverrideValue('={{ /*n8n-auto-generated-fromAI-override*/ $fromAI() }}')).toBe(
			true,
		);
	});

	it('should parseOverrides as expected', () => {
		expect(parseOverrides("={{ $fromAI('aKey' }}")).toBeNull();
		expect(parseOverrides("={{ $fromAI('aKey') }}")).toEqual({
			description: undefined,
		});
		expect(parseOverrides("={{ $fromAI('aKey', `a description`) }}")).toEqual({
			description: 'a description',
		});
		expect(parseOverrides("={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('aKey') }}")).toEqual(
			{ description: undefined },
		);
		expect(
			parseOverrides(
				"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('aKey', `a description`) }}",
			),
		).toEqual({
			description: 'a description',
		});
	});

	test.each<[string, string, string]>([
		['none', '$fromAI("a", `b`)', 'b'],
		['a simple case of', '$fromAI("a", `\\``)', '`'],
		// this is a bug in the current implementation
		// see related comments in the main file
		// We try to use different quote characters where possible
		['a complex case of', '$fromAI("a", `a \\` \\\\\\``)', 'a ` `'],
	])('should handle %s backtick escaping ', (_name, value, expected) => {
		expect(parseOverrides(value)).toEqual({ description: expected });
	});

	it('should build a value from an override and carry over modification', () => {
		const override: FromAIOverride = {
			type: 'fromAI',
			extraProps: fromAIExtraProps,
			extraPropValues: {},
		};
		expect(buildValueFromOverride(override, makeContext(''), true)).toEqual(
			`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('${DISPLAY_NAME}', \`\`, 'string') }}`,
		);
		expect(buildValueFromOverride(override, makeContext(''), false)).toEqual(
			`={{ $fromAI('${DISPLAY_NAME}', \`\`, 'string') }}`,
		);

		const description = 'a description';
		override.extraPropValues.description = description;

		expect(buildValueFromOverride(override, makeContext(''), true)).toEqual(
			`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('${DISPLAY_NAME}', \`${description}\`, 'string') }}`,
		);
		expect(buildValueFromOverride(override, makeContext(''), false)).toEqual(
			`={{ $fromAI('${DISPLAY_NAME}', \`${description}\`, 'string') }}`,
		);
	});
});
