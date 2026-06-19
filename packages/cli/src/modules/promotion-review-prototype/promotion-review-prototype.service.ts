import type { PromotionReviewPlanResponse } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { ImportPipeline } from '@/modules/n8n-packages/engine/import-pipeline';
import type { ImportPlanResult, ImportResult } from '@/modules/n8n-packages/n8n-packages.types';
import {
	WorkflowConflictPolicy,
	WorkflowIdPolicy,
	WorkflowPublishingPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';

import {
	buildPromotionPrototypePackageBuffer,
	getPromotionPrototypeWorkflowDiffs,
} from './promotion-review-package.builder';
import type { PromotionRecord, PromotionReviewSummary } from './promotion-review-prototype.types';

@Service()
export class PromotionReviewPrototypeService {
	private readonly promotions = new Map<string, PromotionRecord>();

	private packageBufferPromise: Promise<Buffer> | null = null;

	constructor(
		private readonly importPipeline: ImportPipeline,
		private readonly credentialsService: CredentialsService,
	) {}

	async ensureSeeded(): Promise<void> {
		if (this.promotions.size > 0) return;

		const packageBuffer = await this.getPackageBuffer();
		const submittedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

		const promotion: PromotionRecord = {
			id: 'promo-customer-onboarding-v2',
			title: 'Customer Onboarding v2',
			sourceInstanceName: 'n8n Dev',
			sourceBranch: 'main',
			submittedAt,
			submittedBy: 'alex@acme.com',
			status: 'pending',
			packageBuffer,
		};

		this.promotions.set(promotion.id, promotion);
	}

	async listPending(user: User): Promise<PromotionReviewSummary[]> {
		await this.ensureSeeded();

		const summaries: PromotionReviewSummary[] = [];
		for (const promotion of this.promotions.values()) {
			if (promotion.status !== 'pending') continue;
			summaries.push(await this.toSummary(user, promotion));
		}
		return summaries;
	}

	getPromotion(id: string): PromotionRecord {
		const promotion = this.promotions.get(id);
		if (!promotion) {
			throw new UnexpectedError(`Promotion not found: ${id}`);
		}
		return promotion;
	}

	async plan(
		user: User,
		promotionId: string,
		projectId: string | undefined,
		credentialBindings: Record<string, string>,
	): Promise<PromotionReviewPlanResponse> {
		const promotion = this.getPromotion(promotionId);
		const importPlan = await this.importPipeline.plan({
			user,
			projectId,
			packageBuffer: promotion.packageBuffer,
			credentialMatchingMode: 'id-only',
			credentialMissingMode: 'must-preexist',
			credentialBindings: new Map(Object.entries(credentialBindings)),
			workflowConflictPolicy: WorkflowConflictPolicy.NewVersion,
			workflowPublishingPolicy: WorkflowPublishingPolicy.MatchSource,
			workflowIdPolicy: WorkflowIdPolicy.New,
		});

		return this.toReviewPlanResponse(promotion, importPlan);
	}

	async approve(
		user: User,
		promotionId: string,
		projectId: string | undefined,
		credentialBindings: Record<string, string>,
	): Promise<ImportResult> {
		const plan = await this.plan(user, promotionId, projectId, credentialBindings);
		if (!plan.canApply) {
			throw new UnexpectedError('Cannot approve promotion while import plan has blocking issues');
		}

		const promotion = this.getPromotion(promotionId);
		const result = await this.importPipeline.run({
			user,
			projectId,
			packageBuffer: promotion.packageBuffer,
			credentialMatchingMode: 'id-only',
			credentialMissingMode: 'must-preexist',
			credentialBindings: new Map(Object.entries(credentialBindings)),
			workflowConflictPolicy: WorkflowConflictPolicy.NewVersion,
			workflowPublishingPolicy: WorkflowPublishingPolicy.MatchSource,
			workflowIdPolicy: WorkflowIdPolicy.New,
		});

		await this.resetPromotionForDemo(promotionId);

		return result;
	}

	reject(promotionId: string): void {
		const promotion = this.getPromotion(promotionId);
		promotion.status = 'rejected';
		this.promotions.set(promotionId, promotion);
	}

	async listUsableCredentials(user: User, projectId: string, credentialType?: string) {
		const credentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(user, {
			projectId,
		});

		return credentials
			.filter((credential) => !credentialType || credential.type === credentialType)
			.map((credential) => ({
				id: credential.id,
				name: credential.name,
				type: credential.type,
			}));
	}

	private async getPackageBuffer(): Promise<Buffer> {
		if (!this.packageBufferPromise) {
			this.packageBufferPromise = buildPromotionPrototypePackageBuffer();
		}
		return await this.packageBufferPromise;
	}

	private async toSummary(user: User, promotion: PromotionRecord): Promise<PromotionReviewSummary> {
		const plan = await this.plan(user, promotion.id, undefined, {});

		return {
			id: promotion.id,
			title: promotion.title,
			sourceInstanceName: promotion.sourceInstanceName,
			sourceBranch: promotion.sourceBranch,
			submittedAt: promotion.submittedAt,
			submittedBy: promotion.submittedBy,
			workflowCount: plan.workflows.length,
			status: promotion.status,
			hasBlockers: !plan.canApply,
		};
	}

	private toReviewPlanResponse(
		promotion: PromotionRecord,
		importPlan: ImportPlanResult,
	): PromotionReviewPlanResponse {
		return {
			...importPlan,
			package: {
				...importPlan.package,
				sourceInstanceName: promotion.sourceInstanceName,
				sourceBranch: promotion.sourceBranch,
			},
			workflowDiffs: getPromotionPrototypeWorkflowDiffs(),
		};
	}

	private async resetPromotionForDemo(promotionId: string): Promise<void> {
		const promotion = this.getPromotion(promotionId);
		this.packageBufferPromise = null;
		promotion.status = 'pending';
		promotion.submittedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
		promotion.packageBuffer = await this.getPackageBuffer();
		this.promotions.set(promotionId, promotion);
	}
}
