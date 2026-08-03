import { select, input } from '@inquirer/prompts';
import * as fs from 'node:fs/promises';
import * as nodePath from 'node:path';

import type { PermissionMode, ToolGroup } from './config';
import { PERMISSION_MODES, TOOL_GROUP_DEFINITIONS } from './config';

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
