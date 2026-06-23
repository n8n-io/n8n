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

/** A workflow on the producing instance that can be marked for deployment. */
export interface PromotionProducibleWorkflow {
	id: string;
	name: string;
}

/** Result of marking workflows for deployment on the producing instance. */
export interface PromotionMarkForDeploymentResult {
	request: {
		id: string;
		title: string;
		targetEnv: string;
		deployableHash: string;
		createdAt: string;
	};
}

/** A producing instance the consuming side pulls promotions from (no secrets). */
export interface PromotionSourceConnection {
	id: string;
	name: string;
	baseUrl: string;
	createdAt: string;
}

export class AddPromotionSourceConnectionDto extends Z.class({
	name: z.string().min(1),
	baseUrl: z.string().url(),
	apiKey: z.string().min(1),
}) {}
export class PromotionMarkForDeploymentRequestDto extends Z.class({
	workflowIds: z.array(z.string().min(1)).min(1),
	targetEnv: z.string().min(1),
	title: z.string().optional(),
}) {}
