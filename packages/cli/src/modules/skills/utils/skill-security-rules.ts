import { agentSkillSchema, type SkillScanFinding, type SkillScanLocation } from '@n8n/api-types';
import { kebabCase } from 'change-case';
import { isDeepStrictEqual } from 'node:util';
import type { ZodIssue } from 'zod';

import type { SkillContent } from './skill-content-hash';
import { SKILL_MD } from './skill-md';
import { codePointOf, HIDDEN_PATTERN, locate, skillMdText } from './skill-text';
import type { SkillSourceFidelityWarning } from '../sources/skill-source-client';

/**
 * The skills schema has no limit for the frontmatter, but `skill_version.frontmatter` stores
 * every key of a synced skill.
 */
const FRONTMATTER_MAX_LENGTH = 16_384;

/** What one rule reads: a fetched skill, and the latest version for an update. */
export type SkillScanInput = {
	content: SkillContent;
	skippedFiles: string[];
	/** The skipped files that n8n cannot store, such as a reference with a NUL character. */
	unstorableFiles?: string[];
	fidelity: SkillSourceFidelityWarning[];
	/** The content of the latest version. Null at import. */
	previous: SkillContent | null;
};

/** The skill must fit the shape that `createTrusted` and `saveTrusted` store. */
export function checkShape({ content }: SkillScanInput): SkillScanFinding[] {
	const parsed = agentSkillSchema.safeParse({
		// The service trims these, so a value of only spaces is empty.
		name: content.name.trim(),
		description: content.description.trim(),
		instructions: content.instructions.trim(),
		...(content.files.length ? { references: content.files } : {}),
	});
	const findings: SkillScanFinding[] = parsed.success
		? []
		: parsed.error.issues.map((issue) => ({
				rule: isSizeIssue(issue) ? 'over_limit' : 'invalid_skill',
				severity: 'blocked',
				file: fileOfIssue(content, issue.path),
				detail: issue.message,
			}));
	if (content.frontmatter && JSON.stringify(content.frontmatter).length > FRONTMATTER_MAX_LENGTH) {
		findings.push({
			rule: 'over_limit',
			severity: 'blocked',
			file: SKILL_MD,
			detail: `The frontmatter must be ${FRONTMATTER_MAX_LENGTH} characters or fewer as JSON.`,
		});
	}
	return findings;
}

/** Extensions of scripts and code. A skill that runs a left-out script can stop working. */
const CODE_FILE =
	/\.(?:sh|bash|zsh|fish|ps1|bat|cmd|py|rb|pl|php|lua|r|js|mjs|cjs|ts|mts|cts|jsx|tsx|go|rs|java|kt|swift|c|cc|cpp|h|hpp|cs)$/i;

/**
 * A skill keeps only SKILL.md and `references/*.md`. The SKILL.md reader leaves out every other
 * file, scripts and binaries included, so n8n never stores or runs them. The user sees the list,
 * and a left-out script or code file needs review.
 */
export function listSkippedFiles({
	skippedFiles,
	unstorableFiles = [],
}: SkillScanInput): SkillScanFinding[] {
	return skippedFiles.map((file) =>
		unstorableFiles.includes(file)
			? {
					rule: 'file_unstorable',
					severity: 'info',
					file,
					detail: 'n8n leaves this file out. It has a NUL character, which n8n cannot store.',
				}
			: CODE_FILE.test(file)
				? {
						rule: 'file_skipped',
						severity: 'needs_review',
						file,
						detail:
							'n8n leaves this script out. A skill that runs it can stop working. A skill keeps only SKILL.md and references/*.md.',
					}
				: {
						rule: 'file_skipped',
						severity: 'info',
						file,
						detail: 'n8n leaves this file out. A skill keeps only SKILL.md and references/*.md.',
					},
	);
}

export function findHiddenUnicode(input: SkillScanInput): SkillScanFinding[] {
	return textsByFile(input.content).flatMap(({ file, texts }) => {
		const found = texts.flatMap(({ text }) => text.match(HIDDEN_PATTERN) ?? []);
		if (found.length === 0) return [];
		const first = texts.find(({ text }) => text.search(HIDDEN_PATTERN) >= 0);
		const index = first?.text.search(HIDDEN_PATTERN) ?? 0;
		return [
			{
				rule: 'hidden_unicode',
				severity: 'needs_review',
				file,
				detail: `${found.length} invisible or control characters. The first is ${codePointOf(found[0])}.`,
				...(first ? { location: first.locate(index, index + found[0].length) } : {}),
			},
		];
	});
}

/**
 * A link up to the first character that cannot be part of it. An IPv6 host sits in brackets,
 * which the rest of a link cannot hold, so it has its own group after the optional user info.
 */
const URL_PATTERN =
	/\b(?:https?|wss?|ftp):\/\/(?:[^\s<>"'`()[\]{}/?#@]*@)?(?:\[[\d:a-f.]+\])?[^\s<>"'`()[\]{}]*/gi;

/**
 * A new domain can be a place where a model sends data, so an update with a domain that the
 * previous version did not have needs review. A new link on a known domain does not. At
 * import there is no previous version, so each domain is only listed.
 */
export function findNewUrls({ content, previous }: SkillScanInput): SkillScanFinding[] {
	const known = previous ? new Set(domainsByFile(previous).keys()) : new Set<string>();
	return [...domainsByFile(content)]
		.filter(([domain]) => !known.has(domain))
		.map(([domain, { file, location }]) =>
			previous
				? {
						rule: 'new_url',
						severity: 'needs_review',
						file,
						domain,
						detail: `The update links to ${domain}, a domain that the current version does not use.`,
						location,
					}
				: {
						rule: 'new_url',
						severity: 'info',
						file,
						domain,
						detail: `The skill links to ${domain}.`,
						location,
					},
		);
}

/** Each domain that the skill links to, with the first file and place that has it. */
function domainsByFile(
	content: SkillContent,
): Map<string, { file: string; location: SkillScanLocation }> {
	const domains = new Map<string, { file: string; location: SkillScanLocation }>();
	for (const { file, texts } of textsByFile(content)) {
		for (const entry of texts) {
			for (const match of entry.text.matchAll(URL_PATTERN)) {
				const domain = domainOf(match[0]);
				if (!domain || domains.has(domain)) continue;
				const index = match.index;
				domains.set(domain, { file, location: entry.locate(index, index + match[0].length) });
			}
		}
	}
	return domains;
}

function domainOf(url: string): string | undefined {
	try {
		// A dot that ends a sentence can follow the host, as in "see https://example.com."
		return new URL(url).hostname.toLowerCase().replace(/\.+$/, '') || undefined;
	} catch {
		return undefined;
	}
}

/**
 * Frontmatter keys that change what a skill can do or how it runs, in the kebab-case
 * spelling. The n8n runtime ignores them today, but another tool that reads the skill, or a
 * later n8n version, may not.
 */
const PERMISSION_KEYS = new Set([
	'allowed-tools',
	'disallowed-tools',
	'tools',
	'permissions',
	'hooks',
	'mcp-servers',
	'context',
	'agent',
	'disable-model-invocation',
	'user-invocable',
]);

/**
 * An update that adds, removes or changes a permission-like key needs review. Each key is
 * compared in its own spelling, so a second spelling of a key cannot hide a change to the
 * first. At import there is no previous version, so each key is only listed.
 */
export function findPermissionChanges({ content, previous }: SkillScanInput): SkillScanFinding[] {
	const current = permissionKeys(content);
	if (!previous) {
		return [...current.keys()].map((key) => ({
			rule: 'permission_change',
			severity: 'info',
			file: SKILL_MD,
			detail: `The skill sets the frontmatter key ${key}.`,
			location: locateKey(content, key),
		}));
	}
	const before = permissionKeys(previous);
	return [...new Set([...before.keys(), ...current.keys()])].flatMap((key) => {
		if (
			before.has(key) &&
			current.has(key) &&
			isDeepStrictEqual(before.get(key), current.get(key))
		) {
			return [];
		}
		const detail = !before.has(key)
			? `The update adds the frontmatter key ${key}.`
			: !current.has(key)
				? `The update removes the frontmatter key ${key}.`
				: `The update changes the frontmatter key ${key}.`;
		// A removed key is not in the update, so the finding has no place in it.
		const location = current.has(key) ? { location: locateKey(content, key) } : {};
		return [
			{ rule: 'permission_change', severity: 'needs_review', file: SKILL_MD, detail, ...location },
		];
	});
}

/**
 * The permission-like keys of a skill and their values. A key counts in any spelling:
 * `allowedTools`, `allowed_tools` and `Allowed-Tools` all are `allowed-tools`.
 */
function permissionKeys(content: SkillContent): Map<string, unknown> {
	return new Map(
		Object.entries(content.frontmatter ?? {}).filter(([key]) =>
			PERMISSION_KEYS.has(kebabCase(key)),
		),
	);
}

/** The source could not convert every part of the skill, so the reviewer reads what is left. */
export function listFidelityWarnings({ fidelity }: SkillScanInput): SkillScanFinding[] {
	return fidelity.map(({ detail }) => ({
		rule: 'lossy_conversion',
		severity: 'needs_review',
		detail,
	}));
}

/** One text that the rules read, and how to place a range of it in the file that the review shows. */
type ScanText = { text: string; locate: (start: number, end: number) => SkillScanLocation };

/** Every text of a skill, by file. SKILL.md holds the name, description, frontmatter and instructions. */
function textsByFile(content: SkillContent): Array<{ file: string; texts: ScanText[] }> {
	const md = skillMdText(content);
	const inSkillMd = (text: string, offset: number): ScanText => ({
		text,
		locate: (start, end) => locate(md.text, offset + start, offset + end),
	});
	// A frontmatter value shows as JSON, which escapes some characters, so a finding in it
	// marks its top-level key.
	const frontmatter = Object.entries(content.frontmatter ?? {}).flatMap(([key, value]) =>
		[key, ...stringsIn(value)].map((text) => ({ text, locate: () => locateKey(content, key) })),
	);
	return [
		{
			file: SKILL_MD,
			texts: [
				inSkillMd(content.name, md.name),
				inSkillMd(content.description, md.description),
				...frontmatter,
				inSkillMd(content.instructions, md.instructions),
			],
		},
		...content.files.map((file) => ({
			file: file.path,
			texts: [
				{
					text: file.content,
					locate: (start: number, end: number) => locate(file.content, start, end),
				},
			],
		})),
	];
}

/** A top-level frontmatter key on its line of SKILL.md. */
function locateKey(content: SkillContent, key: string): SkillScanLocation {
	const md = skillMdText(content);
	const offset = md.keys.get(key) ?? 0;
	return locate(md.text, offset, offset + key.length);
}

/** The keys and string values of a frontmatter value, at every level. */
function stringsIn(value: unknown): string[] {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap(stringsIn);
	if (value !== null && typeof value === 'object') {
		return Object.entries(value).flatMap(([key, entry]) => [key, ...stringsIn(entry)]);
	}
	return [];
}

/**
 * The total size of the references is a custom issue on the list itself. The other custom
 * issue of the list, a duplicate path, is on one entry.
 */
function isSizeIssue(issue: ZodIssue): boolean {
	return (
		issue.code === 'too_big' ||
		(issue.code === 'custom' && issue.path.length === 1 && issue.path[0] === 'references')
	);
}

/** Issues under `references` name the file. Every other field is in SKILL.md. */
function fileOfIssue(content: SkillContent, path: Array<string | number>): string {
	const [field, index] = path;
	if (field === 'references' && typeof index === 'number') {
		return content.files[index]?.path ?? SKILL_MD;
	}
	return SKILL_MD;
}
