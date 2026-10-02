#!/usr/bin/env node
/**
 * Prepare the input for lychee: a copy of each file in packages/ with only the
 * links that a person follows.
 *
 * Usage, from the repository root:
 *   node .github/scripts/link-check/extract.mjs <out-dir>
 *
 * Lychee cannot do this itself. Its exclude rules see only the URL or the file
 * path, so they cannot tell an API base URL in a string from a help link.
 *
 * - `git grep` lists the tracked files with a URL, a credential docs slug, or
 *   DOCS_DOMAIN.
 * - Each copy keeps HTML and markdown links, doc link properties, comments,
 *   URLs in text that is not an example, and all lines of codex, locale, and
 *   markdown files. Other lines are blank, so the report shows the real file:line.
 * - URLs that the code builds at runtime (credential slugs, DOCS_DOMAIN) are
 *   expanded, and string escapes that lychee reads as part of a URL are removed.
 *
 * Prints the paths of the copies. Run lychee in <out-dir>, so that its report
 * shows repository paths.
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

const FILE_PATTERNS = ['http://', 'https://', "documentationUrl = '", 'DOCS_DOMAIN'];
const FILE_GLOBS = ['ts', 'vue', 'json', 'mjs', 'js', 'md'].map((ext) => `packages/**/*.${ext}`);

const KEY =
	/(?:doc|docs|documentation|help|learn|guide|info|more|reference|support|pricing|terms|privacy|legal|page|article|blog|video|tutorial)\w*(?:url|uri|link|href)["']?\s*[:=]/i;
const KEY_AT_END = new RegExp(String.raw`${KEY.source}\s*$`, 'i');
const LINK = new RegExp(
	[
		String.raw`href=`,
		String.raw`\bto=["']`,
		String.raw`\]\(https?://`,
		String.raw`docs\.n8n\.io`,
		String.raw`DOCS_DOMAIN`,
		KEY.source,
		String.raw`^\s*(?://|\*|/\*)`,
		String.raw`\s//.*https?://`,
		String.raw`<!--.*https?://`,
	].join('|'),
	'i',
);
// A URL after a word, such as "refer to https://...", unless the text is an example.
const IN_TEXT = /[^\s"'`=(]\s+https?:\/\//;
const EXAMPLE = /placeholder|e\.g\.|for example|if the url is|\bhint\s*:/i;
const CREDENTIAL_SLUG = /documentationUrl = '([\w/-]+)'/g;

function normalize(raw, credential) {
	const line = raw.includes('\\') ? raw.replaceAll('\\"', '"').replaceAll('\\n', ' ') : raw;
	if (credential) {
		return line.replace(
			CREDENTIAL_SLUG,
			"documentationUrl = 'https://docs.n8n.io/integrations/builtin/credentials/$1/'",
		);
	}
	return line.includes('${DOCS_DOMAIN}') ? line.replaceAll('${DOCS_DOMAIN}', 'docs.n8n.io') : line;
}

// Only a doc link property with its value on the next line ends with ":" or "=".
const endsWithKey = (line) => /[:=]\s*$/.test(line) && KEY_AT_END.test(line);

/** Returns the text of `path` with every line blanked that has no link to check. */
export function filterText(path, text) {
	const keepAll = /(\.node\.json|\/locales\/[^/]+\.json|\.md)$/.test(path);
	const credential = path.endsWith('.credentials.ts');
	const lines = text.split('\n').map((raw) => normalize(raw, credential));
	return lines
		.map((line, i) => {
			// Most lines have no URL, and lychee finds nothing to check on them.
			if (!line.includes('http')) return '';
			// The formatter can put the value of a doc link property on the next line.
			const afterKey = i > 0 && endsWithKey(lines[i - 1]);
			const keep =
				keepAll || afterKey || LINK.test(line) || (IN_TEXT.test(line) && !EXAMPLE.test(line));
			return keep ? line : '';
		})
		.join('\n');
}

/** Yields the files that git grep finds, while it is still searching. */
async function* listFiles() {
	const patterns = FILE_PATTERNS.flatMap((pattern) => ['-e', pattern]);
	const git = spawn('git', ['grep', '-l', '-F', ...patterns, '--', ...FILE_GLOBS], {
		stdio: ['ignore', 'pipe', 'inherit'],
	});
	const exit = new Promise((resolve) => git.on('close', resolve));
	for await (const file of createInterface({ input: git.stdout })) yield file;
	// git grep exits 1 when no file matches.
	const code = await exit;
	if (code !== 0 && code !== 1) throw new Error(`git grep exited with ${code}`);
}

async function extract(file, outDir) {
	const text = filterText(file, await readFile(file, 'utf8'));
	// A file without URLs gives lychee nothing to check.
	if (!text.includes('http')) return null;
	const target = join(outDir, file);
	await mkdir(dirname(target), { recursive: true });
	await writeFile(target, text);
	return file;
}

async function main() {
	const [outDir] = process.argv.slice(2);
	if (!outDir) throw new Error('Usage: extract.mjs <out-dir>');

	const pending = [];
	for await (const file of listFiles()) pending.push(extract(file, outDir));
	const written = await Promise.all(pending);
	process.stdout.write(
		written
			.filter(Boolean)
			.map((file) => `${file}\n`)
			.join(''),
	);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}
