import type { INodeUi } from '@/Interface';
import type { FromAIOverride, OverrideContext } from './fromAIOverrideUtils';
import {
	buildUniqueName,
	buildValueFromOverride,
	fromAIExtraProps,
	isFromAIOverrideValue,
	makeOverrideValue,
	parseOverrides,
} from './fromAIOverrideUtils';
import type { INodeTypeDescription, NodePropertyTypes } from 'n8n-workflow';

const getNodeType = vi.fn();

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType,
	})),
}));

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
	version: 1,
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

function mockNodeFromType(type: INodeTypeDescription) {
	return vi.mocked<INodeUi>({
		type: type.name,
		typeVersion: type.version as number,
	} as never);
}

describe('makeOverrideValue', () => {
	test.each<[string, ...Parameters<typeof makeOverrideValue>]>([
		['null nodeType', makeContext(''), null],
		['non-ai node type', makeContext(''), mockNodeFromType(NON_AI_NODE_TYPE)],
		['ai node type on denylist', makeContext(''), mockNodeFromType(AI_DENYLIST_NODE_TYPE)],
		['vector store type', makeContext(''), mockNodeFromType(AI_VECTOR_STORE_NODE_TYPE)],
		[
			'denied parameter name',
			makeContext('', 'parameters.toolName'),
			mockNodeFromType(AI_NODE_TYPE),
		],
		[
			'denied parameter type',
			makeContext('', undefined, 'credentialsSelect'),
			mockNodeFromType(AI_NODE_TYPE),
		],
	])('should not create an override for %s', (_name, context, nodeType) => {
		getNodeType.mockReturnValue(nodeType);
		expect(makeOverrideValue(context, nodeType)).toBeNull();
	});

	it('should create an fromAI override', () => {
		getNodeType.mockReturnValue(AI_NODE_TYPE);
		const result = makeOverrideValue(
			makeContext(`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('${DISPLAY_NAME}') }}`),
			mockNodeFromType(AI_NODE_TYPE),
		);

		expect(result).not.toBeNull();
		expect(result?.type).toEqual('fromAI');
	});

	it('parses existing fromAI overrides', () => {
		getNodeType.mockReturnValue(AI_NODE_TYPE);

		const description = 'a description';
		const result = makeOverrideValue(
			makeContext(
				`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('${DISPLAY_NAME}', \`${description}\`) }}`,
			),
			mockNodeFromType(AI_NODE_TYPE),
		);

		expect(result).toBeDefined();
		expect(result?.extraPropValues.description).toEqual(description);
	});

	it('parses an existing fromAI override with default values without adding extraPropValue entry', () => {
		getNodeType.mockReturnValue(AI_NODE_TYPE);

		const result = makeOverrideValue(
			makeContext("={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('aName', ``) }}"),
			mockNodeFromType(AI_NODE_TYPE),
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

describe('buildUniqueName', () => {
	test.each<[string, string, string]>([
		['no list segments', 'parameters.someParameter', DISPLAY_NAME],
		[
			'list segments in the path',
			'parameters.someList[0].someParameter',
			'someList0_' + DISPLAY_NAME,
		],
		[
			'multiple list segments in the path',
			'parameters.someList[0].nestedList[1].someParameter',
			'someList0_nestedList1_' + DISPLAY_NAME,
		],
		[
			'paths without parameters',
			'someList[0].nestedList[1]',
			'someList0_nestedList1_' + DISPLAY_NAME,
		],
		['empty paths', '', DISPLAY_NAME],
		[
			'path with multiple lists and segment exceeding 63 characters',
			'parameters.someLoooooongList[0].nestedListWithAVeryLongNameThatExceedsTheLimit[1].someParameter',
			`someLoooooongList0_nestedListWithAVeryLongNameThatExceedsTheLimit1_${DISPLAY_NAME}`.slice(
				-63,
			),
		],
		[
			'path with multiple long segments and truncation',
			'parameters.someExtremelyLongListNameThatExceedsTheLimit.anotherLongSegmentName.finalParameter',
			DISPLAY_NAME,
		],
	])('should build a unique name with %s', (_description, path, expected) => {
		const context = makeContext('value', path);
		expect(buildUniqueName(context)).toEqual(expected);
	});
});
