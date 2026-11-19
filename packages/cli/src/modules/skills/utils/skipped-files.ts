import { posix } from 'node:path';

/** Extensions of scripts and code. A skill that runs a left-out script can stop working. */
const SCRIPT_EXTENSIONS = [
	'sh',
	'bash',
	'zsh',
	'fish',
	'ps1',
	'bat',
	'cmd',
	'py',
	'rb',
	'pl',
	'php',
	'lua',
	'r',
	'js',
	'mjs',
	'cjs',
	'ts',
	'mts',
	'cts',
	'jsx',
	'tsx',
	'go',
	'rs',
	'java',
	'kt',
	'swift',
	'c',
	'cc',
	'cpp',
	'h',
	'hpp',
	'cs',
] as const;

const SCRIPT_FILE = new RegExp(`\\.(?:${SCRIPT_EXTENSIONS.join('|')})$`, 'i');

export function isScriptFile(path: string): boolean {
	return SCRIPT_FILE.test(path);
}

/**
 * The extensions that telemetry reports by name: scripts, and common file types that a skill
 * folder can hold. Any other suffix can hold part of a file name, so it goes to `other`.
 */
const KNOWN_EXTENSIONS: ReadonlySet<string> = new Set(
	[
		...SCRIPT_EXTENSIONS,
		// Other code
		'vue',
		'svelte',
		'scala',
		'dart',
		'groovy',
		'sql',
		'ipynb',
		'wasm',
		// Text and documents
		'md',
		'mdx',
		'markdown',
		'txt',
		'rst',
		'html',
		'htm',
		'css',
		'scss',
		'pdf',
		'doc',
		'docx',
		'xls',
		'xlsx',
		'ppt',
		'pptx',
		'odt',
		'rtf',
		// Data and configuration
		'json',
		'jsonl',
		'yaml',
		'yml',
		'toml',
		'xml',
		'csv',
		'tsv',
		'ini',
		'cfg',
		'conf',
		'env',
		'lock',
		'log',
		'tf',
		'proto',
		'graphql',
		// Images and media
		'png',
		'jpg',
		'jpeg',
		'gif',
		'webp',
		'svg',
		'ico',
		'bmp',
		'mp3',
		'mp4',
		'wav',
		'ttf',
		'otf',
		'woff',
		'woff2',
		// Archives and binaries
		'zip',
		'tar',
		'gz',
		'tgz',
		'bz2',
		'xz',
		'7z',
		'jar',
		'exe',
		'dll',
		'so',
		'dylib',
		'bin',
		'db',
		'sqlite',
	].map((extension) => `.${extension}`),
);

/** The bucket for a file with no extension, such as `LICENSE` or `.env`. */
export const NO_EXTENSION = 'none';

/** The bucket for an extension outside the known list, and for the extensions over the cap. */
export const OTHER_EXTENSION = 'other';

/** The most extensions that telemetry reports by name. The rest go to `other`. */
export const MAX_REPORTED_EXTENSIONS = 20;

/**
 * Counts the skipped files by extension, for telemetry. Gives only known extensions and counts,
 * never a name or a path. The extensions are lowercase, and the map stays bounded.
 */
export function countSkippedFiles(paths: string[]): {
	extensions: Record<string, number>;
	scripts: number;
} {
	const counts = new Map<string, number>();
	for (const path of paths) {
		const key = extensionKey(path);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	// The most common extensions keep their name. Ties sort by name, so the result is stable.
	const ranked = [...counts].sort(
		([leftKey, leftCount], [rightKey, rightCount]) =>
			rightCount - leftCount || leftKey.localeCompare(rightKey),
	);
	const extensions: Record<string, number> = {};
	let other = 0;
	for (const [key, count] of ranked) {
		const named =
			key !== OTHER_EXTENSION && Object.keys(extensions).length < MAX_REPORTED_EXTENSIONS;
		if (named) extensions[key] = count;
		else other += count;
	}
	if (other > 0) extensions[OTHER_EXTENSION] = other;
	return { extensions, scripts: paths.filter(isScriptFile).length };
}

function extensionKey(path: string): string {
	const extension = posix.extname(path).toLowerCase();
	// `extname` gives `.` for a name that ends in a dot.
	if (extension === '' || extension === '.') return NO_EXTENSION;
	return KNOWN_EXTENSIONS.has(extension) ? extension : OTHER_EXTENSION;
}
