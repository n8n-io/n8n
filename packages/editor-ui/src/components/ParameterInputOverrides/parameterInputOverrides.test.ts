import type { OverrideContext } from './parameterInputOverrides';
import { FromAiOverride, makeOverrideValue } from './parameterInputOverrides';
import type { INodeTypeDescription } from 'n8n-workflow';

const DISPLAY_NAME = 'aDisplayName';
const PARAMETER_NAME = 'aName';

const makeContext = (value: string, path?: string): OverrideContext => ({
	parameter: {
		name: PARAMETER_NAME,
		displayName: DISPLAY_NAME,
		type: 'string',
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

const NON_AI_NODE_TYPE: INodeTypeDescription = {
	name: 'AN_NOT_AI_NODE_TYPE',
	...MOCK_NODE_TYPE_MIXIN,
};

describe('makeOverrideValue', () => {
	test.each<[string, ...Parameters<typeof makeOverrideValue>]>([
		['null nodeType', makeContext(''), null],
		['non-ai node type', makeContext(''), NON_AI_NODE_TYPE],
		['ai node type on denylist', makeContext(''), AI_DENYLIST_NODE_TYPE],
	])('should not create an override for %s', (_name, context, nodeType) => {
		expect(makeOverrideValue(context, nodeType)).toBeNull();
	});

	it('should create an fromAI override', () => {
		const result = makeOverrideValue(
			makeContext(`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('${DISPLAY_NAME}') }}`),
			AI_NODE_TYPE,
		);

		expect(result).toBeInstanceOf(FromAiOverride);
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
		expect(FromAiOverride.isOverrideValue('={{ $fromAI() }}')).toBe(false);
		expect(
			FromAiOverride.isOverrideValue('={{ /*n8n-auto-generated-fromAI-override*/ $fromAI() }}'),
		).toBe(true);
	});

	it('should parseOverrides as expected', () => {
		expect(FromAiOverride.parseOverrides("={{ $fromAI('aKey' }}")).toBeNull();
		expect(FromAiOverride.parseOverrides("={{ $fromAI('aKey') }}")).toEqual({
			description: undefined,
		});
		expect(FromAiOverride.parseOverrides("={{ $fromAI('aKey', `a description`) }}")).toEqual({
			description: 'a description',
		});
		expect(
			FromAiOverride.parseOverrides(
				"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('aKey') }}",
			),
		).toEqual({ description: undefined });
		expect(
			FromAiOverride.parseOverrides(
				"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('aKey', `a description`) }}",
			),
		).toEqual({
			description: 'a description',
		});
	});

	test.each<[string, string, string]>([
		['normal case', '$fromAI("a", `b`)', 'b'],
		['working', '$fromAI("a", `a \\` \\\\\\``)', 'a ` \\`'],
		// ['failing', '$fromAI("a", `\\``)', '`'],
	])('should handle backtick escaping %s', (_name, value, expected) => {
		expect(FromAiOverride.parseOverrides(value)).toEqual({ description: expected });
	});

	it('should build a value from an override and carry over modification', () => {
		const override = new FromAiOverride();
		expect(override.buildValueFromOverride(makeContext(''), true)).toEqual(
			`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('${DISPLAY_NAME}', \`\`, 'string') }}`,
		);
		expect(override.buildValueFromOverride(makeContext(''), false)).toEqual(
			`={{ $fromAI('${DISPLAY_NAME}', \`\`, 'string') }}`,
		);

		const description = 'a description';
		override.extraPropValues.description = description;

		expect(override.buildValueFromOverride(makeContext(''), true)).toEqual(
			`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('${DISPLAY_NAME}', \`${description}\`, 'string') }}`,
		);
		expect(override.buildValueFromOverride(makeContext(''), false)).toEqual(
			`={{ $fromAI('${DISPLAY_NAME}', \`${description}\`, 'string') }}`,
		);
	});
});
