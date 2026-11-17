export { computeApplyOutcome, computeApplyReport } from './apply-report';
export type { BranchPackageInput } from './branch-facts.reader';
export type * from './dependency-check.types';
export {
	describeGap,
	describeGapWithFix,
	describeHardBlock,
	renderGapsForCommitMessage,
	renderGapsForReviewDescription,
	requirementReasons,
	verifyConfirmedGaps,
} from './gap-confirmation';
export type { CheckSelection } from './promote-check-facts.service';
export { computePromoteReport } from './promote-report';
export {
	PromotionDependencyCheckService,
	type ApplyCheckArgs,
	type PromoteCheckArgs,
} from './promotion-dependency-check.service';
