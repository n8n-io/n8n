import {
	AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH,
	agentSkillSchema,
	type SkillLinkReviewReason,
	type SkillScanFinding,
	type SkillScanLimit,
	type SkillScanLimitField,
	type SkillScanLocation,
} from '@n8n/api-types';
import { kebabCase } from 'change-case';
import get from 'lodash/get';
import { isDeepStrictEqual } from 'node:util';
import type { ZodIssue } from 'zod';

import type { SkillContent } from './skill-content-hash';
import { extractSkillLinks, linkReviewReason } from './skill-link-review-policy';
import { SKILL_MD } from './skill-md';
import { codePointOf, HIDDEN_PATTERN, locate, skillMdText } from './skill-text';
import { isScriptFile } from './skipped-files';
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
export function checkShape({ content }: Pick<SkillScanInput, 'content'>): SkillScanFinding[] {
	const input = {
		// The service trims these, so a value of only spaces is empty.
		name: content.name.trim(),
		description: content.description.trim(),
		instructions: content.instructions.trim(),
		...(content.files.length ? { references: content.files } : {}),
	};
	const parsed = agentSkillSchema.safeParse(input);
	const findings: SkillScanFinding[] = parsed.success
		? []
		: parsed.error.issues.map<SkillScanFinding>((issue) => {
				const file = fileOfIssue(content, issue.path);
				const limit = limitOf(content, input, issue);
				return limit
					? overLimit(file, limit)
					: {
							rule: 'invalid_skill',
							severity: 'blocked',
							file,
							detail: emptyDetail(issue) ?? issue.message,
						};
			});
	const frontmatterLength = content.frontmatter ? JSON.stringify(content.frontmatter).length : 0;
	if (frontmatterLength > FRONTMATTER_MAX_LENGTH) {
		findings.push(
			overLimit(SKILL_MD, {
				field: 'frontmatter',
				max: FRONTMATTER_MAX_LENGTH,
				current: frontmatterLength,
			}),
		);
	}
	return findings;
}

/** The English text of each limit, for the `detail` of a finding. The UI writes its own from `limit`. */
const LIMIT_DETAIL: Record<SkillScanLimitField, (limit: SkillScanLimit) => string> = {
	name: ({ max, current }) =>
		`The name can have at most ${max} characters. It has ${current} characters.`,
	description: ({ max, current }) =>
		`The description can have at most ${max} characters. It has ${current} characters.`,
	instructions: ({ max, current }) =>
		`The instructions can have at most ${max} characters. They have ${current} characters.`,
	frontmatter: ({ max, current }) =>
		`The frontmatter can have at most ${max} characters as JSON. It has ${current} characters.`,
	referenceCount: ({ max, current }) =>
		`A skill can have at most ${max} reference files. It has ${current} files.`,
	referencePath: ({ max, current }) =>
		`The path of a reference file can have at most ${max} characters. It has ${current} characters.`,
	referenceContent: ({ max, current }) =>
		`A reference file can have at most ${max} characters. It has ${current} characters.`,
	referencesTotal: ({ max, current }) =>
		`The reference files can have at most ${max} characters in total. They have ${current} characters.`,
};

function overLimit(file: string, limit: SkillScanLimit): SkillScanFinding {
	return {
		rule: 'over_limit',
		severity: 'blocked',
		file,
		detail: LIMIT_DETAIL[limit.field](limit),
		limit,
	};
}

const TEXT_FIELDS: Record<string, SkillScanLimitField> = {
	name: 'name',
	description: 'description',
	instructions: 'instructions',
};

/**
 * The limit that an issue of the skills schema reports. The total size of the references is a
 * custom issue on the list itself. The other custom issue of the list, a duplicate path, is on
 * one entry.
 */
function limitOf(
	content: SkillContent,
	input: object,
	issue: ZodIssue,
): SkillScanLimit | undefined {
	const [field, , part] = issue.path;
	if (issue.code === 'custom') {
		return field === 'references' && issue.path.length === 1
			? {
					field: 'referencesTotal',
					max: AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH,
					current: content.files.reduce((total, file) => total + file.content.length, 0),
				}
			: undefined;
	}
	if (issue.code !== 'too_big') return undefined;
	const value: unknown = get(input, issue.path);
	const limitField =
		field !== 'references'
			? TEXT_FIELDS[String(field)]
			: issue.path.length === 1
				? 'referenceCount'
				: part === 'path'
					? 'referencePath'
					: 'referenceContent';
	if (!limitField || (typeof value !== 'string' && !Array.isArray(value))) return undefined;
	return { field: limitField, max: Number(issue.maximum), current: value.length };
}

/** The schema has no message of its own for an empty text, so the finding names the field. */
function emptyDetail(issue: ZodIssue): string | undefined {
	if (issue.code !== 'too_small') return undefined;
	const [field, , part] = issue.path;
	if (field === 'name') return 'The name is empty.';
	if (field === 'description') return 'The description is empty.';
	if (field === 'references' && part === 'content') return 'The reference file is empty.';
	if (field === 'references' && part === 'path') return 'The reference file has no path.';
	return undefined;
}

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
			: isScriptFile(file)
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

/** The English text of each reason, for the `detail` of a finding. */
const LINK_REASON_DETAIL: Record<SkillLinkReviewReason, string> = {
	ip_address: 'it uses an IP address',
	not_https: 'it does not use HTTPS',
	paste_site: 'it uses a paste site',
	webhook_catcher: 'it uses a webhook catcher',
	url_shortener: 'it uses a URL shortener',
	unreadable: 'n8n cannot read its address',
};

/**
 * An update needs review if it links to a new domain. At import, list each domain and flag
 * destinations that need review even without a previous version.
 */
export function findNewUrls({ content, previous }: SkillScanInput): SkillScanFinding[] {
	const known = previous ? domainsByFile(previous) : undefined;
	return [...domainsByFile(content, !previous)]
		.filter(([key]) => !known?.has(key))
		.map(([key, { file, locate, domain, reviewReason }]) => ({
			rule: reviewReason ? 'risky_url' : 'new_url',
			severity: previous || reviewReason ? 'needs_review' : 'info',
			file,
			...(domain ? { domain } : {}),
			...(reviewReason ? { linkReason: reviewReason } : {}),
			detail: previous
				? `The update links to ${key}, a domain that the current version does not use.`
				: reviewReason
					? `The link ${domain ? `to ${domain}` : key} needs review because ${LINK_REASON_DETAIL[reviewReason]}.`
					: `The skill links to ${domain}.`,
			location: locate(),
		}));
}

/** `domain` is absent for a link with an address that n8n cannot read. */
type DomainOccurrence = {
	file: string;
	locate: () => SkillScanLocation;
	domain?: string;
	reviewReason?: SkillLinkReviewReason;
};

/**
 * Keep the first link per domain. At import, prefer the first link that needs review. A link
 * with an address that n8n cannot read has its text as the key, and counts only at import.
 */
function domainsByFile(
	content: SkillContent,
	checkImportRisk = false,
): Map<string, DomainOccurrence> {
	const domains = new Map<string, DomainOccurrence>();
	for (const { file, texts } of textsByFile(content)) {
		for (const entry of texts) {
			for (const { link, start, end, url, domain } of extractSkillLinks(entry.text)) {
				if (!domain && !checkImportRisk) continue;
				const key = domain || link;
				const existing = domains.get(key);
				if (existing && (!checkImportRisk || existing.reviewReason)) continue;
				const reviewReason = checkImportRisk ? linkReviewReason(url, domain) : undefined;
				if (existing && !reviewReason) continue;
				domains.set(key, {
					file,
					domain,
					reviewReason,
					// Resolve the location only for links that produce a finding.
					locate: () => entry.locate(start, end),
				});
			}
		}
	}
	return domains;
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

/** Issues under `references` name the file. Every other field is in SKILL.md. */
function fileOfIssue(content: SkillContent, path: Array<string | number>): string {
	const [field, index] = path;
	if (field === 'references' && typeof index === 'number') {
		return content.files[index]?.path ?? SKILL_MD;
	}
	return SKILL_MD;
}
