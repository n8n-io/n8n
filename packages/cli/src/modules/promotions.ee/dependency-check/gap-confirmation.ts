import type { PromotionDependencyReport, PromotionGap } from '@n8n/api-types';

import { targetKey, type RequirementReasonFact, type TargetKey } from './dependency-check.types';

/**
 * Compares the gaps that the user confirmed with the current gaps.
 *
 * - No gap: `ok`. There is nothing to confirm.
 * - Gaps on a strict environment: `changed`. A confirmation cannot lift them, and the report
 *   has `blocked: true`.
 * - Gaps on an environment that allows incomplete operations: `ok` only when the confirmed
 *   list holds the same ids as the current gaps.
 *
 * `ok` does not mean that the operation can run: the caller must also read `report.blocked`.
 */
export function verifyConfirmedGaps(
	report: PromotionDependencyReport,
	confirmedGapIds: readonly string[] | undefined,
): 'ok' | 'changed' {
	if (report.gaps.length === 0) return 'ok';
	if (!report.allowIncomplete) return 'changed';
	const current = new Set(report.gaps.map(({ id }) => id));
	const confirmed = new Set(confirmedGapIds ?? []);
	if (current.size !== confirmed.size) return 'changed';
	for (const id of current) if (!confirmed.has(id)) return 'changed';
	return 'ok';
}

/**
 * The reason that an incomplete Promote writes on each requirement row. The reason is on the
 * row, not on each consumer. A row with one confirmed gap is a confirmed gap, because a strict
 * Apply must stop on it.
 */
export function requirementReasons(
	report: PromotionDependencyReport,
): Map<TargetKey, RequirementReasonFact> {
	const reasons = new Map<TargetKey, RequirementReasonFact>();
	for (const { target, code } of report.notes) {
		if (target && code === 'instance-credential') {
			reasons.set(targetKey(target.kind, target.id), 'instance-credential');
		}
	}
	for (const { target, code } of report.warnings) {
		if (code === 'broken-on-source') {
			reasons.set(targetKey(target.kind, target.id), 'broken-on-source');
		}
	}
	for (const { target } of report.gaps) {
		reasons.set(targetKey(target.kind, target.id), 'confirmed-gap');
	}
	return reasons;
}

const USAGE_LABELS: Record<PromotionGap['usage'], string> = {
	credential: 'credential',
	'sub-workflow': 'sub-workflow',
	'error-workflow': 'error workflow',
};

const GROUP_LABELS: Record<PromotionGap['group'], string> = {
	'same-project': 'in the same project, not promoted',
	'other-project': 'in another project, not promoted',
	'read-only-project': 'in a project that the author cannot promote',
	'no-access': 'in a project that the author cannot access',
	personal: 'a personal resource',
	'outside-environment': 'in a project that this environment does not cover',
	'archived-on-destination': 'archived on the destination',
	'access-not-grantable': 'access not granted on the destination',
	'deleted-by-apply': 'deleted by the same Apply',
	'caller-policy': 'the caller policy refuses the caller',
	'not-on-branch': 'not on the branch',
};

/**
 * One line for each gap. It holds only what the report holds, so it names only what the
 * promoting user can see.
 */
export function describeGap(gap: PromotionGap): string {
	const { consumer, target, usage, group } = gap;
	const label = target.name ? `"${target.name}"` : `id ${target.id}`;
	const type = target.credentialType ? ` (${target.credentialType})` : '';
	const project = target.project ? `, project "${target.project.name}"` : '';
	return `"${consumer.name}" needs the ${USAGE_LABELS[usage]} ${label}${type}: ${GROUP_LABELS[group]}${project}`;
}

/** The gaps as plain text, for the body of a commit message. Empty when there is no gap. */
export function renderGapsForCommitMessage(report: PromotionDependencyReport): string {
	if (report.gaps.length === 0) return '';
	const title =
		report.gaps.length === 1
			? 'Promoted with 1 gap. This reference does not resolve on the branch:'
			: `Promoted with ${report.gaps.length} gaps. These references do not resolve on the branch:`;
	return [title, ...report.gaps.map((gap) => `- ${describeGap(gap)}`)].join('\n');
}

/** The gaps as Markdown, for the description of a review. Empty when there is no gap. */
export function renderGapsForReviewDescription(report: PromotionDependencyReport): string {
	if (report.gaps.length === 0) return '';
	const title = report.gaps.length === 1 ? '### 1 gap' : `### ${report.gaps.length} gaps`;
	return [
		title,
		'',
		'The author confirmed that these references do not resolve on the branch after this promotion.',
		'',
		...report.gaps.map((gap) => `- ${describeGap(gap)}`),
	].join('\n');
}
