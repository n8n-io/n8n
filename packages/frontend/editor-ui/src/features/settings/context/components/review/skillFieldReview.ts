// Prototype, direction B of the review preview: the structure of direction A (one list of
// issues, folded files, notes), but each file shows as the fields of the skill modal. Every
// frontmatter key is a field, also a key that n8n does not keep.
import type {
	AgentSkill,
	DiscoveredSkill,
	SkillPendingUpdate,
	SkillScanFinding,
	SkillScanRule,
	SkillScanVerdict,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

import { SKILL_FILE } from '@/features/agents/components/skillVersions/skillVersionDiff';

import { useSkillSourceReasons } from '../../skills.utils';
import {
	bySeverity,
	counts,
	matchOf,
	revealHidden,
	statusOf,
	useSkillChangeReview,
	yamlValue,
	type ReviewFileStatus,
	type ReviewIssueSeverity,
	type ReviewNote,
} from './skillChangeReview';

export type ReviewFieldKind = 'line' | 'markdown';

export type ReviewField = {
	/** `name`, `description`, `instructions`, `content`, or `frontmatter:<key>`. */
	key: string;
	label: string;
	kind: ReviewFieldKind;
	/** The older value. Empty for a new field. A plain file has the same value on both sides. */
	before: string;
	after: string;
	changed: boolean;
	/** n8n does not keep this field. It shows struck through, with no diff. */
	dropped?: boolean;
};

export type FieldReviewIssue = {
	id: string;
	severity: ReviewIssueSeverity;
	title: string;
	/** Shows only when the issue has no text to mark. Marked text explains itself. */
	detail?: string;
	file?: string;
	/** The key of the field that holds the issue. */
	field?: string;
	/** The text that the field marks. */
	match?: string;
	/** The rule of the check, for an issue that comes from a finding. */
	rule?: SkillScanRule;
};

export type FieldReviewFile = {
	path: string;
	status: ReviewFileStatus;
	fields: ReviewField[];
	added: number;
	removed: number;
};

export type SkillFieldReviewModel = {
	verdict: SkillScanVerdict;
	mode: 'diff' | 'plain';
	issues: FieldReviewIssue[];
	files: FieldReviewFile[];
	notes: ReviewNote[];
	webUrl?: string;
};

type SkillFields = {
	name: string;
	description: string;
	frontmatter: Record<string, string>;
	instructions: string;
};

const FRONTMATTER = 'frontmatter:';

function fieldsOfSkill(
	skill: AgentSkill,
	frontmatter: Record<string, unknown> | null,
): SkillFields {
	return {
		name: skill.name,
		description: skill.description,
		frontmatter: Object.fromEntries(
			Object.entries(frontmatter ?? {})
				.filter(([key]) => key !== 'name' && key !== 'description')
				.map(([key, value]) => [key, revealHidden(yamlValue(value))]),
		),
		instructions: revealHidden(skill.instructions),
	};
}

/** The fields of a SKILL.md text, as an import shows it. A loose read: one line for each key. */
function fieldsOfText(text: string, instructionsLine: number | undefined): SkillFields {
	const lines = text.split('\n');
	const end = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
	const frontmatter: Record<string, string> = {};
	let last = '';
	for (const line of end > 0 ? lines.slice(1, end) : []) {
		const pair = /^([\w-]+):\s?(.*)$/.exec(line);
		if (pair) {
			last = pair[1];
			frontmatter[last] = pair[2];
		} else if (last) {
			frontmatter[last] = `${frontmatter[last]}\n${line}`;
		}
	}
	const { name = '', description = '', ...rest } = frontmatter;
	const start = instructionsLine ? instructionsLine - 1 : end + 1;
	return {
		name,
		description,
		frontmatter: rest,
		instructions: lines.slice(start).join('\n').trim(),
	};
}

/** The key of the field that holds a finding in SKILL.md. */
function fieldOf(finding: SkillScanFinding, keys: string[]): string | undefined {
	const location = finding.location;
	if (location) {
		if (location.part === 'name' || location.part === 'description') return location.part;
		if (location.part === 'frontmatter') {
			const row = location.snippet.find(({ line }) => line === location.line)?.text ?? '';
			const key = /^\s*([\w-]+):/.exec(row)?.[1];
			return key && keys.includes(key) ? `${FRONTMATTER}${key}` : undefined;
		}
		return 'instructions';
	}
	// A finding with no place can still name a frontmatter key, such as a field that n8n drops.
	const named = [...finding.detail.matchAll(/`([\w-]+)`/g)].map((match) => match[1]);
	const key = named.find((candidate) => keys.includes(candidate));
	return key ? `${FRONTMATTER}${key}` : undefined;
}

export function useSkillFieldReview() {
	const i18n = useI18n();
	const { ruleText } = useSkillSourceReasons();
	const changeReview = useSkillChangeReview();

	const LABELS = {
		name: i18n.baseText('agents.builder.skills.name.label'),
		description: i18n.baseText('agents.builder.skills.description.label'),
		instructions: i18n.baseText('agents.builder.skills.instructions.label'),
		content: i18n.baseText('agents.builder.skills.references.content.label'),
	};

	function field(
		key: string,
		label: string,
		kind: ReviewFieldKind,
		before: string | undefined,
		after: string | undefined,
	): ReviewField {
		return {
			key,
			label,
			kind,
			before: before ?? '',
			after: after ?? '',
			changed: (before ?? '') !== (after ?? ''),
		};
	}

	/** Name, description, every frontmatter key, then the instructions, as the skill modal. */
	function skillFields(before: SkillFields | null, after: SkillFields): ReviewField[] {
		const from = before ?? after;
		const keys = [
			...new Set([...Object.keys(from.frontmatter), ...Object.keys(after.frontmatter)]),
		].sort();
		return [
			field('name', LABELS.name, 'line', from.name, after.name),
			field('description', LABELS.description, 'line', from.description, after.description),
			...keys.map((key) =>
				field(`${FRONTMATTER}${key}`, key, 'line', from.frontmatter[key], after.frontmatter[key]),
			),
			field('instructions', LABELS.instructions, 'markdown', from.instructions, after.instructions),
		];
	}

	function fileOf(path: string, fields: ReviewField[], status: ReviewFileStatus): FieldReviewFile {
		const total = fields.reduce(
			(sum, { before, after, changed }) => {
				if (!changed) return sum;
				const count = counts(before || null, after || null);
				return { added: sum.added + count.added, removed: sum.removed + count.removed };
			},
			{ added: 0, removed: 0 },
		);
		return { path, status, fields, ...total };
	}

	function issuesOf(findings: SkillScanFinding[], keysOf: (file: string) => string[]) {
		return findings
			.filter((finding) => finding.severity !== 'info')
			.map((finding, index): FieldReviewIssue => {
				const file = finding.file;
				const field =
					file === SKILL_FILE
						? fieldOf(finding, keysOf(file))
						: file
							? 'content'
							: fieldOf(finding, keysOf(SKILL_FILE));
				const match = field ? matchOf(finding) : undefined;
				// A dropped frontmatter key needs no detail: the title and the field name say it all.
				const droppedKey =
					finding.rule === 'lossy_conversion' && field?.startsWith(FRONTMATTER)
						? field.slice(FRONTMATTER.length)
						: undefined;
				return {
					id: `finding-${index}`,
					severity: finding.severity === 'blocked' ? 'blocked' : 'needs_review',
					title: droppedKey
						? i18n.baseText('settings.context.skills.reviewB.issue.droppedField', {
								interpolate: {
									field: droppedKey.charAt(0).toUpperCase() + droppedKey.slice(1),
								},
							})
						: ruleText(finding.rule),
					rule: finding.rule,
					...(match || droppedKey ? {} : { detail: finding.detail }),
					// A finding about a frontmatter key belongs to SKILL.md.
					...(file ? { file } : field ? { file: SKILL_FILE } : {}),
					...(field ? { field } : {}),
					...(match ? { match } : {}),
				};
			});
	}

	/** A field that a "cannot convert" issue points at is one that n8n drops. */
	function markDropped(files: FieldReviewFile[], issues: FieldReviewIssue[]) {
		const dropped = new Set(
			issues.flatMap((issue) =>
				issue.rule === 'lossy_conversion' && issue.field ? [`${issue.file}:${issue.field}`] : [],
			),
		);
		return files.map((file) => ({
			...file,
			fields: file.fields.map((candidate) =>
				dropped.has(`${file.path}:${candidate.key}`) ? { ...candidate, dropped: true } : candidate,
			),
		}));
	}

	function frontmatterKeys(fields: SkillFields | null) {
		return Object.keys(fields?.frontmatter ?? {});
	}

	function fromPendingUpdate(
		update: SkillPendingUpdate,
		scopeLabel: string,
	): SkillFieldReviewModel {
		const base = changeReview.fromPendingUpdate(update, scopeLabel);
		const before = fieldsOfSkill(update.current, update.currentFrontmatter);
		const after = update.update ? fieldsOfSkill(update.update, update.updateFrontmatter) : null;

		const issues = issuesOf(update.check.findings, () => frontmatterKeys(after));
		const clash = base.issues.find((issue) => issue.id === 'name-clash');
		if (clash) {
			issues.unshift({
				id: clash.id,
				severity: clash.severity,
				title: clash.title,
				detail: clash.detail,
				file: SKILL_FILE,
				...(after ? { field: 'name', match: update.nameClash?.name } : {}),
			});
		}

		const files: FieldReviewFile[] = [];
		if (after) {
			const fields = skillFields(before, after);
			files.push(fileOf(SKILL_FILE, fields, 'modified'));
			const refs = (skill: AgentSkill | null) =>
				new Map((skill?.references ?? []).map((ref) => [ref.path, revealHidden(ref.content)]));
			const beforeRefs = refs(update.current);
			const afterRefs = refs(update.update);
			for (const path of [...new Set([...beforeRefs.keys(), ...afterRefs.keys()])].sort()) {
				const from = beforeRefs.get(path) ?? null;
				const to = afterRefs.get(path) ?? null;
				const status = statusOf(from, to);
				if (status === 'unchanged' && !issues.some((issue) => issue.file === path)) continue;
				const content = field('content', LABELS.content, 'markdown', from ?? '', to ?? '');
				files.push(fileOf(path, [content], status));
			}
		}

		return {
			verdict: base.verdict,
			mode: 'diff',
			issues: issues.sort(bySeverity),
			files: markDropped(
				files.filter(
					(file) =>
						file.fields.some((candidate) => candidate.changed) ||
						issues.some((issue) => issue.file === file.path),
				),
				issues,
			),
			notes: base.notes,
			webUrl: update.webUrl,
		};
	}

	function fromDiscoveredSkill(skill: DiscoveredSkill, scopeLabel: string): SkillFieldReviewModel {
		const base = changeReview.fromDiscoveredSkill(skill, scopeLabel);
		const main = skill.previewFiles.find((file) => file.path === SKILL_FILE);
		const fields = main ? fieldsOfText(main.text, main.instructionsLine) : null;

		const issues = issuesOf(skill.check?.findings ?? [], () => frontmatterKeys(fields));
		for (const id of ['name-taken', 'error']) {
			const issue = base.issues.find((candidate) => candidate.id === id);
			if (!issue) continue;
			issues.unshift({
				id: issue.id,
				severity: issue.severity,
				title: issue.title,
				detail: issue.detail,
				...(issue.file ? { file: issue.file } : {}),
				...(id === 'name-taken' && fields ? { field: 'name', match: fields.name } : {}),
			});
		}

		const files: FieldReviewFile[] = [
			...(fields ? [fileOf(SKILL_FILE, skillFields(null, fields), 'unchanged')] : []),
			...skill.previewFiles
				.filter((file) => file.path !== SKILL_FILE)
				.map((file) => {
					const text = revealHidden(file.text);
					return fileOf(
						file.path,
						[field('content', LABELS.content, 'markdown', text, text)],
						'unchanged',
					);
				}),
		];

		return {
			verdict: base.verdict,
			mode: 'plain',
			issues: issues.sort(bySeverity),
			files: markDropped(files, issues),
			notes: base.notes,
			webUrl: skill.webUrl,
		};
	}

	return { fromPendingUpdate, fromDiscoveredSkill };
}
