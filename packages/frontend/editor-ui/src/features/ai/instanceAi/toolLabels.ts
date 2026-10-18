import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { IconName } from '@n8n/design-system';
import {
	AGENT_BUILDER_TOOL_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
	resolveBuilderToolName,
} from '@n8n/api-types';
import type { InstanceAiToolCallState } from '@n8n/api-types';

const NO_TOGGLE_TOOLS = new Set<string>([
	'updateWorkingMemory',
	WORKFLOW_BUILDER_TOOL_NAMES.TASK_CONTROL,
]);
const SKILL_TOOLS = new Set<string>([
	AGENT_BUILDER_TOOL_NAMES.CREATE_SKILLS,
	'list_skills',
	'read_skill',
	AGENT_BUILDER_TOOL_NAMES.UPDATE_SKILL,
	'load_skill',
]);
const WORKFLOW_BUILDER_PREFIX_PATTERN = /^workflow_builder_/;
const N8N_SKILL_DIR_TEMPLATE = '$' + '{N8N_SKILL_DIR}';
type I18n = ReturnType<typeof useI18n>;
type SkillFileGroup = 'references' | 'scripts' | 'templates' | 'examples' | 'assets';

const SKILL_FILE_GROUP_LABELS: Record<
	SkillFileGroup,
	{ verbKey: BaseTextKey; kindKey: BaseTextKey; appendKind: boolean }
> = {
	references: {
		verbKey: 'instanceAi.tools.load_skill.reference',
		kindKey: 'instanceAi.tools.load_skill.referenceFallback',
		appendKind: false,
	},
	scripts: {
		verbKey: 'instanceAi.tools.load_skill.script',
		kindKey: 'instanceAi.tools.load_skill.scriptFallback',
		appendKind: true,
	},
	templates: {
		verbKey: 'instanceAi.tools.load_skill.template',
		kindKey: 'instanceAi.tools.load_skill.templateFallback',
		appendKind: true,
	},
	examples: {
		verbKey: 'instanceAi.tools.load_skill.example',
		kindKey: 'instanceAi.tools.load_skill.exampleFallback',
		appendKind: true,
	},
	assets: {
		verbKey: 'instanceAi.tools.load_skill.asset',
		kindKey: 'instanceAi.tools.load_skill.assetFallback',
		appendKind: true,
	},
};

function getBasename(path: string): string {
	const cleanPath = path.split(/[?#]/, 1)[0] ?? path;
	return cleanPath.split('/').filter(Boolean).at(-1) ?? cleanPath;
}

function humanizeFileLabel(path: string): string {
	const basename = getBasename(path);
	const withoutExtension = basename.replace(/\.[^.]+$/, '');
	return withoutExtension
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[-_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

function appendKind(label: string, kind: string): string {
	if (!label) return kind;
	const words = label.split(' ');
	return words.at(-1) === kind ? label : `${label} ${kind}`;
}

function isSkillFileGroup(value: string | undefined): value is SkillFileGroup {
	return (
		value !== undefined && Object.prototype.hasOwnProperty.call(SKILL_FILE_GROUP_LABELS, value)
	);
}

function getSkillFileLabel(i18n: I18n, filePath: string): string | undefined {
	const [group] = filePath.split('/');
	const fileLabel = humanizeFileLabel(filePath);

	if (isSkillFileGroup(group)) {
		const labels = SKILL_FILE_GROUP_LABELS[group];
		const kind = i18n.baseText(labels.kindKey);
		const target = labels.appendKind ? appendKind(fileLabel, kind) : fileLabel || kind;
		return `${i18n.baseText(labels.verbKey)} ${target}`;
	}

	if (fileLabel) {
		return `${i18n.baseText('instanceAi.tools.load_skill.file')} ${fileLabel}`;
	}

	return undefined;
}

function extractSkillScriptPath(command: string): string | undefined {
	const envSkillDirMatch = command.match(
		/\$(?:\{N8N_SKILL_DIR\}|N8N_SKILL_DIR)\/scripts\/([^\s"'`;|&]+)/,
	);
	if (envSkillDirMatch?.[1]) return envSkillDirMatch[1];

	const sandboxSkillDirMatch = command.match(/\/skills\/[^/\s"'`;|&]+\/scripts\/([^\s"'`;|&]+)/);
	return sandboxSkillDirMatch?.[1];
}

function getBuildAgentOperationKey(operation: unknown): BaseTextKey | undefined {
	switch (operation) {
		case 'editing':
			return 'instanceAi.tools.agent_builder_build_agent.editing';
		case 'exploring':
			return 'instanceAi.tools.agent_builder_build_agent.exploring';
		case 'testing':
			return 'instanceAi.tools.agent_builder_build_agent.testing';
		case 'publishing':
			return 'instanceAi.tools.agent_builder_build_agent.publishing';
		default:
			return undefined;
	}
}

export function getToolIcon(rawToolName: string): IconName {
	const toolName = resolveBuilderToolName(rawToolName);
	if (toolName === WORKFLOW_BUILDER_TOOL_NAMES.COMPLETE_CHECKPOINT) return 'circle-check';
	if (toolName.endsWith('-with-agent')) return 'share';
	if (toolName === 'resolve_integration') return 'share';
	if (SKILL_TOOLS.has(toolName) || toolName === 'n8n-docs') return 'book-open';
	if (toolName === WORKFLOW_BUILDER_TOOL_NAMES.DATA_TABLES) return 'table';
	if (toolName === 'activity') return 'history';
	if (toolName === 'conversation-history') return 'message-square';
	if (toolName === 'mcp-servers') return 'plug';
	if (
		toolName === WORKFLOW_BUILDER_TOOL_NAMES.WORKFLOWS ||
		toolName === WORKFLOW_BUILDER_TOOL_NAMES.EXECUTIONS ||
		toolName === WORKFLOW_BUILDER_TOOL_NAMES.NODES ||
		toolName === 'templates' ||
		toolName === AGENT_BUILDER_TOOL_NAMES.SEARCH_NODES ||
		toolName === AGENT_BUILDER_TOOL_NAMES.GET_NODE_TYPES
	)
		return 'workflow';
	if (toolName === 'research') return 'search';
	if (toolName === WORKFLOW_BUILDER_TOOL_NAMES.CREDENTIALS) return 'key-round';
	if (toolName === WORKFLOW_BUILDER_TOOL_NAMES.TASK_CONTROL || toolName === 'updateWorkingMemory')
		return 'brain';
	if (toolName === 'filesystem') return 'file-text';
	if (toolName === 'workspace' || toolName.startsWith('workspace_')) return 'folder';
	// The prefix contains "workflow", so match on the rest of the name only.
	const unprefixedName = toolName.replace(WORKFLOW_BUILDER_PREFIX_PATTERN, '');
	if (unprefixedName.includes('data-table')) return 'table';
	if (
		unprefixedName.includes('workflow') ||
		toolName === 'submit-workflow' ||
		toolName === 'materialize-node-type'
	) {
		return 'workflow';
	}
	if (unprefixedName.includes('credential')) return 'key-round';
	// Fallback for tools without a dedicated mapping.
	return 'wrench';
}

/**
 * Returns a human-readable display label for an instance AI tool name.
 * Falls back to the raw tool name if no mapping exists in i18n.
 */
export function useToolLabel() {
	const i18n = useI18n();

	function getToolLabel(rawToolName: string, args?: Record<string, unknown>): string {
		const toolName = resolveBuilderToolName(rawToolName);
		if (toolName === AGENT_BUILDER_TOOL_NAMES.BUILD_AGENT) {
			const operationKey = getBuildAgentOperationKey(args?.operation);
			if (operationKey) return i18n.baseText(operationKey);
		}
		if (toolName === 'agent-context' && typeof args?.type === 'string') {
			const lookupKey = `instanceAi.tools.agent-context.${args.type}` as BaseTextKey;
			const lookupLabel = i18n.baseText(lookupKey);
			if (lookupLabel !== lookupKey) return lookupLabel;
		}
		if (toolName === 'load_skill') {
			const name = typeof args?.name === 'string' ? args.name : undefined;
			const filePath = typeof args?.filePath === 'string' ? args.filePath : undefined;
			if (filePath) {
				const skillFileLabel = getSkillFileLabel(i18n, filePath);
				if (skillFileLabel) return skillFileLabel;
			}

			const label = i18n.baseText('instanceAi.tools.load_skill');
			if (name) return `${label}: ${name}`;
			return label;
		}

		if (
			toolName === 'workspace_execute_command' &&
			typeof args?.command === 'string' &&
			(args.command.includes(N8N_SKILL_DIR_TEMPLATE) ||
				args.command.includes('$N8N_SKILL_DIR') ||
				args.command.includes('/skills/'))
		) {
			const scriptPath = extractSkillScriptPath(args.command);
			if (scriptPath) {
				const scriptLabel = appendKind(
					humanizeFileLabel(scriptPath),
					i18n.baseText('instanceAi.tools.load_skill.scriptFallback'),
				);
				return `${i18n.baseText('instanceAi.tools.workspace_execute_command.skillScript')} ${scriptLabel}`;
			}

			return i18n.baseText('instanceAi.tools.workspace_execute_command.skill');
		}

		const action = typeof args?.action === 'string' ? args.action : undefined;
		if (action) {
			const actionKey = `instanceAi.tools.${toolName}.${action}` as BaseTextKey;
			const actionTranslated = i18n.baseText(actionKey);
			if (actionTranslated !== actionKey) return actionTranslated;
		}
		const key = `instanceAi.tools.${toolName}` as BaseTextKey;
		const translated = i18n.baseText(key);
		return translated === key ? rawToolName : translated;
	}

	function getToggleLabel(toolCall: InstanceAiToolCallState): string | undefined {
		if (NO_TOGGLE_TOOLS.has(resolveBuilderToolName(toolCall.toolName))) return undefined;
		return i18n.baseText('instanceAi.stepTimeline.showData');
	}

	function getHideLabel(toolCall: InstanceAiToolCallState): string | undefined {
		if (NO_TOGGLE_TOOLS.has(resolveBuilderToolName(toolCall.toolName))) return undefined;
		return i18n.baseText('instanceAi.stepTimeline.hideData');
	}

	return { getToolLabel, getToggleLabel, getHideLabel };
}
