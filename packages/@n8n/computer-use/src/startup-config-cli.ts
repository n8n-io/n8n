import { select, input } from '@inquirer/prompts';
import * as fs from 'node:fs/promises';
import * as nodePath from 'node:path';

import type { GatewayConfig, PermissionMode, ToolGroup } from './config';
import { PERMISSION_MODES, getSettingsFilePath, TOOL_GROUP_DEFINITIONS } from './config';
import { getTemplate } from './config-templates';

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export const GROUP_LABELS: Record<ToolGroup, string> = {
	filesystemRead: 'Filesystem Read',
	filesystemWrite: 'Filesystem Write',
	shell: 'Shell Execution',
	computer: 'Computer Control',
	browser: 'Browser Automation',
};

export function printPermissionsTable(permissions: Record<ToolGroup, PermissionMode>): void {
	console.log();
	console.log('  Current permissions:');
	for (const group of Object.keys(TOOL_GROUP_DEFINITIONS) as ToolGroup[]) {
		const label = GROUP_LABELS[group].padEnd(20);
		const mode = permissions[group];
		console.log(`    ${label} ${mode}`);
	}
	console.log();
}

// ---------------------------------------------------------------------------
// Interactive prompts
// ---------------------------------------------------------------------------

export async function editPermissions(
	current: Record<ToolGroup, PermissionMode>,
): Promise<Record<ToolGroup, PermissionMode>> {
	const result = { ...current };
	console.log('Edit permissions');
	for (const group of Object.keys(TOOL_GROUP_DEFINITIONS) as ToolGroup[]) {
		result[group] = await select({
			message: `    ${GROUP_LABELS[group]}`,
			default: result[group],
			choices: PERMISSION_MODES.map((mode) => ({ name: mode, value: mode })),
		});
	}
	return result;
}

export async function promptFilesystemDir(currentDir: string): Promise<string> {
	const defaultDir = currentDir || process.cwd();
	const rawDir = await input({
		message: 'AI working directory',
		default: defaultDir,
		validate: async (dir: string) => {
			const resolved = nodePath.resolve(dir);
			try {
				const stat = await fs.stat(resolved);
				if (!stat.isDirectory()) {
					return `'${resolved}' is not a directory.`;
				}
				return true;
			} catch {
				return `Directory '${resolved}' does not exist.`;
			}
		},
	});
	return nodePath.resolve(rawDir);
}

export function isAllDeny(permissions: Record<ToolGroup, PermissionMode>): boolean {
	return (Object.keys(TOOL_GROUP_DEFINITIONS) as ToolGroup[]).every(
		(g) => permissions[g] === 'deny',
	);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Silently creates the settings file with the default (Recommended) template
 * if it does not exist. Merges CLI/ENV overrides from config.permissions on top.
 * filesystemDir is left empty. Does NOT prompt. Safe to call on every startup.
 */
export async function ensureSettingsFile(config: GatewayConfig): Promise<void> {
	const filePath = getSettingsFilePath();

	// Only create if truly absent — never overwrite an existing file.
	try {
		await fs.access(filePath);
		return; // File exists — nothing to do.
	} catch {
		// File does not exist — proceed to create.
	}

	const template = getTemplate('default');
	const permissions = { ...template.permissions, ...config.permissions };

	const content = JSON.stringify(
		{ permissions, filesystemDir: '', resourcePermissions: {} },
		null,
		2,
	);

	await fs.mkdir(nodePath.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, content, { encoding: 'utf-8', mode: 0o600 });
}
