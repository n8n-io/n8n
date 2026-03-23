import * as fs from 'node:fs/promises';
import * as nodePath from 'node:path';
import type { Interface as ReadlineInterface } from 'node:readline';
import readline from 'node:readline';

import type { GatewayConfig, PermissionMode, ToolGroup } from './config';
import { PERMISSION_MODES, getSettingsFilePath, TOOL_GROUP_DEFINITIONS } from './config';
import type { ConfigTemplate, TemplateName } from './config-templates';
import { CONFIG_TEMPLATES, getTemplate } from './config-templates';

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const GROUP_LABELS: Record<ToolGroup, string> = {
	filesystemRead: 'Filesystem Read',
	filesystemWrite: 'Filesystem Write',
	shell: 'Shell Execution',
	computer: 'Computer Control',
	browser: 'Browser Automation',
};

async function prompt(rl: ReadlineInterface, question: string): Promise<string> {
	return await new Promise((resolve) => rl.question(question, resolve));
}

function printPermissionsTable(permissions: Record<ToolGroup, PermissionMode>): void {
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
// Settings file I/O (minimal — only reads/writes permissions and filesystemDir)
// ---------------------------------------------------------------------------

async function loadPersistedPermissions(): Promise<Partial<
	Record<ToolGroup, PermissionMode>
> | null> {
	try {
		const raw = await fs.readFile(getSettingsFilePath(), 'utf-8');
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const perms = parsed.permissions;
		if (typeof perms !== 'object' || perms === null) return null;
		if (Object.keys(perms).length === 0) return null;
		return perms as Partial<Record<ToolGroup, PermissionMode>>;
	} catch {
		return null;
	}
}

async function saveStartupConfig(
	permissions: Record<ToolGroup, PermissionMode>,
	filesystemDir: string,
): Promise<void> {
	const filePath = getSettingsFilePath();
	// Preserve existing resource-level rules while updating permissions + dir
	let existing: Record<string, unknown> = { resourcePermissions: {} };
	try {
		const raw = await fs.readFile(filePath, 'utf-8');
		existing = JSON.parse(raw) as Record<string, unknown>;
	} catch {
		// File absent or malformed — start fresh
	}
	await fs.mkdir(nodePath.dirname(filePath), { recursive: true });
	await fs.writeFile(
		filePath,
		JSON.stringify({ ...existing, permissions, filesystemDir }, null, 2),
		'utf-8',
	);
}

// ---------------------------------------------------------------------------
// Interactive prompts
// ---------------------------------------------------------------------------

async function selectTemplate(rl: ReadlineInterface): Promise<ConfigTemplate> {
	console.log('  No configuration found. Choose a starting template:\n');
	CONFIG_TEMPLATES.forEach((tpl, i) => {
		console.log(`    ${i + 1}. ${tpl.label}`);
		console.log(`       ${tpl.description}`);
	});
	console.log();

	while (true) {
		const answer = await prompt(rl, `  Template [1-${CONFIG_TEMPLATES.length}] (default: 1): `);
		const trimmed = answer.trim();
		const idx = trimmed === '' ? 0 : parseInt(trimmed, 10) - 1;
		if (idx >= 0 && idx < CONFIG_TEMPLATES.length) {
			return CONFIG_TEMPLATES[idx];
		}
		console.log(`  Invalid choice — enter a number between 1 and ${CONFIG_TEMPLATES.length}.`);
	}
}

const PERMISSION_MODE_OPTIONS = PERMISSION_MODES.map((m, i) => `${i + 1}: ${m}`).join(', ');

async function editPermissions(
	rl: ReadlineInterface,
	current: Record<ToolGroup, PermissionMode>,
): Promise<Record<ToolGroup, PermissionMode>> {
	const result = { ...current };
	console.log('  Edit permissions — press Enter to keep current value.\n');
	for (const group of Object.keys(TOOL_GROUP_DEFINITIONS) as ToolGroup[]) {
		while (true) {
			const answer = await prompt(
				rl,
				`    ${GROUP_LABELS[group]} [${result[group]}] (${PERMISSION_MODE_OPTIONS}): `,
			);
			const trimmed = answer.trim();
			if (trimmed === '') break;
			const idx = parseInt(trimmed, 10) - 1;
			if (idx >= 0 && idx < PERMISSION_MODES.length) {
				result[group] = PERMISSION_MODES[idx];
				break;
			}
			console.log(`    Invalid choice — enter a number (${PERMISSION_MODE_OPTIONS}).`);
		}
	}
	return result;
}

async function promptFilesystemDir(rl: ReadlineInterface, currentDir: string): Promise<string> {
	console.log();
	while (true) {
		const answer = await prompt(rl, `  Filesystem root directory [${currentDir}]: `);
		const trimmed = answer.trim();
		const dir = trimmed === '' ? currentDir : nodePath.resolve(trimmed);
		try {
			const stat = await fs.stat(dir);
			if (stat.isDirectory()) return dir;
			console.log(`  '${dir}' is not a directory.`);
		} catch {
			console.log(`  Directory '${dir}' does not exist.`);
		}
	}
}

function isAllDeny(permissions: Record<ToolGroup, PermissionMode>): boolean {
	return (Object.keys(TOOL_GROUP_DEFINITIONS) as ToolGroup[]).every(
		(g) => permissions[g] === 'deny',
	);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the interactive startup configuration prompt.
 * Returns an updated GatewayConfig with user-chosen permissions and filesystem dir.
 * Persists the result to the settings file.
 */
export async function runStartupConfigCli(config: GatewayConfig): Promise<GatewayConfig> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

	try {
		const existing = await loadPersistedPermissions();
		let permissions: Record<ToolGroup, PermissionMode>;

		if (existing === null) {
			// First run — show template selection
			const tpl = await selectTemplate(rl);
			// Merge startup CLI/ENV overrides on top of template
			permissions = { ...tpl.permissions, ...config.permissions } as Record<
				ToolGroup,
				PermissionMode
			>;
			// Custom template: go straight to per-group editing
			if (tpl.name === 'custom') {
				permissions = await editPermissions(rl, permissions);
			} else {
				printPermissionsTable(permissions);
				const answer = await prompt(rl, '  Confirm? [y/n (edit)] (default: y): ');
				if (['n', 'edit'].includes(answer.trim().toLowerCase())) {
					permissions = await editPermissions(rl, permissions);
				}
			}
		} else {
			// Existing config — merge file permissions and startup CLI/ENV overrides
			const merged = Object.fromEntries(
				(Object.keys(TOOL_GROUP_DEFINITIONS) as ToolGroup[]).map((g) => [
					g,
					config.permissions[g] ?? existing[g] ?? TOOL_GROUP_DEFINITIONS[g].default,
				]),
			) as Record<ToolGroup, PermissionMode>;

			printPermissionsTable(merged);
			const answer = await prompt(rl, '  Confirm? [y/n (edit)] (default: y): ');
			if (['n', 'edit'].includes(answer.trim().toLowerCase())) {
				permissions = await editPermissions(rl, merged);
			} else {
				permissions = merged;
			}
		}

		// At least one group must be Ask or Allow (spec: gateway will not start otherwise)
		while (isAllDeny(permissions)) {
			console.log(
				'\n  At least one capability must be Ask or Allow. Please edit the permissions.\n',
			);
			permissions = await editPermissions(rl, permissions);
		}

		// Filesystem dir — required when any filesystem group is active
		const filesystemActive =
			permissions.filesystemRead !== 'deny' || permissions.filesystemWrite !== 'deny';
		const filesystemDir = filesystemActive
			? await promptFilesystemDir(rl, config.filesystem.dir)
			: config.filesystem.dir;

		await saveStartupConfig(permissions, filesystemDir);

		return { ...config, permissions, filesystem: { ...config.filesystem, dir: filesystemDir } };
	} finally {
		rl.close();
	}
}

/**
 * Return the template name for display purposes given a `--template` CLI flag value.
 * Falls back to 'default' for unknown values.
 */
export function resolveTemplateName(raw: string | undefined): TemplateName {
	if (raw === 'yolo' || raw === 'custom' || raw === 'default') return raw;
	return 'default';
}

/**
 * Apply a named template to a config, merging existing CLI/ENV overrides on top.
 * Useful for non-interactive pre-seeding (e.g. `--template yolo` in tests or CI).
 */
export function applyTemplate(config: GatewayConfig, templateName: TemplateName): GatewayConfig {
	const tpl = getTemplate(templateName);
	return {
		...config,
		permissions: { ...tpl.permissions, ...config.permissions },
	};
}
