import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { installSkillSyncHooks } from '../skill-sync/install-hooks';
import { handleHookInput, SESSION_START_CONTEXT } from '../skill-sync/skill-sync';

let configDir: string;
const server = { name: 'n8n', source: 'user' };

function listItem(id: string, name: string, extra: Record<string, unknown> = {}) {
	return {
		id,
		name,
		description: `${name} description`,
		latestVersion: 1,
		updatedAt: '2026-11-01T00:00:00.000Z',
		...extra,
	};
}

function search(skills: unknown[], toolInput: Record<string, unknown> = { limit: 100 }) {
	return handleHookInput(
		{
			hook_event_name: 'PostToolUse',
			tool_name: 'mcp__n8n__search_n8n_skills',
			mcp_server: server,
			tool_input: toolInput,
			tool_response: JSON.stringify({ count: skills.length, skills }),
		},
		configDir,
	);
}

function getSkill(
	item: ReturnType<typeof listItem>,
	skill: Record<string, unknown> = {},
	response?: unknown,
) {
	return handleHookInput(
		{
			hook_event_name: 'PostToolUse',
			tool_name: 'mcp__n8n__get_skill',
			mcp_server: server,
			tool_input: { skillId: item.id },
			tool_response:
				response ??
				JSON.stringify({
					...item,
					skill: {
						name: item.name,
						description: item.description,
						instructions: `Instructions of ${item.name}`,
						...skill,
					},
				}),
		},
		configDir,
	);
}

function skillsDir() {
	return path.join(configDir, 'skills');
}

function installedSkills() {
	return fs.existsSync(skillsDir()) ? fs.readdirSync(skillsDir()) : [];
}

function snapshot() {
	const files: string[] = [];
	const walk = (dir: string) => {
		if (!fs.existsSync(dir)) return;
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else files.push(`${path.relative(configDir, full)}:${fs.readFileSync(full, 'utf8')}`);
		}
	};
	walk(configDir);
	return files.sort();
}

beforeEach(() => {
	configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-skill-sync-'));
});

afterEach(() => {
	fs.rmSync(configDir, { recursive: true, force: true });
});

describe('handleHookInput', () => {
	it('asks the agent to search skills at session start and creates the skills folder', () => {
		const output = handleHookInput({ hook_event_name: 'SessionStart' }, configDir);

		expect(output?.hookSpecificOutput.additionalContext).toBe(SESSION_START_CONTEXT);
		expect(fs.existsSync(skillsDir())).toBe(true);
	});

	it('installs new skills that a complete search lists', () => {
		const pdf = listItem('pdf1', 'PDF Tools');
		const output = search([pdf]);

		expect(output?.hookSpecificOutput.additionalContext).toContain('pdf1');

		const installed = getSkill(pdf, { references: [{ path: 'docs/forms.md', content: 'Forms' }] });

		expect(installed?.hookSpecificOutput.additionalContext).toContain('local skill n8n-pdf-tools');

		const skillMd = fs.readFileSync(path.join(skillsDir(), 'n8n-pdf-tools', 'SKILL.md'), 'utf8');
		expect(skillMd).toBe(
			'---\nname: n8n-pdf-tools\ndescription: "PDF Tools description"\n---\n\nInstructions of PDF Tools\n\n## References\n\n- [docs/forms.md](docs/forms.md)\n',
		);
		expect(
			fs.readFileSync(path.join(skillsDir(), 'n8n-pdf-tools', 'docs', 'forms.md'), 'utf8'),
		).toBe('Forms');
		expect(search([pdf])).toBeUndefined();
	});

	it('updates a skill when its version changes', () => {
		const pdf = listItem('pdf1', 'PDF Tools');
		search([pdf]);
		getSkill(pdf, { references: [{ path: 'old.md', content: 'Old' }] });

		const changed = { ...pdf, latestVersion: 2, updatedAt: '2026-11-02T00:00:00.000Z' };
		expect(search([changed])?.hookSpecificOutput.additionalContext).toContain('pdf1');
		getSkill(changed, { instructions: 'New instructions' });

		const folder = path.join(skillsDir(), 'n8n-pdf-tools');
		expect(fs.readFileSync(path.join(folder, 'SKILL.md'), 'utf8')).toContain('New instructions');
		expect(fs.existsSync(path.join(folder, 'old.md'))).toBe(false);
	});

	it('removes synced skills that are gone from n8n and keeps other skills', () => {
		const pdf = listItem('pdf1', 'PDF Tools');
		search([pdf]);
		getSkill(pdf);
		fs.mkdirSync(path.join(skillsDir(), 'my-own-skill'));

		const output = search([]);

		expect(output?.hookSpecificOutput.additionalContext).toContain('n8n-pdf-tools');
		expect(fs.readdirSync(skillsDir())).toEqual(['my-own-skill']);
	});

	it('does not install skills that are not available to MCP clients', () => {
		const hidden = listItem('hidden1', 'Hidden', { availableToMCP: false });

		expect(search([hidden])).toBeUndefined();
		getSkill(hidden);

		expect(installedSkills()).toEqual([]);
	});

	it.each([
		['a query', { query: 'pdf' }],
		['a scope', { scope: 'project' }],
		['a project', { projectId: 'p1' }],
		['an agent filter', { attachableToAgentId: 'agent1' }],
		['a skip', { skip: 1 }],
	])('does nothing for a search with %s', (_label, toolInput) => {
		const pdf = listItem('pdf1', 'PDF Tools');
		search([pdf]);
		getSkill(pdf);
		const before = snapshot();

		expect(search([], toolInput)).toBeUndefined();
		expect(search([listItem('new1', 'New')], toolInput)).toBeUndefined();
		expect(snapshot()).toEqual(before);
	});

	it('does nothing for a search page that is not complete', () => {
		const pdf = listItem('pdf1', 'PDF Tools');
		search([pdf]);
		getSkill(pdf);
		const before = snapshot();

		const output = handleHookInput(
			{
				hook_event_name: 'PostToolUse',
				tool_name: 'mcp__n8n__search_n8n_skills',
				mcp_server: server,
				tool_input: { limit: 1 },
				tool_response: JSON.stringify({ count: 2, skills: [listItem('other1', 'Other')] }),
			},
			configDir,
		);

		expect(output).toBeUndefined();
		expect(snapshot()).toEqual(before);
	});

	it('does not write a skill that the last complete search did not ask for', () => {
		expect(getSkill(listItem('pdf1', 'PDF Tools'))).toBeUndefined();

		expect(installedSkills()).toEqual([]);
	});

	it('keeps the skills of another MCP server', () => {
		const pdf = listItem('pdf1', 'PDF Tools');
		search([pdf]);
		getSkill(pdf);

		handleHookInput(
			{
				hook_event_name: 'PostToolUse',
				tool_name: 'mcp__other__search_n8n_skills',
				mcp_server: { name: 'other', source: 'user' },
				tool_input: {},
				tool_response: JSON.stringify({ count: 0, skills: [] }),
			},
			configDir,
		);

		expect(fs.readdirSync(skillsDir())).toEqual(['n8n-pdf-tools']);
	});

	it('does not overwrite a skill folder that the sync does not own', () => {
		fs.mkdirSync(path.join(skillsDir(), 'n8n-pdf-tools'), { recursive: true });
		fs.writeFileSync(path.join(skillsDir(), 'n8n-pdf-tools', 'SKILL.md'), 'mine');
		const pdf = listItem('pdf1', 'PDF Tools');
		search([pdf]);
		getSkill(pdf);

		expect(fs.readFileSync(path.join(skillsDir(), 'n8n-pdf-tools', 'SKILL.md'), 'utf8')).toBe(
			'mine',
		);
		expect(fs.existsSync(path.join(skillsDir(), 'n8n-pdf-tools-pdf1', 'SKILL.md'))).toBe(true);
	});

	it.each(['../escape.md', '/etc/passwd', 'a/../../b.md', 'SKILL.md', 'a\\b.md', 'C:/x.md'])(
		'rejects a skill with the reference path %s',
		(referencePath) => {
			const pdf = listItem('pdf1', 'PDF Tools');
			search([pdf]);
			getSkill(pdf, { references: [{ path: referencePath, content: 'x' }] });

			expect(installedSkills()).toEqual([]);
		},
	);

	it('reads a large result from the file that Claude Code saved it to', () => {
		const pdf = listItem('pdf1', 'PDF Tools');
		search([pdf]);
		const savedFile = path.join(configDir, 'projects', 'p', 's', 'tool-results', 'get_skill.txt');
		fs.mkdirSync(path.dirname(savedFile), { recursive: true });
		fs.writeFileSync(
			savedFile,
			JSON.stringify({ ...pdf, skill: { ...pdf, instructions: 'Large instructions' } }),
		);

		getSkill(
			pdf,
			{},
			`Error: result exceeds maximum allowed tokens. Output has been saved to ${savedFile}.\nFormat: JSON`,
		);

		expect(fs.readFileSync(path.join(skillsDir(), 'n8n-pdf-tools', 'SKILL.md'), 'utf8')).toContain(
			'Large instructions',
		);
	});

	it('does not read a saved result outside the Claude Code tool results folder', () => {
		const pdf = listItem('pdf1', 'PDF Tools');
		search([pdf]);
		const outside = path.join(configDir, 'tool-results', 'get_skill.txt');
		fs.mkdirSync(path.dirname(outside), { recursive: true });
		fs.writeFileSync(outside, JSON.stringify({ ...pdf, skill: { ...pdf, instructions: 'x' } }));

		getSkill(pdf, {}, `Output has been saved to ${outside}.`);

		expect(installedSkills()).toEqual([]);
	});

	it('ignores tools that are not MCP tools', () => {
		const output = handleHookInput(
			{
				hook_event_name: 'PostToolUse',
				tool_name: 'search_n8n_skills',
				tool_input: {},
				tool_response: JSON.stringify({ count: 1, skills: [listItem('pdf1', 'PDF Tools')] }),
			},
			configDir,
		);

		expect(output).toBeUndefined();
		expect(fs.readdirSync(configDir)).toEqual([]);
	});
});

describe('installSkillSyncHooks', () => {
	function compiledHandlerDir() {
		const dir = path.join(configDir, 'build');
		fs.mkdirSync(dir);
		fs.writeFileSync(path.join(dir, 'hook.js'), '');
		fs.writeFileSync(path.join(dir, 'skill-sync.js'), '');
		return dir;
	}

	it('adds the hooks once and keeps the other settings', () => {
		const settingsPath = path.join(configDir, 'settings.json');
		const otherHook = { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] };
		fs.writeFileSync(
			settingsPath,
			JSON.stringify({ model: 'opus', hooks: { PostToolUse: [otherHook] } }),
		);
		const handlerDir = compiledHandlerDir();

		installSkillSyncHooks(configDir, handlerDir);
		const { hookPath } = installSkillSyncHooks(configDir, handlerDir);

		const command = `node ${JSON.stringify(hookPath)}`;
		expect(JSON.parse(fs.readFileSync(settingsPath, 'utf8'))).toEqual({
			model: 'opus',
			hooks: {
				SessionStart: [{ matcher: 'startup|clear', hooks: [{ type: 'command', command }] }],
				PostToolUse: [
					otherHook,
					{
						matcher: 'mcp__.*__(search_n8n_skills|get_skill)',
						hooks: [{ type: 'command', command }],
					},
				],
			},
		});
		expect(fs.existsSync(hookPath)).toBe(true);
		expect(fs.existsSync(path.join(configDir, 'skills'))).toBe(true);
	});
});
