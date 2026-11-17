import type {
	PromotionDependencyReport,
	PromotionGap,
	PromotionGapDetail,
	PromotionGapExit,
	PromotionGapGroup,
	PromotionReferenceTarget,
} from '@n8n/api-types';

import type { ResourceKey } from './promotionPreview.selection';

/**
 * The dependency report of the preview pages: how its gaps are grouped, how it follows the
 * selection, and which confirmations an Apply still needs.
 */

/** A group that this client does not know yet. It blocks like any other gap. */
export type GapGroupId = PromotionGapGroup | 'unknown';

/** The order of solution 3.2: the gaps that the user can close come first. */
const GAP_GROUP_ORDER: readonly GapGroupId[] = [
	'same-project',
	'other-project',
	'read-only-project',
	'no-access',
	'personal',
	'outside-environment',
	'not-on-branch',
	'archived-on-destination',
	'access-not-grantable',
	'deleted-by-apply',
	'caller-policy',
	'unknown',
];

const KNOWN_GROUPS = new Set<string>(GAP_GROUP_ORDER);

export const gapGroupOf = (gap: PromotionGap): GapGroupId =>
	KNOWN_GROUPS.has(gap.group) ? gap.group : 'unknown';

export const targetKey = (target: Pick<PromotionReferenceTarget, 'kind' | 'id'>): ResourceKey =>
	`${target.kind}:${target.id}`;

/** One target of a group, with every reference to it. Each reference is one gap. */
export type GapTargetRow = {
	key: string;
	target: PromotionReferenceTarget;
	state?: PromotionGap['state'];
	review?: PromotionGap['review'];
	exits: PromotionGapExit[];
	include?: PromotionGap['include'];
	ownerRequestSent: boolean;
	placeholder: boolean;
	/** More about the row, for its message. One entry for each kind of detail. */
	details: PromotionGapDetail[];
	gaps: PromotionGap[];
};

export type GapGroup = { id: GapGroupId; rows: GapTargetRow[]; gapCount: number };

/** Groups the gaps as the report shows them. The count of a group stays one for each reference. */
export function groupGaps(gaps: readonly PromotionGap[]): GapGroup[] {
	const groups = new Map<GapGroupId, Map<string, GapTargetRow>>();
	for (const gap of gaps) {
		const id = gapGroupOf(gap);
		const rows = groups.get(id) ?? new Map<string, GapTargetRow>();
		groups.set(id, rows);
		const key = targetKey(gap.target);
		const row = rows.get(key);
		if (!row) {
			rows.set(key, {
				key,
				target: gap.target,
				state: gap.state,
				review: gap.review,
				exits: [...gap.exits],
				include: gap.include,
				ownerRequestSent: gap.ownerRequestSent === true,
				placeholder: gap.placeholder === true,
				details: gap.detail ? [gap.detail] : [],
				gaps: [gap],
			});
			continue;
		}
		if (gap.detail && !row.details.includes(gap.detail)) row.details.push(gap.detail);
		row.gaps.push(gap);
		for (const exit of gap.exits) if (!row.exits.includes(exit)) row.exits.push(exit);
		row.include ??= gap.include;
		row.review ??= gap.review;
		row.state ??= gap.state;
		row.ownerRequestSent ||= gap.ownerRequestSent === true;
		row.placeholder ||= gap.placeholder === true;
	}
	return GAP_GROUP_ORDER.flatMap((id) => {
		const rows = groups.get(id);
		if (!rows) return [];
		const list = [...rows.values()];
		return [{ id, rows: list, gapCount: list.reduce((sum, row) => sum + row.gaps.length, 0) }];
	});
}

export type ReportScope = {
	/** Everything that the operation writes: the selection, what comes with it, and the included items. */
	selected: ReadonlySet<ResourceKey>;
	/** Every resource of the preview. A reference from an unlisted workflow stays in the report. */
	listed: ReadonlySet<ResourceKey>;
};

/**
 * The preview computes the report for every change that it lists. The page keeps what belongs
 * to the selection, so a gap leaves the list when the user includes its target or clears its
 * consumer. The operation computes the gaps again, so this view never decides what is written.
 */
export function scopeDependencyReport(
	report: PromotionDependencyReport,
	{ selected, listed }: ReportScope,
): PromotionDependencyReport {
	const inOperation = (workflowId: string) => {
		const key = `workflow:${workflowId}`;
		return selected.has(key) || !listed.has(key);
	};
	const gaps = report.gaps.filter((gap) => {
		if (!inOperation(gap.consumer.id)) return false;
		if (gap.include && selected.has(gap.include.resourceKey)) return false;
		// The user removed the deletion from the selection.
		const target = targetKey(gap.target);
		if (gap.group === 'deleted-by-apply' && listed.has(target) && !selected.has(target)) {
			return false;
		}
		return true;
	});
	const hardBlocks = report.hardBlocks.filter(
		({ consumer }) => !consumer || inOperation(consumer.id),
	);
	return {
		...report,
		gaps,
		hardBlocks,
		warnings: report.warnings.filter(({ consumer }) => inOperation(consumer.id)),
		notes: report.notes.filter(({ consumer }) => inOperation(consumer.id)),
		grants: report.grants.flatMap((grant) => {
			const consumers = grant.consumers.filter(({ id }) => inOperation(id));
			return consumers.length > 0 ? [{ ...grant, consumers }] : [];
		}),
		deletionCallers: report.deletionCallers.filter(({ target }) => inOperation(target.id)),
		blocked: hardBlocks.length > 0 || (!report.allowIncomplete && gaps.length > 0),
	};
}

/** What the Dependencies tab counts: every item that stops the operation or needs the user. */
export const dependencyIssueCount = (report: PromotionDependencyReport) =>
	report.gaps.length + report.hardBlocks.length;

/** True when the report has nothing to show, apart from the permanent footnote. */
export function isEmptyReport(report: PromotionDependencyReport) {
	return (
		dependencyIssueCount(report) === 0 &&
		report.warnings.length === 0 &&
		report.notes.length === 0 &&
		report.grants.length === 0 &&
		report.credentialMoves.length === 0 &&
		report.deletionCallers.length === 0 &&
		report.keptWorkflows.length === 0 &&
		report.credentialHomeChoices.length === 0
	);
}

/** The credentials that an incomplete Apply creates as placeholders, one for each id. */
export function placeholderGaps(gaps: readonly PromotionGap[]): PromotionGap[] {
	const seen = new Set<string>();
	return gaps.filter((gap) => {
		if (!gap.placeholder || seen.has(gap.target.id)) return false;
		seen.add(gap.target.id);
		return true;
	});
}

/** What the user accepted on the Dependencies tab of an Apply. */
export type ApplyConfirmations = {
	grantIds: ReadonlySet<string>;
	deletionCallers: boolean;
	/** The home project of each credential that the branch holds without an owner, by id. */
	credentialHomes: Readonly<Record<string, string>>;
};

export const noConfirmations = (): ApplyConfirmations => ({
	grantIds: new Set(),
	deletionCallers: false,
	credentialHomes: {},
});

export type PendingConfirmation = 'grants' | 'deletionCallers' | 'credentialHomes';

/** The confirmations that the report asks for and the user did not give yet. */
export function pendingConfirmations(
	report: PromotionDependencyReport,
	confirmations: ApplyConfirmations,
): PendingConfirmation[] {
	const pending: PendingConfirmation[] = [];
	if (report.grants.some(({ id }) => !confirmations.grantIds.has(id))) pending.push('grants');
	if (report.deletionCallers.length > 0 && !confirmations.deletionCallers) {
		pending.push('deletionCallers');
	}
	if (
		report.credentialHomeChoices.some(
			({ credential }) => !confirmations.credentialHomes[credential.id],
		)
	) {
		pending.push('credentialHomes');
	}
	return pending;
}

export type DependencyConfirmationPayload = {
	confirmedGapIds?: string[];
	confirmedGrantIds?: string[];
	confirmDeletionCallers?: boolean;
	credentialHomes?: Record<string, string>;
};

/**
 * The confirmations of a request. Each list holds only what the report still shows, so a
 * confirmation of an item that left the selection is not sent.
 */
export function toConfirmationPayload(
	report: PromotionDependencyReport | null,
	confirmations: ApplyConfirmations,
	direction: 'promote' | 'apply',
): DependencyConfirmationPayload {
	if (!report) return {};
	const payload: DependencyConfirmationPayload = {};
	if (report.gaps.length > 0) payload.confirmedGapIds = report.gaps.map(({ id }) => id).sort();
	if (direction === 'promote') return payload;
	const grantIds = report.grants.map(({ id }) => id).filter((id) => confirmations.grantIds.has(id));
	if (grantIds.length > 0) payload.confirmedGrantIds = grantIds.sort();
	if (report.deletionCallers.length > 0 && confirmations.deletionCallers) {
		payload.confirmDeletionCallers = true;
	}
	const homes = Object.fromEntries(
		report.credentialHomeChoices.flatMap(({ credential }) => {
			const projectId = confirmations.credentialHomes[credential.id];
			return projectId ? [[credential.id, projectId] as const] : [];
		}),
	);
	if (Object.keys(homes).length > 0) payload.credentialHomes = homes;
	return payload;
}

/**
 * "Ask the owner". The page only needs to send one request and to know when it was sent, so
 * the composable that owns the request plugs in here.
 */
export type PromotionOwnerRequest = {
	environmentId: string;
	target: { kind: 'credential' | 'workflow'; id: string };
	/** The workflow of the user that holds the reference. */
	consumerWorkflowId: string;
	/** The reference itself. It proves that the user knows the target. */
	gap: Pick<PromotionGap, 'consumer' | 'target'>;
};

/** Resolves `true` when the request was sent, and `false` when it was not. */
export type PromotionOwnerRequester = (request: PromotionOwnerRequest) => Promise<boolean>;
