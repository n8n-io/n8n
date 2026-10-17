import type { SkillUserDto, SkillVersionSummary } from '@n8n/api-types';

import type { AgentSkill } from '../../types';

export type SkillDiffLineCount = { added: number; removed: number };

export type SkillDiffSectionKind = 'name' | 'description' | 'instructions' | 'reference';

/** One part of a skill, as two versions have it. A missing reference file is an empty string. */
export type SkillDiffSection = SkillDiffLineCount & {
	key: string;
	kind: SkillDiffSectionKind;
	/** Set for a reference file. */
	path?: string;
	from: string;
	to: string;
	changed: boolean;
};

function toLines(text: string): string[] {
	// Empty text has no lines, so a new file counts only the lines it has.
	return text === '' ? [] : text.split('\n');
}

/** Lines added and removed between two texts, from their longest common subsequence. */
export function countLineChanges(from: string, to: string): SkillDiffLineCount {
	if (from === to) return { added: 0, removed: 0 };
	const a = toLines(from);
	const b = toLines(to);

	// The common head and tail do not change the count and make the table smaller.
	let start = 0;
	while (start < a.length && start < b.length && a[start] === b[start]) start++;
	let endA = a.length;
	let endB = b.length;
	while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
		endA--;
		endB--;
	}
	const x = a.slice(start, endA);
	const y = b.slice(start, endB);
	if (x.length === 0 || y.length === 0) return { added: y.length, removed: x.length };

	// One row of the LCS table at a time keeps the memory linear.
	let previous = new Uint32Array(y.length + 1);
	let current = new Uint32Array(y.length + 1);
	for (let i = 1; i <= x.length; i++) {
		for (let j = 1; j <= y.length; j++) {
			current[j] =
				x[i - 1] === y[j - 1] ? previous[j - 1] + 1 : Math.max(previous[j], current[j - 1]);
		}
		[previous, current] = [current, previous];
	}
	const common = previous[y.length];
	return { added: y.length - common, removed: x.length - common };
}

function section(
	key: string,
	kind: SkillDiffSectionKind,
	from: string,
	to: string,
	path?: string,
): SkillDiffSection {
	return {
		key,
		kind,
		...(path !== undefined ? { path } : {}),
		from,
		to,
		changed: from !== to,
		...countLineChanges(from, to),
	};
}

/**
 * The parts of a skill in the order the editor shows them: name, description, SKILL.md,
 * then each reference file. A file that only one side has is compared with an empty file.
 */
export function getSkillDiffSections(from: AgentSkill, to: AgentSkill): SkillDiffSection[] {
	const fromReferences = new Map((from.references ?? []).map((ref) => [ref.path, ref.content]));
	const toReferences = new Map((to.references ?? []).map((ref) => [ref.path, ref.content]));
	const paths = [...new Set([...fromReferences.keys(), ...toReferences.keys()])];

	return [
		section('name', 'name', from.name, to.name),
		section('description', 'description', from.description, to.description),
		section('instructions', 'instructions', from.instructions, to.instructions),
		...paths.map((path) =>
			section(
				`reference:${path}`,
				'reference',
				fromReferences.get(path) ?? '',
				toReferences.get(path) ?? '',
				path,
			),
		),
	];
}

/** The total lines added and removed between two versions of a skill. */
export function countSkillDiff(from: AgentSkill, to: AgentSkill): SkillDiffLineCount {
	return getSkillDiffSections(from, to).reduce(
		(total, { added, removed }) => ({
			added: total.added + added,
			removed: total.removed + removed,
		}),
		{ added: 0, removed: 0 },
	);
}

/** How the version UI names a user: the full name, else the email. */
export function skillUserName(user: SkillUserDto | null): string | undefined {
	if (!user) return undefined;
	const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
	return fullName || user.email || undefined;
}

export type SkillTimelineEntry =
	| { type: 'version'; version: SkillVersionSummary }
	| { type: 'unnamed'; key: string; versions: SkillVersionSummary[] };

/**
 * Folds each run of two or more unnamed versions into one entry, as the workflow history
 * does. The latest version and a version with an agent on it always get their own row,
 * so `keep` names the versions that stay visible.
 */
export function groupSkillTimeline(
	versions: SkillVersionSummary[],
	keep: (version: SkillVersionSummary) => boolean,
): SkillTimelineEntry[] {
	const entries: SkillTimelineEntry[] = [];
	let run: SkillVersionSummary[] = [];
	const flush = () => {
		if (run.length > 1) {
			entries.push({ type: 'unnamed', key: `unnamed:${run[0].version}`, versions: run });
		} else if (run.length === 1) {
			entries.push({ type: 'version', version: run[0] });
		}
		run = [];
	};
	for (const version of versions) {
		if (version.label || keep(version)) {
			flush();
			entries.push({ type: 'version', version });
		} else {
			run.push(version);
		}
	}
	flush();
	return entries;
}
