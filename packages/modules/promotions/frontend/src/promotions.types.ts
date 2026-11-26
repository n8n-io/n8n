import type {
	ApplyPackageResultDto,
	PromotePackageResultDto,
	PromotionPreviewCheck,
	PromotionVariableScope,
} from '@n8n/api-types';

export type ApplyCheckResult = Pick<ApplyPackageResultDto, 'environmentId' | 'git'> &
	PromotionPreviewCheck;

export type BlockedApplyResult = Extract<ApplyPackageResultDto, { status: 'blocked' }>;
export type AppliedResult = Extract<ApplyPackageResultDto, { status: 'applied' }>;
export type SourceChangedResult = Extract<ApplyPackageResultDto, { status: 'source-changed' }>;
/** A Promote that pushed. The other results of a Promote push nothing. */
export type PromotedResult = Extract<PromotePackageResultDto, { status: 'promoted' }>;
export type MissingPromotionBinding = BlockedApplyResult['check']['missingBindings'][number];

export type CreatedPromotionBinding =
	| {
			kind: 'credential';
			sourceId: string;
			id: string;
			name: string;
			credentialType: string;
			projectId: string;
	  }
	| {
			kind: 'variable';
			id: string;
			name: string;
			scope: PromotionVariableScope;
	  };

export type CreatedPromotionProject = { id: string; name: string };

// Resolve after the editor closes. Return null on cancellation. Save errors keep the editor open.
// Report a setup error, then reject.
export type CreatePromotionBinding = (
	binding: MissingPromotionBinding,
) => Promise<CreatedPromotionBinding | null>;
