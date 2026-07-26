export interface StrReplaceHunk {
	oldString: string;
	newString: string;
}

export interface StrReplaceDiffView {
	path?: string;
	hunks: StrReplaceHunk[];
}

export interface WriteFileView {
	path?: string;
	content: string;
}

export type DiffLineType = 'equal' | 'add' | 'del';

export interface DiffLine {
	type: DiffLineType;
	text: string;
	/** 1-based line number in the new text (omitted for deletions). */
	newLineNumber?: number;
	/** 1-based line number in the old text (omitted for additions). */
	oldLineNumber?: number;
}

const STR_REPLACE_TOOLS = new Set([
	'workspace_str_replace_file',
	'workspace_edit_file',
	'workspace_batch_str_replace_file',
	'edit_file',
]);

const WRITE_FILE_TOOLS = new Set(['workspace_write_file', 'workspace_append_file', 'write_file']);

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
	ts: 'typescript',
	tsx: 'typescript',
	js: 'javascript',
	jsx: 'javascript',
	mjs: 'javascript',
	cjs: 'javascript',
	json: 'json',
	md: 'markdown',
	py: 'python',
	yml: 'yaml',
	yaml: 'yaml',
	html: 'html',
	vue: 'html',
	css: 'css',
	scss: 'scss',
	sh: 'bash',
	bash: 'bash',
};

function asString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function hunkFromPair(oldString: unknown, newString: unknown): StrReplaceHunk | undefined {
	if (typeof oldString !== 'string' || typeof newString !== 'string') return undefined;
	return { oldString, newString };
}

/**
 * Returns a diff view model when the tool args describe one or more string
 * replacements. Returns undefined for other tools or incomplete streaming args.
 */
export function extractStrReplaceDiff(
	toolName: string,
	args: Record<string, unknown> | undefined,
): StrReplaceDiffView | undefined {
	if (!args || !STR_REPLACE_TOOLS.has(toolName)) return undefined;

	const path = asString(args.path) ?? asString(args.filePath);

	if (toolName === 'workspace_batch_str_replace_file') {
		if (!Array.isArray(args.replacements)) return undefined;
		const hunks = args.replacements
			.map((replacement) => {
				if (!replacement || typeof replacement !== 'object') return undefined;
				const item = replacement as Record<string, unknown>;
				return hunkFromPair(item.old_str, item.new_str);
			})
			.filter((hunk): hunk is StrReplaceHunk => hunk !== undefined);
		if (hunks.length === 0) return undefined;
		return { path, hunks };
	}

	const hunk =
		hunkFromPair(args.old_str, args.new_str) ?? hunkFromPair(args.oldString, args.newString);
	if (!hunk) return undefined;
	return { path, hunks: [hunk] };
}

/**
 * Returns a file-write view when the tool args include path + content.
 * Returns undefined for other tools or incomplete streaming args.
 */
export function extractWriteFileView(
	toolName: string,
	args: Record<string, unknown> | undefined,
): WriteFileView | undefined {
	if (!args || !WRITE_FILE_TOOLS.has(toolName)) return undefined;

	const content = asString(args.content);
	if (content === undefined) return undefined;

	return {
		path: asString(args.path) ?? asString(args.filePath),
		content,
	};
}

/** Treat a full-file write as a GitHub-style new-file addition hunk. */
export function writeFileToDiffView(file: WriteFileView): StrReplaceDiffView {
	return {
		path: file.path,
		hunks: [{ oldString: '', newString: file.content }],
	};
}

export function languageFromPath(path: string | undefined): string {
	if (!path) return 'plaintext';
	const basename = path.split('/').pop() ?? path;
	const extension = basename.includes('.') ? (basename.split('.').pop()?.toLowerCase() ?? '') : '';
	return LANGUAGE_BY_EXTENSION[extension] ?? 'plaintext';
}

/**
 * Line-oriented LCS diff for small str_replace hunks. Avoids third-party Vue
 * diff components that have been unstable inside the Instance AI timeline.
 */
export function diffLines(oldString: string, newString: string): DiffLine[] {
	// Full-file writes pass an empty oldString — show every line as an addition.
	if (oldString === '') {
		return newString.split('\n').map((text, index) => ({
			type: 'add' as const,
			text,
			newLineNumber: index + 1,
		}));
	}

	const oldLines = oldString.split('\n');
	const newLines = newString.split('\n');
	const oldLen = oldLines.length;
	const newLen = newLines.length;

	const lcs: number[][] = Array.from({ length: oldLen + 1 }, () => Array(newLen + 1).fill(0));
	for (let i = oldLen - 1; i >= 0; i--) {
		for (let j = newLen - 1; j >= 0; j--) {
			lcs[i][j] =
				oldLines[i] === newLines[j]
					? lcs[i + 1][j + 1] + 1
					: Math.max(lcs[i + 1][j], lcs[i][j + 1]);
		}
	}

	const lines: DiffLine[] = [];
	let i = 0;
	let j = 0;
	let oldLineNumber = 1;
	let newLineNumber = 1;

	while (i < oldLen && j < newLen) {
		if (oldLines[i] === newLines[j]) {
			lines.push({
				type: 'equal',
				text: oldLines[i],
				oldLineNumber,
				newLineNumber,
			});
			i++;
			j++;
			oldLineNumber++;
			newLineNumber++;
			continue;
		}
		if (lcs[i + 1][j] >= lcs[i][j + 1]) {
			lines.push({ type: 'del', text: oldLines[i], oldLineNumber });
			i++;
			oldLineNumber++;
		} else {
			lines.push({ type: 'add', text: newLines[j], newLineNumber });
			j++;
			newLineNumber++;
		}
	}

	while (i < oldLen) {
		lines.push({ type: 'del', text: oldLines[i], oldLineNumber });
		i++;
		oldLineNumber++;
	}
	while (j < newLen) {
		lines.push({ type: 'add', text: newLines[j], newLineNumber });
		j++;
		newLineNumber++;
	}

	return lines;
}
