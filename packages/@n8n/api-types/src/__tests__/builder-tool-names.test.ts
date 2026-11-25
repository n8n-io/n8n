import {
	CHANGE_DATA_TABLES_TOOL_NAME,
	DATA_TABLE_READ_TOOL_ACTIONS,
	DATA_TABLE_TOOL_ACTIONS,
	DATA_TABLE_TOOL_NAME_BY_ACTION,
	DATA_TABLE_TOOL_NAMES,
	DATA_TABLE_WRITE_TOOL_ACTIONS,
	DATA_TABLE_WRITE_TOOL_NAMES,
	LEGACY_BUILDER_TOOL_NAMES,
	SHARED_BUILDER_TOOL_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
	getDataTableCallAction,
	getLegacyBuilderToolActions,
	getLegacyBuilderToolNames,
	isDataTableWriteToolAction,
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

describe('data table tool names', () => {
	it('splits every action into exactly one of read or write', () => {
		expect([...DATA_TABLE_READ_TOOL_ACTIONS, ...DATA_TABLE_WRITE_TOOL_ACTIONS].sort()).toEqual(
			[...DATA_TABLE_TOOL_ACTIONS].sort(),
		);
	});

	it('keeps no read action among the write actions', () => {
		for (const action of DATA_TABLE_READ_TOOL_ACTIONS) {
			expect(DATA_TABLE_WRITE_TOOL_ACTIONS).not.toContain(action);
		}
	});

	it('keeps the former write tool name of every write action for stored calls', () => {
		for (const action of DATA_TABLE_WRITE_TOOL_ACTIONS) {
			expect(DATA_TABLE_WRITE_TOOL_NAMES).toContain(DATA_TABLE_TOOL_NAME_BY_ACTION[action]);
		}
		expect(DATA_TABLE_WRITE_TOOL_NAMES).not.toContain(CHANGE_DATA_TABLES_TOOL_NAME);
	});

	it('still resolves the action of a stored former write call', () => {
		expect(getDataTableCallAction(SHARED_BUILDER_TOOL_NAMES.ADD_DATA_TABLE_COLUMN)).toBe(
			'add-column',
		);
	});

	it('recognizes only write actions as data table write actions', () => {
		for (const action of DATA_TABLE_WRITE_TOOL_ACTIONS) {
			expect(isDataTableWriteToolAction(action)).toBe(true);
		}
		for (const value of [...DATA_TABLE_READ_TOOL_ACTIONS, 'drop-everything', undefined, 1, {}]) {
			expect(isDataTableWriteToolAction(value)).toBe(false);
		}
	});

	it('recognizes the batch tool as a data table tool without a single action', () => {
		expect(DATA_TABLE_TOOL_NAMES).toContain(CHANGE_DATA_TABLES_TOOL_NAME);
		expect(getDataTableCallAction(CHANGE_DATA_TABLES_TOOL_NAME)).toBeUndefined();
	});
});
