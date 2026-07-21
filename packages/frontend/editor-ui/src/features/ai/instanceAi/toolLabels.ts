import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { IconName } from '@n8n/design-system';
import type { InstanceAiToolCallState } from '@n8n/api-types';

const NO_TOGGLE_TOOLS = new Set(['updateWorkingMemory', 'task-control']);
const N8N_SKILL_DIR_TEMPLATE = '$' + '{N8N_SKILL_DIR}';
type I18n = ReturnType<typeof useI18n>;
type SkillFileGroup = 'references' | 'scripts' | 'templates' | 'examples' | 'assets';

const LEGACY_TOOL_NAME_ALIASES: Record<string, string> = {
	resolve_integration: 'add-integration',
	get_node_types: 'describe-nodes',
	list_credentials: 'inspect-credentials',
	list_workflows: 'list-workflows',
};

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

function normalizeToolName(toolName: string): string {
	return LEGACY_TOOL_NAME_ALIASES[toolName] ?? toolName;
}

export function getToolIcon(toolName: string): IconName {
	const normalizedToolName = normalizeToolName(toolName);

	if (toolName === 'complete-checkpoint') return 'circle-check';
	if (toolName.endsWith('-with-agent')) return 'share';
	if (normalizedToolName === 'add-integration') return 'share';
	if (toolName === 'list_skills' || toolName === 'load_skill' || toolName === 'n8n-docs')
		return 'book-open';
	if (toolName === 'data-tables') return 'table';
	if (
		normalizedToolName === 'workflows' ||
		normalizedToolName === 'executions' ||
		normalizedToolName === 'nodes' ||
		normalizedToolName === 'templates' ||
		normalizedToolName === 'search_nodes' ||
		normalizedToolName === 'describe-nodes'
	)
		return 'workflow';
	if (normalizedToolName === 'research') return 'search';
	if (normalizedToolName === 'credentials') return 'key-round';
	if (normalizedToolName === 'task-control' || normalizedToolName === 'updateWorkingMemory')
		return 'brain';
	if (normalizedToolName === 'filesystem') return 'file-text';
	if (normalizedToolName === 'workspace' || normalizedToolName.startsWith('workspace_'))
		return 'folder';
	if (normalizedToolName.includes('data-table')) return 'table';
	if (
		normalizedToolName.includes('workflow') ||
		normalizedToolName === 'submit-workflow' ||
		normalizedToolName === 'materialize-node-type'
	) {
		return 'workflow';
	}
	if (normalizedToolName.includes('credential')) return 'key-round';
	// Fallback for tools without a dedicated mapping.
	return 'wrench';
}

/**
 * Returns a human-readable display label for an instance AI tool name.
 * Falls back to the raw tool name if no mapping exists in i18n.
 */
export function useToolLabel() {
	const i18n = useI18n();

	function getToolLabel(toolName: string, args?: Record<string, unknown>): string {
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

		const normalizedToolName = normalizeToolName(toolName);
		const action = typeof args?.action === 'string' ? args.action : undefined;
		if (action) {
			const actionKey = `instanceAi.tools.${normalizedToolName}.${action}` as BaseTextKey;
			const actionTranslated = i18n.baseText(actionKey);
			if (actionTranslated !== actionKey) return actionTranslated;
		}
		const key = `instanceAi.tools.${normalizedToolName}` as BaseTextKey;
		const translated = i18n.baseText(key);
		return translated === key ? toolName : translated;
	}

	function getToggleLabel(toolCall: InstanceAiToolCallState): string | undefined {
		if (NO_TOGGLE_TOOLS.has(toolCall.toolName)) return undefined;
		return i18n.baseText('instanceAi.stepTimeline.showData');
	}

	function getHideLabel(toolCall: InstanceAiToolCallState): string | undefined {
		if (NO_TOGGLE_TOOLS.has(toolCall.toolName)) return undefined;
		return i18n.baseText('instanceAi.stepTimeline.hideData');
	}

	return { getToolLabel, getToggleLabel, getHideLabel };
}
