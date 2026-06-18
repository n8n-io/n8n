import { jsonParse } from 'n8n-workflow';
import { join as posixJoin } from 'node:path/posix';
import { z } from 'zod';

export const KNOWLEDGE_BASE_TEMPLATES_DIR = 'templates';

export interface KnowledgeBaseTemplateEntry {
	id: string;
	description: string;
	file: string;
	version?: string;
	techniques?: string[];
}

export interface KnowledgeBaseTemplatesIndex {
	entries: KnowledgeBaseTemplateEntry[];
}

const templateEntrySchema = z.object({
	id: z.string().min(1),
	description: z.string(),
	file: z.string().optional(),
	version: z.string().optional(),
	techniques: z.array(z.string()).optional(),
});

const templatesIndexSchema = z.object({
	entries: z.array(templateEntrySchema),
});

const PIPE_DELIMITED_INDEX_LINE = /^([a-zA-Z0-9][a-zA-Z0-9._-]*\.ts)\s*\|\s*(.+)$/;

function templateFilenameFromId(id: string): string {
	return `${id}.ts`;
}

function templateFilePath(filename: string): string {
	return posixJoin(KNOWLEDGE_BASE_TEMPLATES_DIR, filename);
}

function normalizeTemplateEntry(
	entry: z.infer<typeof templateEntrySchema>,
	availableFilenames: Set<string>,
): KnowledgeBaseTemplateEntry | null {
	const filename = entry.file
		? entry.file.replace(/^templates\//, '').replace(/^\//, '')
		: templateFilenameFromId(entry.id);

	if (!filename.endsWith('.ts') || !availableFilenames.has(filename)) {
		return null;
	}

	const normalized: KnowledgeBaseTemplateEntry = {
		id: entry.id,
		description: entry.description,
		file: templateFilePath(filename),
	};
	if (entry.version !== undefined) normalized.version = entry.version;
	if (entry.techniques !== undefined) normalized.techniques = entry.techniques;
	return normalized;
}

/** Parse the pipe-delimited catalog shipped by current CDN archives (`index.txt`). */
function parsePipeDelimitedTemplatesCatalog(content: string): KnowledgeBaseTemplateEntry[] {
	const entries: KnowledgeBaseTemplateEntry[] = [];

	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		const match = PIPE_DELIMITED_INDEX_LINE.exec(trimmed);
		if (!match) continue;

		const filename = match[1];
		entries.push({
			id: filename.replace(/\.ts$/, ''),
			description: match[2].trim(),
			file: templateFilePath(filename),
		});
	}

	return entries;
}

function parseTemplatesIndexJson(content: string): z.infer<typeof templatesIndexSchema> | null {
	try {
		const parsed: unknown = jsonParse(content);
		const result = templatesIndexSchema.safeParse(parsed);
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}

function listTemplateFilenames(extracted: Map<string, string>): Set<string> {
	const filenames = new Set<string>();
	for (const name of extracted.keys()) {
		if (name.endsWith('.ts')) filenames.add(name);
	}
	return filenames;
}

function buildEntriesFromTemplateFiles(
	availableFilenames: Set<string>,
): KnowledgeBaseTemplateEntry[] {
	return [...availableFilenames].sort().map((filename) => ({
		id: filename.replace(/\.ts$/, ''),
		description: filename.replace(/\.ts$/, ''),
		file: templateFilePath(filename),
	}));
}

/**
 * Build a normalized templates index from an extracted n8n-sdk-templates archive.
 * Uses `index.json` when present, converts CDN `index.txt` when needed, otherwise
 * derives entries from `.ts` files. Only `index.json` is written to the workspace.
 */
export function buildTemplatesIndexFromArchive(
	extracted: Map<string, string>,
): KnowledgeBaseTemplatesIndex {
	const availableFilenames = listTemplateFilenames(extracted);

	const indexJson = extracted.get('index.json');
	if (indexJson) {
		const parsed = parseTemplatesIndexJson(indexJson);
		if (parsed) {
			const entries = parsed.entries
				.map((entry) => normalizeTemplateEntry(entry, availableFilenames))
				.filter((entry): entry is KnowledgeBaseTemplateEntry => entry !== null);
			if (entries.length > 0) {
				return { entries };
			}
		}
	}

	const indexTxt = extracted.get('index.txt');
	if (indexTxt) {
		const entries = parsePipeDelimitedTemplatesCatalog(indexTxt).filter((entry) => {
			const filename = entry.file.replace(`${KNOWLEDGE_BASE_TEMPLATES_DIR}/`, '');
			return availableFilenames.has(filename);
		});
		if (entries.length > 0) {
			return { entries };
		}
	}

	return { entries: buildEntriesFromTemplateFiles(availableFilenames) };
}
