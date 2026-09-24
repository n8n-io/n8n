import type { ApplyPackageResultDto, PromotionVariableScope } from '@n8n/api-types';

export type BlockedApplyResult = Extract<ApplyPackageResultDto, { status: 'blocked' }>;
export type AppliedResult = Extract<ApplyPackageResultDto, { status: 'applied' }>;
export type SourceChangedResult = Extract<ApplyPackageResultDto, { status: 'source-changed' }>;
export type MissingPromotionBinding = BlockedApplyResult['preflight']['missingBindings'][number];

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

// Resolve after the editor closes. Return null on cancellation. Report a failure, then reject.
export type CreatePromotionBinding = (
	binding: MissingPromotionBinding,
) => Promise<CreatedPromotionBinding | null>;
