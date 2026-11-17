import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const SKILL_SYNC_DIR_NAME = 'n8n-skill-sync';

export const SESSION_START_CONTEXT =
	'n8n skill sync: if an n8n MCP server is connected, call its search_n8n_skills tool once now with `limit: 100` and no other arguments. A local hook compares the result with the local copies of the n8n skills. If the hook then names skill ids, call get_skill once for each id. The hook installs each skill as a local skill.';

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const SKILL_FOLDER_NAME_MAX_LENGTH = 64;
const SAVED_OUTPUT_PATH = /Output has been saved to (\S+?\.(?:txt|json))(?:\.|\s|$)/;
const SEARCH_FILTERS = ['query', 'scope', 'projectId', 'attachableToAgentId'];

type JsonObject = Record<string, unknown>;

type SyncedSkill = {
	id: string;
	dir: string;
	latestVersion: unknown;
	updatedAt: unknown;
};

type SkillFile = { path: string; content: string };

type HookOutput = {
	hookSpecificOutput: { hookEventName: string; additionalContext: string };
};

function isObject(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(text: string): JsonObject | undefined {
	try {
		const parsed: unknown = JSON.parse(text);
		return isObject(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

function readJson(filePath: string): unknown {
	try {
		return JSON.parse(fs.readFileSync(filePath, 'utf8'));
	} catch {
		return undefined;
	}
}

function writeJson(filePath: string, value: unknown) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, JSON.stringify(value, null, '\t'));
}

function isInside(parent: string, child: string) {
	const relative = path.relative(parent, child);
	return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function readSavedOutput(text: string, configDir: string): JsonObject | undefined {
	const savedPath = SAVED_OUTPUT_PATH.exec(text)?.[1];
	if (!savedPath) return undefined;
	const resolved = path.resolve(savedPath);
	const isToolResult = path.basename(path.dirname(resolved)) === 'tool-results';
	if (!isToolResult || !isInside(path.join(configDir, 'projects'), resolved)) return undefined;
	try {
		return parseJsonObject(fs.readFileSync(resolved, 'utf8'));
	} catch {
		return undefined;
	}
}

function toolResponseData(response: unknown, configDir: string): JsonObject | undefined {
	if (isObject(response)) return response;
	if (Array.isArray(response)) {
		const text = response
			.map((block) => (isObject(block) && typeof block.text === 'string' ? block.text : ''))
			.join('');
		return toolResponseData(text, configDir);
	}
	if (typeof response !== 'string') return undefined;
	return parseJsonObject(response) ?? readSavedOutput(response, configDir);
}

function toSlug(text: string) {
	return text
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function folderName(base: string) {
	return base.slice(0, SKILL_FOLDER_NAME_MAX_LENGTH).replace(/-$/, '');
}

function referenceList(references: SkillFile[]) {
	if (references.length === 0) return '';
	const links = references.map(
		(reference) =>
			`- [${reference.path}](${reference.path.split('/').map(encodeURIComponent).join('/')})`,
	);
	return `\n\n## References\n\n${links.join('\n')}`;
}

function isSafeReferencePath(referencePath: string) {
	if (referencePath === '' || referencePath.includes('\\') || referencePath.includes('\0')) {
		return false;
	}
	if (path.posix.isAbsolute(referencePath) || /^[A-Za-z]:/.test(referencePath)) return false;
	const segments = referencePath.split('/');
	if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
		return false;
	}
	return referencePath.toLowerCase() !== 'skill.md';
}

function skillReferences(value: unknown): SkillFile[] | undefined {
	if (value === undefined) return [];
	if (!Array.isArray(value)) return undefined;
	const references: SkillFile[] = [];
	for (const reference of value) {
		if (!isObject(reference)) return undefined;
		const { path: referencePath, content } = reference;
		if (typeof referencePath !== 'string' || typeof content !== 'string') return undefined;
		if (!isSafeReferencePath(referencePath)) return undefined;
		references.push({ path: referencePath, content });
	}
	return references;
}

class SkillSyncStore {
	readonly skillsDir: string;

	private readonly stateDir: string;

	constructor(configDir: string) {
		this.skillsDir = path.join(configDir, 'skills');
		this.stateDir = path.join(configDir, SKILL_SYNC_DIR_NAME);
	}

	private serverDir(server: string) {
		const serverKey = createHash('sha256').update(server).digest('hex').slice(0, 32);
		return path.join(this.stateDir, 'servers', serverKey);
	}

	private entryPath(server: string, skillId: string) {
		return path.join(this.serverDir(server), 'skills', `${skillId}.json`);
	}

	entries(server: string): SyncedSkill[] {
		return this.entriesIn(path.join(this.serverDir(server), 'skills'));
	}

	private entriesIn(dir: string): SyncedSkill[] {
		if (!fs.existsSync(dir)) return [];
		return fs
			.readdirSync(dir)
			.map((file) => readJson(path.join(dir, file)))
			.filter(
				(entry): entry is SyncedSkill =>
					isObject(entry) && typeof entry.id === 'string' && typeof entry.dir === 'string',
			);
	}

	allOwnedFolders(): Set<string> {
		const serversDir = path.join(this.stateDir, 'servers');
		if (!fs.existsSync(serversDir)) return new Set();
		const entryDirs = fs
			.readdirSync(serversDir)
			.map((serverKey) => path.join(serversDir, serverKey, 'skills'));
		return new Set(entryDirs.flatMap((dir) => this.entriesIn(dir).map((entry) => entry.dir)));
	}

	pending(server: string): string[] {
		const pending = readJson(path.join(this.serverDir(server), 'pending.json'));
		return Array.isArray(pending) ? pending.filter((id) => typeof id === 'string') : [];
	}

	setPending(server: string, skillIds: string[]) {
		writeJson(path.join(this.serverDir(server), 'pending.json'), skillIds);
	}

	saveEntry(server: string, entry: SyncedSkill) {
		writeJson(this.entryPath(server, entry.id), entry);
	}

	removeEntry(server: string, entry: SyncedSkill) {
		this.removeSkillFolder(entry.dir);
		fs.rmSync(this.entryPath(server, entry.id), { force: true });
	}

	removeSkillFolder(dir: string) {
		const target = path.join(this.skillsDir, dir);
		if (path.dirname(target) !== this.skillsDir || !isInside(this.skillsDir, target)) return;
		fs.rmSync(target, { recursive: true, force: true });
	}

	writeSkillFolder(dir: string, files: SkillFile[]) {
		const tempDir = fs.mkdtempSync(path.join(this.stateDir, 'tmp-'));
		try {
			for (const file of files) {
				const target = path.join(tempDir, file.path);
				if (!isInside(tempDir, target)) throw new Error(`Unsafe path: ${file.path}`);
				fs.mkdirSync(path.dirname(target), { recursive: true });
				fs.writeFileSync(target, file.content);
			}
			fs.mkdirSync(this.skillsDir, { recursive: true });
			this.removeSkillFolder(dir);
			fs.renameSync(tempDir, path.join(this.skillsDir, dir));
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	}

	ensureStateDir() {
		fs.mkdirSync(this.stateDir, { recursive: true });
	}
}

function contextFor(additionalContext: string): HookOutput {
	return { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext } };
}

function isCompleteUnfilteredSearch(toolInput: JsonObject, data: JsonObject) {
	if (SEARCH_FILTERS.some((filter) => toolInput[filter] !== undefined)) return false;
	if (toolInput.skip !== undefined && toolInput.skip !== 0) return false;
	return Array.isArray(data.skills) && data.skills.length === data.count;
}

function syncFromSearch(
	store: SkillSyncStore,
	server: string,
	toolInput: JsonObject,
	data: JsonObject,
): HookOutput | undefined {
	if (!isCompleteUnfilteredSearch(toolInput, data) || !Array.isArray(data.skills)) return undefined;

	const remoteSkills = data.skills.filter(
		(skill): skill is JsonObject =>
			isObject(skill) &&
			typeof skill.id === 'string' &&
			SAFE_ID.test(skill.id) &&
			skill.availableToMCP !== false,
	);
	const remoteIds = new Set(remoteSkills.map((skill) => skill.id));
	const local = new Map(store.entries(server).map((entry) => [entry.id, entry]));

	const removed = [...local.values()].filter((entry) => !remoteIds.has(entry.id));
	for (const entry of removed) store.removeEntry(server, entry);

	const needed = remoteSkills
		.filter((skill) => {
			const entry = local.get(String(skill.id));
			return (
				!entry || entry.latestVersion !== skill.latestVersion || entry.updatedAt !== skill.updatedAt
			);
		})
		.map((skill) => String(skill.id));
	store.setPending(server, needed);

	const notes: string[] = [];
	if (needed.length > 0) {
		notes.push(
			`n8n skill sync: call get_skill once for each of these skill ids to install or update them as local skills: ${needed.join(', ')}.`,
		);
	}
	if (removed.length > 0) {
		notes.push(
			`n8n skill sync: removed local skills that are gone from n8n: ${removed.map((entry) => entry.dir).join(', ')}.`,
		);
	}
	return notes.length > 0 ? contextFor(notes.join('\n')) : undefined;
}

function chooseFolder(
	store: SkillSyncStore,
	skillId: string,
	name: string,
	previous: SyncedSkill | undefined,
) {
	const owned = store.allOwnedFolders();
	const base = `n8n-${toSlug(name) || toSlug(skillId)}`;
	const candidates = [folderName(base), folderName(`${base.slice(0, 50)}-${toSlug(skillId)}`)];
	return candidates.find((candidate) => {
		if (candidate === previous?.dir) return true;
		return !owned.has(candidate) && !fs.existsSync(path.join(store.skillsDir, candidate));
	});
}

function installFromGetSkill(
	store: SkillSyncStore,
	server: string,
	toolInput: JsonObject,
	data: JsonObject,
): HookOutput | undefined {
	const skillId = toolInput.skillId;
	if (typeof skillId !== 'string' || !SAFE_ID.test(skillId) || data.id !== skillId)
		return undefined;
	if (!store.pending(server).includes(skillId) || data.availableToMCP === false) return undefined;

	const skill = data.skill;
	if (!isObject(skill)) return undefined;
	const { name, description, instructions } = skill;
	if (typeof name !== 'string' || typeof description !== 'string') return undefined;
	if (typeof instructions !== 'string') return undefined;
	const references = skillReferences(skill.references);
	if (!references) return undefined;

	const previous = store.entries(server).find((entry) => entry.id === skillId);
	const dir = chooseFolder(store, skillId, name, previous);
	if (!dir) return undefined;

	const skillMd = `---\nname: ${dir}\ndescription: ${JSON.stringify(description)}\n---\n\n${instructions}${referenceList(references)}\n`;
	store.ensureStateDir();
	store.writeSkillFolder(dir, [{ path: 'SKILL.md', content: skillMd }, ...references]);
	if (previous && previous.dir !== dir) store.removeSkillFolder(previous.dir);
	store.saveEntry(server, {
		id: skillId,
		dir,
		latestVersion: data.latestVersion,
		updatedAt: data.updatedAt,
	});
	return contextFor(
		`n8n skill sync: installed this skill as the local skill ${dir}. Claude Code loads it within a few seconds.`,
	);
}

export function handleHookInput(input: unknown, configDir: string): HookOutput | undefined {
	if (!isObject(input)) return undefined;
	const store = new SkillSyncStore(configDir);

	if (input.hook_event_name === 'SessionStart') {
		fs.mkdirSync(store.skillsDir, { recursive: true });
		return {
			hookSpecificOutput: {
				hookEventName: 'SessionStart',
				additionalContext: SESSION_START_CONTEXT,
			},
		};
	}

	if (input.hook_event_name !== 'PostToolUse') return undefined;
	const toolName = input.tool_name;
	const server = isObject(input.mcp_server) ? input.mcp_server.name : undefined;
	if (typeof toolName !== 'string' || !toolName.startsWith('mcp__')) return undefined;
	if (typeof server !== 'string' || server === '') return undefined;
	const toolInput = isObject(input.tool_input) ? input.tool_input : {};

	if (toolName.endsWith('__search_n8n_skills')) {
		const data = toolResponseData(input.tool_response, configDir);
		return data ? syncFromSearch(store, server, toolInput, data) : undefined;
	}
	if (toolName.endsWith('__get_skill')) {
		const data = toolResponseData(input.tool_response, configDir);
		return data ? installFromGetSkill(store, server, toolInput, data) : undefined;
	}
	return undefined;
}
