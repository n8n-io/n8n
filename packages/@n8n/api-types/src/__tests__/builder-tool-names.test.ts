import {
	LEGACY_BUILDER_TOOL_NAMES,
	SHARED_BUILDER_TOOL_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
	getLegacyBuilderToolActions,
	getLegacyBuilderToolNames,
	isFormerWorkflowsTool,
	resolveBuilderToolName,
} from '../builder-tool-names';

describe('resolveBuilderToolName', () => {
	it('maps a renamed tool to its current name', () => {
		expect(resolveBuilderToolName('nodes')).toBe(WORKFLOW_BUILDER_TOOL_NAMES.NODES);
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
		['workflows', 'list', WORKFLOW_BUILDER_TOOL_NAMES.LIST_WORKFLOWS],
		['workflow_builder_workflows', 'setup', WORKFLOW_BUILDER_TOOL_NAMES.SETUP_WORKFLOW],
		['workflow_builder_workflows', 'delete', WORKFLOW_BUILDER_TOOL_NAMES.ARCHIVE_WORKFLOW],
		[
			'workflow_builder_workflows',
			'restore-version',
			WORKFLOW_BUILDER_TOOL_NAMES.RESTORE_WORKFLOW_VERSION,
		],
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

describe('getLegacyBuilderToolActions', () => {
	it('gives each split workflow tool the former names for its own action', () => {
		expect(getLegacyBuilderToolActions(WORKFLOW_BUILDER_TOOL_NAMES.PUBLISH_WORKFLOW)).toEqual([
			['workflows', ['publish']],
			['workflow_builder_workflows', ['publish']],
		]);
	});

	it('leaves a split tool with one resuming tool to legacy names', () => {
		expect(getLegacyBuilderToolActions(SHARED_BUILDER_TOOL_NAMES.DELETE_CREDENTIAL)).toEqual([]);
	});

	it('covers every action of the former workflows tool', () => {
		const covered = Object.values(WORKFLOW_BUILDER_TOOL_NAMES).flatMap((name) =>
			getLegacyBuilderToolActions(name)
				.filter(([legacyName]) => legacyName === 'workflow_builder_workflows')
				.flatMap(([, actions]) => actions),
		);
		expect(covered.sort()).toEqual(
			[
				'list',
				'node-usage',
				'get',
				'get-as-code',
				'delete',
				'unarchive',
				'setup',
				'validate',
				'publish',
				'unpublish',
				'list-versions',
				'restore-version',
				'update-version',
			].sort(),
		);
	});
});

describe('isFormerWorkflowsTool', () => {
	it.each(['workflows', 'workflow_builder_workflows'])('recognizes %s', (name) => {
		expect(isFormerWorkflowsTool(name)).toBe(true);
	});

	it.each(['credentials', WORKFLOW_BUILDER_TOOL_NAMES.LIST_WORKFLOWS, 'toString'])(
		'rejects %s',
		(name) => {
			expect(isFormerWorkflowsTool(name)).toBe(false);
		},
	);
});
