import {
	LEGACY_BUILDER_TOOL_NAMES,
	SHARED_BUILDER_TOOL_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
	getLegacyBuilderToolNames,
	resolveBuilderToolName,
} from '../builder-tool-names';

describe('resolveBuilderToolName', () => {
	it('maps a renamed tool to its current name', () => {
		expect(resolveBuilderToolName('workflows')).toBe(WORKFLOW_BUILDER_TOOL_NAMES.WORKFLOWS);
	});

	it.each([
		['credentials', 'list', SHARED_BUILDER_TOOL_NAMES.LIST_CREDENTIALS],
		['credentials', 'get', SHARED_BUILDER_TOOL_NAMES.LIST_CREDENTIALS],
		[
			'workflow_builder_credentials',
			'search-types',
			SHARED_BUILDER_TOOL_NAMES.SEARCH_CREDENTIAL_TYPES,
		],
		['workflow_builder_credentials', 'setup', SHARED_BUILDER_TOOL_NAMES.SETUP_CREDENTIALS],
		['credentials', 'test', SHARED_BUILDER_TOOL_NAMES.TEST_CREDENTIAL],
		['credentials', 'delete', SHARED_BUILDER_TOOL_NAMES.DELETE_CREDENTIAL],
	])('maps %s with action %s to %s', (toolName, action, expected) => {
		expect(resolveBuilderToolName(toolName, action)).toBe(expected);
	});

	it.each([undefined, 'unknown', 3])('keeps a split tool name when the action is %j', (action) => {
		expect(resolveBuilderToolName('credentials', action)).toBe('credentials');
	});

	it.each(Object.values(SHARED_BUILDER_TOOL_NAMES))(
		'keeps the current name %s unchanged',
		(name) => {
			expect(LEGACY_BUILDER_TOOL_NAMES).not.toHaveProperty(name);
			expect(resolveBuilderToolName(name)).toBe(name);
		},
	);

	it.each([
		'ask-user',
		'workflow_builder_ask_user',
		'ask_questions',
		'agent_builder_ask_questions',
	])('maps the former ask tool %s to ask_user', (toolName) => {
		expect(resolveBuilderToolName(toolName)).toBe(SHARED_BUILDER_TOOL_NAMES.ASK_USER);
	});

	it.each(['searchModels', 'workflow_builder_search_models'])(
		'maps the former model search tool %s to search_models',
		(toolName) => {
			expect(resolveBuilderToolName(toolName)).toBe(SHARED_BUILDER_TOOL_NAMES.SEARCH_MODELS);
		},
	);

	it('maps the retired Agent Builder credential list to list_credentials', () => {
		expect(resolveBuilderToolName('agent_builder_list_credentials')).toBe(
			SHARED_BUILDER_TOOL_NAMES.LIST_CREDENTIALS,
		);
	});
});

describe('getLegacyBuilderToolNames', () => {
	it('gives the split tool names only to the tool that resumes their calls', () => {
		expect(getLegacyBuilderToolNames(SHARED_BUILDER_TOOL_NAMES.SETUP_CREDENTIALS)).toEqual([
			'credentials',
			'workflow_builder_credentials',
		]);
		expect(getLegacyBuilderToolNames(SHARED_BUILDER_TOOL_NAMES.LIST_CREDENTIALS)).not.toContain(
			'credentials',
		);
	});
});
