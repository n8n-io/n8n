import type { PermissionMode, ToolGroup } from './config';
import { TOOL_GROUP_DEFINITIONS } from './config';

// ---------------------------------------------------------------------------
// Template types
// ---------------------------------------------------------------------------

export type TemplateName = 'default' | 'yolo' | 'custom'; // 'default' renders as "Recommended" in the UI;

export interface ConfigTemplate {
	name: TemplateName;
	label: string;
	description: string;
	/** Initial permission set for this template. */
	permissions: Record<ToolGroup, PermissionMode>;
}

// ---------------------------------------------------------------------------
// Derived defaults — single source of truth for recommended permissions
// ---------------------------------------------------------------------------

/**
 * Permission map derived from TOOL_GROUP_DEFINITIONS defaults.
 * The recommended template uses this so it stays in sync when defaults change.
 */
const RECOMMENDED_PERMISSIONS = Object.fromEntries(
	Object.entries(TOOL_GROUP_DEFINITIONS).map(([group, opt]) => [group, opt.default]),
) as Record<ToolGroup, PermissionMode>;

// ---------------------------------------------------------------------------
// Templates (spec: "Configuration Templates" table)
// ---------------------------------------------------------------------------

export const CONFIG_TEMPLATES: readonly ConfigTemplate[] = [
	{
		name: 'default',
		label: 'Recommended (default)',
		description:
			'Safe defaults — filesystem readable, filesystem writes and browser automation require confirmation',
		permissions: RECOMMENDED_PERMISSIONS,
	},
	{
		name: 'yolo',
		label: 'Yolo',
		description: 'Allow everything — all capabilities enabled without prompts',
		permissions: {
			filesystemRead: 'allow',
			filesystemWrite: 'allow',
			shell: 'allow',
			computer: 'allow',
			browser: 'allow',
		},
	},
	{
		name: 'custom',
		label: 'Custom',
		description: 'Configure each capability individually',
		// Starts from recommended defaults; user edits each group interactively.
		permissions: RECOMMENDED_PERMISSIONS,
	},
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getTemplate(name: TemplateName): ConfigTemplate {
	const tpl = CONFIG_TEMPLATES.find((t) => t.name === name);
	if (!tpl) throw new Error(`Unknown template: ${name}`);
	return tpl;
}
