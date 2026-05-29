import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { IconName } from '@n8n/design-system';
import type { InstanceAiToolCallState } from '@n8n/api-types';

const NO_TOGGLE_TOOLS = new Set(['updateWorkingMemory', 'plan', 'task-control']);
const N8N_SKILL_DIR_TEMPLATE = '$' + '{N8N_SKILL_DIR}';
const NODE_SCHEMA_TOOL_NAMES = new Set([
	'get-node-type-definition',
	'get-node-types',
	'get_node_types',
]);
const NODE_LABEL_ACRONYMS = new Map([
	['ai', 'AI'],
	['api', 'API'],
	['graphql', 'GraphQL'],
	['http', 'HTTP'],
	['json', 'JSON'],
]);
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function capitalizeNodeLabelWord(word: string): string {
	const lowerWord = word.toLowerCase();
	return NODE_LABEL_ACRONYMS.get(lowerWord) ?? `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
}

function humanizeNodeTypeLabel(nodeType: string): string {
	const leaf = nodeType.split('.').filter(Boolean).at(-1) ?? nodeType;
	const words = leaf
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[-_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	return words ? words.split(' ').map(capitalizeNodeLabelWord).join(' ') : nodeType;
}

function getNodeTypeId(value: unknown): string | undefined {
	if (typeof value === 'string') return value;
	if (!isRecord(value)) return undefined;
	if (typeof value.nodeType === 'string') return value.nodeType;
	if (typeof value.nodeId === 'string') return value.nodeId;
	return undefined;
}

function humanizeDiscriminator(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[-_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

function getSchemaNodeLabel(value: unknown): string | undefined {
	const nodeTypeId = getNodeTypeId(value);
	if (!nodeTypeId) return undefined;

	const base = humanizeNodeTypeLabel(nodeTypeId);
	if (!isRecord(value)) return base;

	// Disambiguate operation-specific lookups (same node, different resource/operation).
	const details = [value.resource, value.operation]
		.filter((detail): detail is string => typeof detail === 'string' && detail.length > 0)
		.map(humanizeDiscriminator);

	return details.length > 0 ? `${base} (${details.join(' · ')})` : base;
}

function getSchemaNodeLabels(args?: Record<string, unknown>): string[] {
	const nodeList = Array.isArray(args?.nodeTypes)
		? args.nodeTypes
		: Array.isArray(args?.nodeIds)
			? args.nodeIds
			: undefined;
	const nodeRequests = nodeList ?? [args];

	return Array.from(
		new Set(
			nodeRequests.map(getSchemaNodeLabel).filter((label): label is string => Boolean(label)),
		),
	);
}

function isNodeSchemaLookup(toolName: string, args?: Record<string, unknown>): boolean {
	return (
		(toolName === 'nodes' && args?.action === 'type-definition') ||
		NODE_SCHEMA_TOOL_NAMES.has(toolName)
	);
}

function getNodeSchemaToolLabel(
	i18n: I18n,
	toolName: string,
	args?: Record<string, unknown>,
): string | undefined {
	if (!isNodeSchemaLookup(toolName, args)) return undefined;

	const nodeLabels = getSchemaNodeLabels(args);
	if (nodeLabels.length === 0) return undefined;

	return i18n.baseText(
		nodeLabels.length === 1
			? 'instanceAi.tools.nodeSchema.withNode'
			: 'instanceAi.tools.nodeSchema.withNodes',
		{ interpolate: { nodeNames: nodeLabels.join(', ') } },
	);
}

const CREDENTIAL_TYPE_SUFFIX = /(?:OAuth2Api|OAuth1Api|OAuth2|OAuth1|Api|Auth)$/;

function humanizeCredentialTypeLabel(credentialType: string): string {
	const stripped = credentialType.replace(CREDENTIAL_TYPE_SUFFIX, '');
	return humanizeNodeTypeLabel(stripped || credentialType);
}

function getCredentialsToolLabel(
	i18n: I18n,
	toolName: string,
	args?: Record<string, unknown>,
): string | undefined {
	if (toolName !== 'credentials' || args?.action !== 'list') return undefined;

	const type = typeof args.type === 'string' ? args.type : undefined;
	const name = typeof args.name === 'string' ? args.name : undefined;
	const label = type ? humanizeCredentialTypeLabel(type) : name;
	if (!label) return undefined;

	return i18n.baseText('instanceAi.tools.credentials.list.withType', {
		interpolate: { credentialNames: label },
	});
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

export function getToolIcon(toolName: string): IconName {
	if (toolName === 'complete-checkpoint') return 'circle-check';
	if (toolName === 'delegate' || toolName.endsWith('-with-agent')) return 'share';
	if (toolName === 'list_skills' || toolName === 'load_skill') return 'book-open';
	if (toolName === 'data-tables') return 'table';
	if (
		toolName === 'workflows' ||
		toolName === 'executions' ||
		toolName === 'nodes' ||
		toolName === 'templates'
	)
		return 'workflow';
	if (toolName === 'research') return 'search';
	if (toolName === 'credentials') return 'key-round';
	if (toolName === 'task-control' || toolName === 'updateWorkingMemory' || toolName === 'plan')
		return 'brain';
	if (toolName === 'filesystem') return 'file-text';
	if (toolName === 'workspace' || toolName.startsWith('workspace_')) return 'folder';
	if (toolName.includes('data-table')) return 'table';
	if (toolName.includes('workflow') || toolName === 'materialize-node-type') {
		return 'workflow';
	}
	if (toolName.includes('credential')) return 'key-round';
	return 'settings';
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

		const nodeSchemaToolLabel = getNodeSchemaToolLabel(i18n, toolName, args);
		if (nodeSchemaToolLabel) return nodeSchemaToolLabel;

		const credentialsToolLabel = getCredentialsToolLabel(i18n, toolName, args);
		if (credentialsToolLabel) return credentialsToolLabel;

		const action = typeof args?.action === 'string' ? args.action : undefined;
		if (action) {
			const actionKey = `instanceAi.tools.${toolName}.${action}` as BaseTextKey;
			const actionTranslated = i18n.baseText(actionKey);
			if (actionTranslated !== actionKey) return actionTranslated;
		}
		const key = `instanceAi.tools.${toolName}` as BaseTextKey;
		const translated = i18n.baseText(key);
		return translated === key ? toolName : translated;
	}

	function getToggleLabel(toolCall: InstanceAiToolCallState): string | undefined {
		if (NO_TOGGLE_TOOLS.has(toolCall.toolName)) return undefined;
		if (toolCall.toolName === 'delegate') {
			return i18n.baseText('instanceAi.stepTimeline.showBrief');
		}
		return i18n.baseText('instanceAi.stepTimeline.showData');
	}

	function getHideLabel(toolCall: InstanceAiToolCallState): string | undefined {
		if (NO_TOGGLE_TOOLS.has(toolCall.toolName)) return undefined;
		if (toolCall.toolName === 'delegate') {
			return i18n.baseText('instanceAi.stepTimeline.hideBrief');
		}
		return i18n.baseText('instanceAi.stepTimeline.hideData');
	}

	return { getToolLabel, getToggleLabel, getHideLabel };
}
