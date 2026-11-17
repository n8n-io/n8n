import * as fs from 'node:fs';
import * as path from 'node:path';

import { SKILL_SYNC_DIR_NAME } from './skill-sync';

const HANDLER_FILES = ['hook.js', 'skill-sync.js'];
const SKILL_TOOLS_MATCHER = 'mcp__.*__(search_n8n_skills|get_skill)';

type HookGroup = { matcher?: string; hooks?: Array<{ command?: unknown }> };

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withoutSkillSyncHooks(groups: unknown, hookPath: string): HookGroup[] {
	if (!Array.isArray(groups)) return [];
	return groups.filter(
		(group: HookGroup) =>
			!group.hooks?.some(
				(hook) => typeof hook.command === 'string' && hook.command.includes(hookPath),
			),
	);
}

export function installSkillSyncHooks(configDir: string, compiledHandlerDir: string) {
	const handlerDir = path.join(configDir, SKILL_SYNC_DIR_NAME);
	fs.mkdirSync(handlerDir, { recursive: true });
	for (const file of HANDLER_FILES) {
		fs.copyFileSync(path.join(compiledHandlerDir, file), path.join(handlerDir, file));
	}
	fs.writeFileSync(path.join(handlerDir, 'package.json'), '{ "type": "commonjs" }\n');
	fs.mkdirSync(path.join(configDir, 'skills'), { recursive: true });

	const hookPath = path.join(handlerDir, 'hook.js');
	const command = `node ${JSON.stringify(hookPath)}`;
	const settingsPath = path.join(configDir, 'settings.json');
	const settings: unknown = fs.existsSync(settingsPath)
		? JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
		: {};
	if (!isObject(settings)) throw new Error(`${settingsPath} does not hold a JSON object`);
	const hooks = isObject(settings.hooks) ? settings.hooks : {};

	settings.hooks = {
		...hooks,
		SessionStart: [
			...withoutSkillSyncHooks(hooks.SessionStart, hookPath),
			{ matcher: 'startup|clear', hooks: [{ type: 'command', command }] },
		],
		PostToolUse: [
			...withoutSkillSyncHooks(hooks.PostToolUse, hookPath),
			{ matcher: SKILL_TOOLS_MATCHER, hooks: [{ type: 'command', command }] },
		],
	};
	fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
	return { settingsPath, hookPath };
}
