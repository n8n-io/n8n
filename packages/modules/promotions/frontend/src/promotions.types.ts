import type {
	ApplyPackageResultDto,
	PromotionBindingConsumer,
	PromotionPreviewCheck,
	PromotionVariableScope,
} from '@n8n/api-types';

/**
 * A dependency that the destination lacks and the user cannot create, because it belongs to a
 * project that the user cannot access. It never blocks the operation. The backend does not send
 * these yet: design previews fill them in.
 */
export type PromotionOutsideAccessDependency = {
	kind: 'credential' | 'variable' | 'workflow';
	name: string;
	/** The workflows that use it, so the row can link to them. */
	consumers: PromotionBindingConsumer[];
};

export type ApplyCheckResult = Pick<ApplyPackageResultDto, 'environmentId' | 'git'> &
	PromotionPreviewCheck & {
		/** Dependencies outside the access of the user. Empty or absent when there are none. */
		outsideAccess?: PromotionOutsideAccessDependency[];
	};

export type BlockedApplyResult = Extract<ApplyPackageResultDto, { status: 'blocked' }>;
export type AppliedResult = Extract<ApplyPackageResultDto, { status: 'applied' }>;
export type SourceChangedResult = Extract<ApplyPackageResultDto, { status: 'source-changed' }>;
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
