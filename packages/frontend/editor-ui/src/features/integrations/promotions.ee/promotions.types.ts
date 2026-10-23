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

export type CreatedPromotionProject = { id: string; name: string };

// Resolve after the editor closes. Return null on cancellation. Save errors keep the editor open.
// Report a setup error, then reject.
export type CreatePromotionBinding = (
	binding: MissingPromotionBinding,
) => Promise<CreatedPromotionBinding | null>;
