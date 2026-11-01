import { describe, expect, test } from 'vitest';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	AGENT_BUILDER_TOOL_NAMES,
	LEGACY_BUILDER_TOOL_NAMES,
	REMOVED_BUILDER_TOOL_NAMES,
	SHARED_BUILDER_TOOL_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
} from '@n8n/api-types';
import { useToolLabel } from '../toolLabels';

// Keep in sync with the tools that `@n8n/instance-ai` and `@n8n/agents` register outside the
// builder registries. The frontend cannot import those backend packages.
const OTHER_INSTANCE_AI_TOOL_NAMES = [
	'eval-config',
	'workspace',
	'research',
	'n8n-docs',
	'leave-onboarding',
	'parse-file',
	'agent-context',
	'mcp-servers',
	'conversation-history',
	'activity',
	'save_user_preference',
	'get-session',
	'write-file',
	'materialize-node-type',
	'web-search',
	'fetch-url',
	'search_tools',
	'load_tool',
	'load_skill',
	'apps',
	'workspace_append_file',
	'workspace_copy_file',
	'workspace_delete_file',
	'workspace_execute_command',
	'workspace_file_stat',
	'workspace_kill_process',
	'workspace_list_files',
	'workspace_list_processes',
	'workspace_mkdir',
	'workspace_move_file',
	'workspace_read_file',
	'workspace_read_files',
	'workspace_read_tool_result',
	'workspace_rmdir',
	'workspace_str_replace_file',
	'workspace_edit_files',
	'workspace_write_file',
];

const ALL_TOOL_NAMES = [
	...Object.values(WORKFLOW_BUILDER_TOOL_NAMES),
	...Object.values(AGENT_BUILDER_TOOL_NAMES),
	...Object.values(SHARED_BUILDER_TOOL_NAMES),
	...Object.values(REMOVED_BUILDER_TOOL_NAMES),
	...OTHER_INSTANCE_AI_TOOL_NAMES,
];

describe('tool label coverage', () => {
	const i18n = useI18n();
	const { getToolLabel } = useToolLabel();

	test.each(ALL_TOOL_NAMES)('%s has an i18n label', (toolName) => {
		const key = `instanceAi.tools.${toolName}` as BaseTextKey;
		expect(i18n.baseText(key)).not.toBe(key);
	});

	test.each(Object.entries(LEGACY_BUILDER_TOOL_NAMES))(
		'legacy name %s uses the label of %s',
		(legacyName, currentName) => {
			expect(getToolLabel(legacyName)).toBe(getToolLabel(currentName));
		},
	);
});
