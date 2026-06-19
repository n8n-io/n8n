import { z } from 'zod';

import { Z } from '../../zod-class';

export class PromotionReviewPlanRequestDto extends Z.class({
	projectId: z.string().optional(),
	credentialBindings: z.record(z.string(), z.string()).optional(),
}) {}

export class PromotionReviewCredentialsQueryDto extends Z.class({
	projectId: z.string().optional(),
	type: z.string().optional(),
}) {}

export type PromotionBlockingIssue =
	| {
			type: 'workflow-conflict';
			sourceWorkflowId: string;
			existingWorkflowId: string;
			name: string;
	  }
	| {
			type: 'workflow-id-conflict';
			sourceWorkflowId: string;
			existingWorkflowId: string;
			existingProjectId: string | null;
			isArchived: boolean;
			name: string;
	  }
	| {
			type: 'workflow-folder-conflict';
			sourceWorkflowId: string;
			existingWorkflowId: string;
			existingParentFolderId: string | null;
			targetFolderId: string;
			name: string;
	  }
	| {
			type: 'credential-unresolved';
			kind: 'not_found' | 'unknown_type' | 'source_not_found' | 'type_mismatch';
			sourceId: string;
			targetId?: string;
			expectedType?: string;
			actualType?: string;
			usedByWorkflows: string[];
	  };

export interface PromotionWorkflowPlanItem {
	sourceWorkflowId: string;
	name: string;
	action: 'create' | 'update' | 'skip';
	sourcePublished: boolean;
	existingWorkflowId?: string;
	decidedId?: string;
}

export interface PromotionCredentialRequirement {
	id: string;
	name: string;
	type: string;
	usedByWorkflows: string[];
}

export interface PromotionReviewPlanPackage {
	sourceN8nVersion: string;
	sourceId: string;
	exportedAt: string;
	sourceInstanceName: string;
	sourceBranch: string;
}

export interface PromotionWorkflowDiffSnapshot {
	id: string;
	name: string;
	versionId: string;
	nodes: unknown[];
	connections: Record<string, unknown>;
}

export interface PromotionWorkflowDiff {
	sourceWorkflowId: string;
	name: string;
	before: PromotionWorkflowDiffSnapshot;
	after: PromotionWorkflowDiffSnapshot;
}

export interface PromotionReviewPlanResponse {
	package: PromotionReviewPlanPackage;
	targetProjectId: string;
	workflows: PromotionWorkflowPlanItem[];
	workflowDiffs: PromotionWorkflowDiff[];
	credentialRequirements: PromotionCredentialRequirement[];
	resolvedCredentialBindings: Record<string, string>;
	blockingIssues: PromotionBlockingIssue[];
	canApply: boolean;
}

export interface PromotionReviewSummary {
	id: string;
	title: string;
	sourceInstanceName: string;
	sourceBranch: string;
	submittedAt: string;
	submittedBy: string;
	workflowCount: number;
	status: 'pending' | 'approved' | 'rejected';
	hasBlockers: boolean;
}

export interface PromotionTargetCredential {
	id: string;
	name: string;
	type: string;
}
