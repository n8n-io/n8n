import type {
	PromotionDependencyReport,
	PromotionGap,
	PromotionGapExit,
	PromotionGapGroup,
} from '@n8n/api-types';

import {
	ambiguousOwnerBlock,
	expressionNotes,
	gapId,
	ReportBuilder,
	toConsumer,
	Visibility,
	withIncompleteExit,
} from './dependency-check.shared';
import {
	targetKey,
	type PromoteCheckInput,
	type ReferenceFact,
	type SourceTargetFact,
} from './dependency-check.types';

/**
 * The Promote check. For each static reference of an item that the Promote writes, it asks the
 * questions in a fixed order:
 *
 * 1. Does the target work on the source? No: a warning. Unknown counts as working.
 * 2. Is the target in a personal project? Yes: a gap.
 * 3. Is the target a credential with the usage scope `instance`? Yes: a note.
 * 4. Is the target on the branch after this Promote? Yes: pass.
 * 5. Can the user include it? The answer gives the group and the exits of the gap.
 */
export function computePromoteReport(input: PromoteCheckInput): PromotionDependencyReport {
	const { allowIncomplete, branch, plan, sourceTargets } = input;
	const visibility = new Visibility(input.access);
	const report = new ReportBuilder();
	const deleted = new Set(plan.deletedWorkflows.map(({ id }) => id));

	const isWrittenCredential = (id: string) =>
		// A placeholder is never content, so a Promote never writes it.
		id in plan.writtenCredentials &&
		sourceTargets[targetKey('credential', id)]?.isPlaceholder !== true;

	/** The project folders that hold the credential after the Promote. A write moves the file. */
	const foldersAfter = (id: string): string[] =>
		isWrittenCredential(id) ? [plan.writtenCredentials[id]] : (branch.credentialFolders[id] ?? []);

	const onBranchAfter = ({ target }: ReferenceFact): boolean => {
		if (target.kind === 'credential') return foldersAfter(target.id).length > 0;
		if (deleted.has(target.id)) return false;
		return target.id in plan.writtenWorkflows || target.id in branch.workflows;
	};

	for (const reference of input.references) {
		const { consumer, target, usage } = reference;
		const key = targetKey(target.kind, target.id);
		const source = sourceTargets[key];
		const consumerRef = toConsumer(consumer);

		if (source && !worksOnSource(source, consumer.id)) {
			report.warnings.push({
				id: gapId(reference),
				consumer: consumerRef,
				// A broken reference shows only what the node holds.
				target: visibility.target(reference),
				usage,
				code: 'broken-on-source',
			});
			continue;
		}

		const shownTarget = visibility.target(reference, source);
		const gap = (
			group: PromotionGapGroup,
			exits: PromotionGapExit[],
			extra: Partial<PromotionGap> = {},
		) => {
			report.gaps.push({
				id: gapId(reference),
				consumer: consumerRef,
				target: shownTarget,
				usage,
				group,
				exits: withIncompleteExit(exits, allowIncomplete),
				...extra,
			});
		};

		if (source?.project?.kind === 'personal') {
			gap('personal', ['move-to-team-project']);
			continue;
		}

		if (target.kind === 'credential' && source?.usageScope === 'instance') {
			report.notes.push({
				consumer: consumerRef,
				target: visibility.target(reference),
				usage,
				code: 'instance-credential',
			});
			continue;
		}

		if (target.kind === 'credential' && foldersAfter(target.id).length > 1) {
			report.addHardBlock({
				...ambiguousOwnerBlock(visibility, shownTarget, foldersAfter(target.id), (projectId) =>
					projectOf(input, projectId),
				),
				consumer: consumerRef,
			});
			continue;
		}

		if (onBranchAfter(reference)) continue;

		const project = source?.project;
		const visible = visibility.canReadProject(project?.id);
		// The state and the review are information about the target, so they need access to it.
		const review = visible
			? input.openReviews.find(({ targetKeys }) => targetKeys.includes(key))
			: undefined;
		const state: Partial<PromotionGap> = visible
			? {
					state: review ? 'in-open-review' : 'not-on-branch',
					...(review && input.access.canReadReviews
						? {
								review: {
									reviewId: review.reviewId,
									...(review.webUrl ? { webUrl: review.webUrl } : {}),
								},
							}
						: {}),
				}
			: {};
		const reviewExit: PromotionGapExit[] = state.review ? ['open-review'] : [];

		if (!project) {
			gap('no-access', ['ask-owner']);
		} else if (!visibility.environmentCovers(project.id)) {
			gap('outside-environment', ['add-project'], state);
		} else if (visibility.canOperateProject(project.id) && source?.canRead) {
			const group = project.id === consumer.projectId ? 'same-project' : 'other-project';
			if (source.isPlaceholder) {
				gap(group, [], { ...state, detail: 'placeholder-on-source' });
			} else {
				gap(group, ['include', ...reviewExit], {
					...state,
					include: { projectId: project.id, resourceKey: key },
				});
			}
		} else if (visible) {
			gap('read-only-project', ['ask-owner', ...reviewExit], state);
		} else {
			gap('no-access', ['ask-owner']);
		}
	}

	report.notes.push(...expressionNotes(input.expressionReferences));

	return report.build(allowIncomplete, {
		grants: [],
		credentialMoves: [],
		deletionCallers: [],
		keptWorkflows: [],
		credentialHomeChoices: [],
	});
}

/** The target exists, is not archived, and the consumer can use it. Unknown counts as working. */
function worksOnSource(source: SourceTargetFact, consumerId: string): boolean {
	if (source.exists === false) return false;
	if (source.archived === true) return false;
	return source.usableBy[consumerId] !== false;
}

function projectOf(input: PromoteCheckInput, projectId: string) {
	return (
		input.access.projects[projectId] ??
		(input.branch.projects[projectId]
			? { id: projectId, name: input.branch.projects[projectId].name }
			: undefined)
	);
}
