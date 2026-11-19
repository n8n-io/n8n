import type { PromotionDependencyReport, PromotionGap, PromotionHardBlock } from '@n8n/api-types';

import { targetKey, type RequirementReasonFact, type TargetKey } from './dependency-check.types';

/**
 * Compares the gaps that the user confirmed with the current gaps.
 *
 * - No gap: `ok`. There is nothing to confirm.
 * - Gaps: `ok` only when the confirmed list holds the same ids as the current gaps.
 *
 * `ok` does not mean that the operation can run: the caller must also read `report.blocked`.
 */
export function verifyConfirmedGaps(
	report: PromotionDependencyReport,
	confirmedGapIds: readonly string[] | undefined,
): 'ok' | 'changed' {
	if (report.gaps.length === 0) return 'ok';
	const current = new Set(report.gaps.map(({ id }) => id));
	const confirmed = new Set(confirmedGapIds ?? []);
	if (current.size !== confirmed.size) return 'changed';
	for (const id of current) if (!confirmed.has(id)) return 'changed';
	return 'ok';
}

/**
 * The reason that a Promote with gaps writes on each requirement row. The reason is on the
 * row, not on each consumer. A row with one confirmed gap is a confirmed gap, because the
 * Apply must show it as a gap.
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

/** What the user does to close a gap of each group. A route without a client text gives it. */
const GROUP_FIXES: Partial<Record<PromotionGap['group'], string>> = {
	'same-project': 'Include it in the operation.',
	'other-project': 'Include it in the operation.',
	'read-only-project': 'Ask the owner team to promote or apply it.',
	'no-access': 'Ask the owner team to promote or apply it.',
	personal: 'Move it to a team project.',
	'outside-environment': 'An instance admin can add the project to the environment.',
	'archived-on-destination': 'Restore it on the destination.',
	'access-not-grantable': 'Ask a user who may share the credential to give the project access.',
	'deleted-by-apply': 'Remove the deletion from the selection.',
	'caller-policy': 'Change the caller policy of the sub-workflow on the destination.',
	'not-on-branch': 'The owner team must promote it.',
};

/** One line for each gap, with its id and the fix. For an error message of a route. */
export function describeGapWithFix(gap: PromotionGap): string {
	const fix =
		gap.detail === 'placeholder-on-source'
			? 'It is an empty placeholder on this instance. Add its values, then promote again.'
			: (GROUP_FIXES[gap.group] ?? '');
	return [`${describeGap(gap)}.`, fix, `(gap id: ${gap.id})`].filter(Boolean).join(' ');
}

const HARD_BLOCK_LABELS: Record<PromotionHardBlock['code'], string> = {
	'credential-type-mismatch': 'the destination holds a credential with this id and another type',
	'ambiguous-credential-owner':
		'the branch holds this credential under more than one project. Keep the file of one project',
	'instance-credential-missing': 'create the instance credential on the destination',
	'incompatible-usage-scope': 'the usage scope on the destination is not compatible',
	'placeholder-create-forbidden':
		'you cannot create a credential in the project that needs the placeholder',
	'credential-move-forbidden': 'you cannot create a credential in the project that owns it',
};

/** One line for a hard block. It names a project folder only when the report holds its name. */
export function describeHardBlock({ code, target, detail }: PromotionHardBlock): string {
	const parts: string[] = [];
	if (detail?.folders) parts.push(`projects: ${detail.folders}`);
	if (detail?.hiddenFolderCount) {
		const count = Number(detail.hiddenFolderCount);
		parts.push(`${count} ${count === 1 ? 'project' : 'projects'} that you cannot access`);
	}
	if (detail?.sourceType) parts.push(`type on the branch: ${detail.sourceType}`);
	if (detail?.destinationType) parts.push(`type on the destination: ${detail.destinationType}`);
	if (detail?.missingPermission) parts.push(`missing permission: ${detail.missingPermission}`);
	if (detail?.project) parts.push(`project: ${detail.project}`);
	const label = target.name ? `"${target.name}"` : `id ${target.id}`;
	return `${label}: ${HARD_BLOCK_LABELS[code]}${parts.length > 0 ? ` (${parts.join('; ')})` : ''}`;
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
