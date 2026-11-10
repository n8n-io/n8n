import type { SkillScanFinding, SkillScanSeverity } from '@n8n/api-types';

/** What happens to a skill in the review picker: it comes in, or it does not. */
export type SkillDecision = 'accept' | 'reject';

export type SkillStatusKind = 'error' | 'warning' | 'info' | 'success';

export type SkillStatus = { kind: SkillStatusKind; count: number };

/** One row of the review picker. */
export type SkillReviewItem = {
	id: string;
	title: string;
	/** The second line, such as the description or the location of the skill. */
	subtitle?: string;
	/** Why the skill cannot come in. The row shows it in red. */
	reason?: string;
	/** A skill that can come in. Only these rows get the decision menu. */
	decidable: boolean;
	statuses: SkillStatus[];
};

/** A group with no name shows no header row. */
export type SkillReviewGroup = { id: string; name: string; items: SkillReviewItem[] };

const STATUS_OF_SEVERITY = {
	blocked: 'error',
	needs_review: 'warning',
	info: 'info',
} as const satisfies Record<SkillScanSeverity, SkillStatusKind>;

/**
 * One status for each severity in the findings, most severe first, with the number of findings.
 * A skill with no findings shows success, or an error when n8n could not read it.
 */
export function statusesOf(
	findings: ReadonlyArray<{ severity: SkillScanSeverity }>,
	failed = false,
): SkillStatus[] {
	const counts = new Map<SkillStatusKind, number>();
	for (const finding of findings) {
		const kind = STATUS_OF_SEVERITY[finding.severity];
		counts.set(kind, (counts.get(kind) ?? 0) + 1);
	}
	if (counts.size === 0) return [{ kind: failed ? 'error' : 'success', count: 1 }];
	return (['error', 'warning', 'info'] as const).flatMap((kind) => {
		const count = counts.get(kind);
		return count ? [{ kind, count }] : [];
	});
}

/** A left-out file is not a risk, so the files view lists it, not the findings. */
export function isSkippedFileFinding(finding: SkillScanFinding): boolean {
	return finding.rule === 'file_skipped' && Boolean(finding.file);
}

/**
 * The files that n8n leaves out, as the files view lists them, each with the reason from the
 * check. A file in `paths` that no finding names gets the `fallback` reason.
 */
export function skippedFilesOf(
	findings: readonly SkillScanFinding[],
	paths: readonly string[] = [],
	fallback = '',
): Array<{ path: string; detail: string }> {
	const files = new Map<string, string>();
	for (const finding of findings) {
		if (isSkippedFileFinding(finding) && finding.file) files.set(finding.file, finding.detail);
	}
	for (const path of paths) if (!files.has(path)) files.set(path, fallback);
	return [...files].map(([path, detail]) => ({ path, detail }));
}

/** Every decidable skill starts as accepted. */
export function acceptAll(items: ReadonlyArray<{ id: string }>): Record<string, SkillDecision> {
	return Object.fromEntries(items.map(({ id }) => [id, 'accept' as const]));
}
