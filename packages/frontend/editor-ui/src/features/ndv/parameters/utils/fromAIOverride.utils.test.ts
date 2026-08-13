import type { INodeUi } from '@/Interface';
import type { FromAIOverride, OverrideContext } from './fromAIOverride.utils';
import {
	buildUniqueName,
	buildValueFromOverride,
	fromAIExtraProps,
	isFromAIOverrideValue,
	makeOverrideValue,
	parseOverrides,
	reconcileFromAIKeys,
	reconcileNodeFromAIKeys,
} from './fromAIOverride.utils';
import type { INodeParameters, INodeProperties } from 'n8n-workflow';
import type { INodeTypeDescription, NodePropertyTypes } from 'n8n-workflow';

const getNodeType = vi.fn();

vi.mock('@/app/stores/nodeTypes.store', () => ({
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
	parameterOverrides: Partial<OverrideContext['parameter']> = {},
): OverrideContext => ({
	parameter: {
		name: PARAMETER_NAME,
		displayName: DISPLAY_NAME,
		type,
		...parameterOverrides,
	},
	value,
	path: path ?? `parameters.${PARAMETER_NAME}`,
});

const FROM_AI_OVERRIDE_VALUE = `={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('${DISPLAY_NAME}', \`Pick a priority\`, 'number') }}`;

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

function mockAiToolNode(typeName: string, typeVersion: number): INodeUi {
	return vi.mocked<INodeUi>({ type: typeName, typeVersion } as never);
}

const AI_TOOL_CODEX: INodeTypeDescription = {
	name: '',
	codex: {
		categories: ['AI'],
		subcategories: { AI: ['Tools'] },
	},
	...MOCK_NODE_TYPE_MIXIN,
};

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

	it('creates an override for a parameter named "name" on an allowed AI tool node', () => {
		getNodeType.mockReturnValue(AI_NODE_TYPE);
		const result = makeOverrideValue(
			makeContext('', 'parameters.name'),
			mockNodeFromType(AI_NODE_TYPE),
		);

		expect(result).not.toBeNull();
		expect(result?.type).toEqual('fromAI');
	});

	it('displays an existing fromAI override for static options parameters', () => {
		getNodeType.mockReturnValue(AI_NODE_TYPE);
		const result = makeOverrideValue(
			makeContext(FROM_AI_OVERRIDE_VALUE, undefined, 'options'),
			mockNodeFromType(AI_NODE_TYPE),
		);

		expect(result).not.toBeNull();
		expect(result?.type).toEqual('fromAI');
		expect(result?.extraPropValues.description).toEqual('Pick a priority');
	});

	it('does not create an override for options parameters without an existing fromAI value', () => {
		getNodeType.mockReturnValue(AI_NODE_TYPE);
		const result = makeOverrideValue(
			makeContext('', undefined, 'options'),
			mockNodeFromType(AI_NODE_TYPE),
		);

		expect(result).toBeNull();
	});

	it('does not display existing fromAI overrides for dynamic options parameters', () => {
		getNodeType.mockReturnValue(AI_NODE_TYPE);
		const result = makeOverrideValue(
			makeContext(FROM_AI_OVERRIDE_VALUE, undefined, 'options', {
				typeOptions: { loadOptionsMethod: 'getTeams' },
			}),
			mockNodeFromType(AI_NODE_TYPE),
		);

		expect(result).toBeNull();
	});

	describe('legacy tool-name node denylist', () => {
		test.each<[string, string, number, boolean]>([
			['toolWorkflow v2.0 denied', '@n8n/n8n-nodes-langchain.toolWorkflow', 2.0, false],
			['toolWorkflow v2.1 denied', '@n8n/n8n-nodes-langchain.toolWorkflow', 2.1, false],
			['toolWorkflow v2.2 allowed', '@n8n/n8n-nodes-langchain.toolWorkflow', 2.2, true],
			['toolVectorStore v1 denied', '@n8n/n8n-nodes-langchain.toolVectorStore', 1, false],
			['toolVectorStore v1.1 allowed', '@n8n/n8n-nodes-langchain.toolVectorStore', 1.1, true],
		])('%s', (_name, typeName, typeVersion, shouldOverride) => {
			getNodeType.mockReturnValue(AI_TOOL_CODEX);
			const result = makeOverrideValue(
				makeContext('', 'parameters.name'),
				mockAiToolNode(typeName, typeVersion),
			);

			if (shouldOverride) {
				expect(result).not.toBeNull();
			} else {
				expect(result).toBeNull();
			}
		});
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

const AUTO_GENERATED_MARKER = '/*n8n-auto-generated-fromAI-override*/';
const makeOverrideExpression = (key: string, desc = '', type = 'string') =>
	`={{ ${AUTO_GENERATED_MARKER} $fromAI('${key}', \`${desc}\`, '${type}') }}`;

describe('reconcileFromAIKeys', () => {
	const override = makeOverrideExpression;
	const fieldValueField = [
		{ name: 'fieldValue', displayName: 'Field Value', type: 'string' as NodePropertyTypes },
	];

	it('reindexes colliding auto-generated keys to match row position', () => {
		const rows = [
			{ fieldValue: override('Field_Value', 'desc A') },
			{ fieldValue: override('Field_Value', 'desc B') },
		];

		const result = reconcileFromAIKeys(rows, 'parameters.fieldsUi.fieldValues', fieldValueField);

		expect(result[0].fieldValue).toContain("$fromAI('fieldValues0_Field_Value'");
		expect(result[0].fieldValue).toContain('desc A');
		expect(result[1].fieldValue).toContain("$fromAI('fieldValues1_Field_Value'");
		expect(result[1].fieldValue).toContain('desc B');
	});

	it('leaves hand-edited (non-marker) $fromAI and plain values untouched', () => {
		const rows = [
			{ fieldValue: "={{ $fromAI('Field_Value', `hand written`, 'string') }}" },
			{ fieldValue: 'a plain static value' },
		];

		const result = reconcileFromAIKeys(rows, 'parameters.fieldsUi.fieldValues', fieldValueField);

		expect(result[0]).toEqual(rows[0]);
		expect(result[1]).toEqual(rows[1]);
	});

	it('is idempotent: already-correct keys are returned unchanged', () => {
		const rows = [
			{ fieldValue: override('fieldValues0_Field_Value', 'desc A') },
			{ fieldValue: override('fieldValues1_Field_Value', 'desc B') },
		];

		const result = reconcileFromAIKeys(rows, 'parameters.fieldsUi.fieldValues', fieldValueField);

		expect(result[0]).toEqual(rows[0]);
		expect(result[1]).toEqual(rows[1]);
	});

	it('preserves the description byte-for-byte (including backslashes) when reindexing', () => {
		const stored = buildValueFromOverride(
			{
				type: 'fromAI',
				extraProps: fromAIExtraProps,
				extraPropValues: { description: 'match C:\\Users and \\d+' },
			},
			makeContext('', 'parameters.fieldsUi.fieldValues[0].fieldValue', 'string', {
				displayName: 'Field Value',
			}),
			true,
		);
		const rows = [{ fieldValue: stored }, { fieldValue: stored }];

		const result = reconcileFromAIKeys(rows, 'parameters.fieldsUi.fieldValues', fieldValueField);

		// row 0 keeps index 0 → key + description unchanged
		expect(result[0].fieldValue).toBe(stored);
		// row 1 only its key changes; the description bytes are untouched
		expect(result[1].fieldValue).toBe(stored.replace('fieldValues0', 'fieldValues1'));
	});

	it('preserves a description containing a backtick when reindexing', () => {
		const stored = buildValueFromOverride(
			{
				type: 'fromAI',
				extraProps: fromAIExtraProps,
				extraPropValues: { description: 'use the `code` node' },
			},
			makeContext('', 'parameters.fieldsUi.fieldValues[0].fieldValue', 'string', {
				displayName: 'Field Value',
			}),
			true,
		);
		const rows = [{ fieldValue: stored }, { fieldValue: stored }];

		const result = reconcileFromAIKeys(rows, 'parameters.fieldsUi.fieldValues', fieldValueField);

		expect(result[0].fieldValue).toBe(stored);
		expect(result[1].fieldValue).toBe(stored.replace('fieldValues0', 'fieldValues1'));
	});

	it('changes only the key, preserving the stored type and description', () => {
		const rows = [{ fieldValue: override('Field_Value', 'a count', 'number') }];

		const result = reconcileFromAIKeys(rows, 'parameters.fieldsUi.fieldValues', fieldValueField);

		expect(result[0].fieldValue).toBe(override('fieldValues0_Field_Value', 'a count', 'number'));
	});

	it('reconciles multiple override fields within a row independently', () => {
		const rows = [{ first: override('First', 'd1'), second: override('Second', 'd2') }];

		const result = reconcileFromAIKeys(rows, 'parameters.list', [
			{ name: 'first', displayName: 'First', type: 'string' as NodePropertyTypes },
			{ name: 'second', displayName: 'Second', type: 'string' as NodePropertyTypes },
		]);

		expect(result[0].first).toContain("$fromAI('list0_First'");
		expect(result[0].second).toContain("$fromAI('list0_Second'");
	});
});

describe('reconcileNodeFromAIKeys', () => {
	const override = makeOverrideExpression;

	it('reconciles override keys inside a fixedCollection list', () => {
		const properties: INodeProperties[] = [
			{
				displayName: 'Fields',
				name: 'fieldsUi',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Field',
						name: 'fieldValues',
						values: [
							{ displayName: 'Field Value', name: 'fieldValue', type: 'string', default: '' },
						],
					},
				],
			},
		];
		const nodeParameters: INodeParameters = {
			fieldsUi: {
				fieldValues: [
					{ fieldValue: override('Field_Value', 'A') },
					{ fieldValue: override('Field_Value', 'B') },
				],
			},
		};

		const result = reconcileNodeFromAIKeys(properties, nodeParameters);
		const rows = (result.fieldsUi as { fieldValues: INodeParameters[] }).fieldValues;

		expect(rows[0].fieldValue).toContain("$fromAI('fieldValues0_Field_Value'");
		expect(rows[1].fieldValue).toContain("$fromAI('fieldValues1_Field_Value'");
	});

	it('reconciles override keys inside a multipleValues collection', () => {
		const properties: INodeProperties[] = [
			{
				displayName: 'Items',
				name: 'items',
				type: 'collection',
				typeOptions: { multipleValues: true },
				default: {},
				options: [{ displayName: 'Value', name: 'value', type: 'string', default: '' }],
			},
		];
		const nodeParameters: INodeParameters = {
			items: [{ value: override('Value', 'A') }, { value: override('Value', 'B') }],
		};

		const result = reconcileNodeFromAIKeys(properties, nodeParameters);
		const rows = result.items as INodeParameters[];

		expect(rows[0].value).toContain("$fromAI('items0_Value'");
		expect(rows[1].value).toContain("$fromAI('items1_Value'");
	});

	it('leaves non-list parameters untouched', () => {
		const properties: INodeProperties[] = [
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
		];
		const nodeParameters: INodeParameters = { name: override('Field_Value', 'A') };

		const result = reconcileNodeFromAIKeys(properties, nodeParameters);

		expect(result.name).toBe(nodeParameters.name);
	});
});
