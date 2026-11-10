// Prototype, direction A of the review preview: one list of issues, then a clean diff that only
// marks lines, then notes. The model below is the same for an update and for an import.
import type {
	AgentSkill,
	DiscoveredSkill,
	SkillPendingUpdate,
	SkillScanFinding,
	SkillScanSeverity,
	SkillScanVerdict,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

import {
	SKILL_FILE,
	diffLines,
	type DiffSegment,
} from '@/features/agents/components/skillVersions/skillVersionDiff';

import { useSkillSourceReasons } from '../../skills.utils';

/** A warning or an error. A finding for information is a note, not an issue. */
export type ReviewIssueSeverity = Exclude<SkillScanSeverity, 'info'>;

/**
 * The icon tells the severities apart: a "no entry" sign for Blocked, a triangle for a warning.
 * Both use the warning colour: the diff already uses red for removed lines, so a red issue
 * would read as a removal.
 */
export const SEVERITY_ICONS = {
	blocked: { icon: 'circle-minus', color: 'warning' },
	needs_review: { icon: 'triangle-alert', color: 'warning' },
} as const satisfies Record<ReviewIssueSeverity, { icon: string; color: string }>;

export type ReviewIssue = {
	id: string;
	severity: ReviewIssueSeverity;
	/** The short name, such as "Hidden Unicode characters". */
	title: string;
	/** Shows only when the issue has no line to point at. A line explains itself. */
	detail?: string;
	/** The path of the file in the skill folder, such as `SKILL.md`. */
	file?: string;
	/** The line in the new version of the file, from 1. */
	line?: number;
	/** The text that the diff marks on the line. */
	match?: string;
};

export type ReviewFileStatus = 'modified' | 'added' | 'removed' | 'unchanged';

export type ReviewFile = {
	path: string;
	status: ReviewFileStatus;
	/** Null for a file that the older version does not have, or for an import. */
	before: string | null;
	/** Null for a file that the new version removes. */
	after: string | null;
	added: number;
	removed: number;
};

export type ReviewNote = { id: string; text: string };

export type SkillChangeReviewModel = {
	verdict: SkillScanVerdict;
	/** `diff` compares two versions. `plain` shows one version, as an import does. */
	mode: 'diff' | 'plain';
	issues: ReviewIssue[];
	/** Changed files, and files with an issue. Files with no change and no issue do not show. */
	files: ReviewFile[];
	notes: ReviewNote[];
	/** The folder of the skill on the web, for the link of each file. */
	webUrl?: string;
};

// ---------------------------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------------------------

/** Characters that do not show on screen, as the check reports them. */
const HIDDEN = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;

/** Shows each hidden character as a marker such as `⟦U+200B⟧`, as the check snippets do. */
export function revealHidden(text: string): string {
	return text.replace(
		HIDDEN,
		(char) => `⟦U+${char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}⟧`,
	);
}

export function yamlValue(value: unknown): string {
	return typeof value === 'string' ? value : JSON.stringify(value);
}

/** SKILL.md as the repository has it: the frontmatter, then the instructions. */
export function skillFileText(skill: AgentSkill, frontmatter: Record<string, unknown> | null) {
	const extra = Object.keys(frontmatter ?? {})
		.filter((key) => key !== 'name' && key !== 'description')
		.sort()
		.map((key) => `${key}: ${yamlValue(frontmatter?.[key])}`);
	const head = [
		'---',
		`name: ${skill.name}`,
		`description: ${skill.description}`,
		...extra,
		'---',
		'',
	];
	return {
		text: revealHidden([...head, skill.instructions].join('\n')),
		instructionsLine: head.length + 1,
	};
}

/** The line of a finding in the full text of its file, from 1. */
function lineOf(
	finding: SkillScanFinding,
	text: string | null,
	instructionsLine: number,
): number | undefined {
	const location = finding.location;
	if (!location || text === null) return undefined;
	if (finding.file !== SKILL_FILE) return location.line;
	const lines = text.split('\n');
	const find = (test: (line: string) => boolean) => {
		const index = lines.findIndex(test);
		return index === -1 ? undefined : index + 1;
	};
	switch (location.part) {
		case 'name':
			return find((line) => line.startsWith('name:'));
		case 'description':
			return find((line) => line.startsWith('description:'));
		case 'frontmatter': {
			const row = location.snippet.find(({ line }) => line === location.line)?.text.trim();
			return row ? find((line) => line.trim() === row) : undefined;
		}
		default:
			return instructionsLine + location.line - 1;
	}
}

export function matchOf(finding: SkillScanFinding): string | undefined {
	const location = finding.location;
	if (!location) return undefined;
	const row = location.snippet.find(({ line }) => line === location.line);
	return row?.text.slice(location.start, location.end) || undefined;
}

const SEVERITY_ORDER = { blocked: 0, needs_review: 1 } as const;

export function bySeverity(
	a: { severity: ReviewIssueSeverity },
	b: { severity: ReviewIssueSeverity },
) {
	return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
}

export function counts(before: string | null, after: string | null) {
	const lines = diffLines(before ?? '', after ?? '');
	return {
		added: lines.filter((line) => line.type === 'added').length,
		removed: lines.filter((line) => line.type === 'removed').length,
	};
}

export function statusOf(before: string | null, after: string | null): ReviewFileStatus {
	if (before === null) return 'added';
	if (after === null) return 'removed';
	return before === after ? 'unchanged' : 'modified';
}

// ---------------------------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------------------------

/** Builds the review model from an update or from an imported skill. */
export function useSkillChangeReview() {
	const i18n = useI18n();
	const { ruleText, reasonText } = useSkillSourceReasons();

	function issueOf(
		finding: SkillScanFinding,
		index: number,
		textOf: (file: string) => { text: string | null; instructionsLine: number },
	): ReviewIssue {
		const file = finding.file;
		const { text, instructionsLine } = file ? textOf(file) : { text: null, instructionsLine: 0 };
		const line = lineOf(finding, text, instructionsLine);
		return {
			id: `finding-${index}`,
			severity: finding.severity === 'blocked' ? 'blocked' : 'needs_review',
			title: ruleText(finding.rule),
			...(line === undefined ? { detail: finding.detail } : {}),
			...(file ? { file } : {}),
			...(line !== undefined ? { line } : {}),
			...(line !== undefined && matchOf(finding) ? { match: matchOf(finding) } : {}),
		};
	}

	/** Info findings and left-out files become notes, with no colour. */
	function notesOf(findings: SkillScanFinding[], skippedFiles: string[] = []): ReviewNote[] {
		const domains = [
			...new Set(
				findings.flatMap((finding) =>
					finding.rule === 'new_url' && finding.domain ? [finding.domain] : [],
				),
			),
		];
		const skipped = [
			...new Set([
				...skippedFiles,
				...findings.flatMap((finding) =>
					finding.rule === 'file_skipped' && finding.file ? [finding.file] : [],
				),
			]),
		];
		return [
			...(domains.length > 0
				? [
						{
							id: 'links',
							text: i18n.baseText('settings.context.skills.connect.check.linksTo', {
								interpolate: { domains: domains.join(', ') },
							}),
						},
					]
				: []),
			...skipped.map((path) => ({
				id: `skipped:${path}`,
				text: i18n.baseText('settings.context.skills.reviewA.note.leftOut', {
					interpolate: { file: path },
				}),
			})),
		];
	}

	function isIssue(finding: SkillScanFinding) {
		return finding.severity !== 'info';
	}

	function fromPendingUpdate(
		update: SkillPendingUpdate,
		scopeLabel: string,
	): SkillChangeReviewModel {
		const before = skillFileText(update.current, update.currentFrontmatter);
		const after = update.update ? skillFileText(update.update, update.updateFrontmatter) : null;
		const refs = (skill: AgentSkill | null) =>
			new Map((skill?.references ?? []).map((ref) => [ref.path, revealHidden(ref.content)]));
		const beforeRefs = refs(update.current);
		const afterRefs = refs(update.update);

		const textOf = (file: string) =>
			file === SKILL_FILE
				? { text: after?.text ?? null, instructionsLine: after?.instructionsLine ?? 0 }
				: { text: afterRefs.get(file) ?? null, instructionsLine: 0 };

		const issues = update.check.findings
			.filter(isIssue)
			.map((finding, index) => issueOf(finding, index, textOf));

		if (update.nameClash) {
			issues.unshift({
				id: 'name-clash',
				severity: 'blocked',
				title: i18n.baseText('settings.context.skills.reviewA.nameClash.title', {
					interpolate: { name: update.nameClash.name },
				}),
				detail: i18n.baseText(
					update.nameClash.where === 'agent'
						? 'settings.context.skills.review.nameClash.agent'
						: 'settings.context.skills.review.nameClash',
					{ interpolate: { name: update.nameClash.name, scope: scopeLabel } },
				),
				file: SKILL_FILE,
				...(after
					? { line: lineOf(nameFinding(), after.text, 0), match: update.nameClash.name }
					: {}),
			});
		}

		// With no readable update, there is no diff. The issue says why.
		const files: ReviewFile[] = [];
		if (after) {
			const paths = [...new Set([...beforeRefs.keys(), ...afterRefs.keys()])].sort();
			const all = [
				{ path: SKILL_FILE, before: before.text, after: after.text },
				...paths.map((path) => ({
					path,
					before: beforeRefs.get(path) ?? null,
					after: afterRefs.get(path) ?? null,
				})),
			];
			for (const file of all) {
				const status = statusOf(file.before, file.after);
				const hasIssue = issues.some((issue) => issue.file === file.path);
				if (status === 'unchanged' && !hasIssue) continue;
				files.push({ ...file, status, ...counts(file.before, file.after) });
			}
		}

		return {
			verdict: update.nameClash ? 'blocked' : update.check.verdict,
			mode: 'diff',
			issues: issues.sort(bySeverity),
			files,
			notes: notesOf(update.check.findings),
			webUrl: update.webUrl,
		};
	}

	function fromDiscoveredSkill(skill: DiscoveredSkill, scopeLabel: string): SkillChangeReviewModel {
		const texts = new Map(skill.previewFiles.map((file) => [file.path, file]));
		const textOf = (file: string) => {
			const preview = texts.get(file);
			return {
				text: preview ? revealHidden(preview.text) : null,
				instructionsLine: preview?.instructionsLine ?? 1,
			};
		};
		const findings = skill.check?.findings ?? [];
		const issues = findings
			.filter(isIssue)
			.map((finding, index) => issueOf(finding, index, textOf));

		const main = texts.get(SKILL_FILE);
		if (skill.nameTaken) {
			const name = skill.name ?? skill.location;
			issues.unshift({
				id: 'name-taken',
				severity: 'blocked',
				title: i18n.baseText('settings.context.skills.reviewA.nameTaken.title'),
				detail: i18n.baseText('settings.context.skills.connect.nameTaken.reason', {
					interpolate: { name, scope: scopeLabel },
				}),
				file: SKILL_FILE,
				...(main ? { line: lineOf(nameFinding(), main.text, 0), match: name } : {}),
			});
		}
		// A read error only shows when the check has no finding that names the cause.
		if (skill.error && issues.length === 0) {
			issues.push({
				id: 'error',
				severity: 'blocked',
				title: reasonText(skill.error.reason),
			});
		}

		const files: ReviewFile[] = skill.previewFiles.map((file) => ({
			path: file.path,
			status: 'unchanged',
			before: null,
			after: revealHidden(file.text),
			added: 0,
			removed: 0,
		}));

		const notes = notesOf(findings, skill.skippedFiles);
		if (skill.previewTruncated) {
			notes.push({
				id: 'truncated',
				text: i18n.baseText('settings.context.skills.connect.preview.truncated'),
			});
		}

		return {
			verdict: skill.nameTaken || skill.error ? 'blocked' : (skill.check?.verdict ?? 'pass'),
			mode: 'plain',
			issues: issues.sort(bySeverity),
			files,
			notes,
			webUrl: skill.webUrl,
		};
	}

	return { fromPendingUpdate, fromDiscoveredSkill };
}

/** A finding on the `name:` line, so a name problem can point at that line. */
function nameFinding(): SkillScanFinding {
	return {
		rule: 'invalid_skill',
		severity: 'blocked',
		file: SKILL_FILE,
		detail: '',
		location: { part: 'name', line: 1, snippet: [], start: 0, end: 0 },
	};
}

// ---------------------------------------------------------------------------------------------
// Diff rows
// ---------------------------------------------------------------------------------------------

export type ReviewRow =
	| {
			kind: 'line';
			type: 'equal' | 'added' | 'removed';
			text: string;
			segments?: DiffSegment[];
			/** The line number that the gutter shows: the new line, or the old line of a removal. */
			number: number;
			/** The line in the new version. Removed lines have none. */
			newLine?: number;
	  }
	| { kind: 'gap'; id: number; count: number };

/** Unchanged lines around a change or an issue that stay in view. */
const CONTEXT = 3;

/** A shorter run of unchanged lines stays in view: a fold for it saves no space. */
const MIN_GAP = 4;

type LineRow = Extract<ReviewRow, { kind: 'line' }>;

/** Every line of a file, with its numbers. A plain file compares with itself, so no line changes. */
function linesOf(file: ReviewFile, plain: boolean): LineRow[] {
	let oldLine = 0;
	let newLine = 0;
	const before = plain ? (file.after ?? '') : (file.before ?? '');
	return diffLines(before, file.after ?? '').map((line) => {
		if (line.type === 'removed') {
			oldLine++;
			return { kind: 'line', ...line, number: oldLine };
		}
		newLine++;
		if (line.type === 'equal') oldLine++;
		return { kind: 'line', ...line, number: newLine, newLine };
	});
}

/**
 * The rows of a file. Unchanged lines far from a change or an issue fold into a gap, unless
 * the user opened that gap. `plain` shows every line with no diff, as an import does.
 */
export function rowsOf(
	file: ReviewFile,
	issueLines: Set<number>,
	openGaps: Set<number>,
	plain: boolean,
): ReviewRow[] {
	const lines = linesOf(file, plain);
	if (plain) return lines;

	const keep = new Set<number>();
	lines.forEach((line, index) => {
		const flagged = line.newLine !== undefined && issueLines.has(line.newLine);
		if (line.type !== 'equal' || flagged) {
			for (let k = index - CONTEXT; k <= index + CONTEXT; k++) keep.add(k);
		}
	});

	const rows: ReviewRow[] = [];
	let index = 0;
	while (index < lines.length) {
		if (keep.has(index)) {
			rows.push(lines[index]);
			index++;
			continue;
		}
		const start = index;
		while (index < lines.length && !keep.has(index)) index++;
		if (openGaps.has(start) || index - start < MIN_GAP) {
			rows.push(...lines.slice(start, index));
		} else {
			rows.push({ kind: 'gap', id: start, count: index - start });
		}
	}
	return rows;
}

/** The gap that holds a line of the new version, so a jump can open it. */
export function gapOf(rows: ReviewRow[], file: ReviewFile, line: number): number | undefined {
	const index = linesOf(file, false).findIndex((row) => row.newLine === line);
	if (index === -1) return undefined;
	const gap = rows.find(
		(row) => row.kind === 'gap' && index >= row.id && index < row.id + row.count,
	);
	return gap?.kind === 'gap' ? gap.id : undefined;
}
