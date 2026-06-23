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

import { DirectDeployableFetcher } from './consuming/deployable-fetcher';
import { PromotionSourceConnectionService } from './consuming/source-connection.service';
import type { OutboxEntry } from './producing/promotion-producing.types';
import type {
	PromotionRecord,
	PromotionReviewSummary,
	PromotionStatus,
} from './promotion-review-prototype.types';

@Service()
export class PromotionReviewPrototypeService {
	private readonly promotions = new Map<string, PromotionRecord>();

	/** Consuming-side status overrides (approve/reject), so they survive a pull refresh. */
	private readonly localStatus = new Map<string, PromotionStatus>();

	/** Fetched deployable bytes, cached by content hash (deployables are immutable). */
	private readonly bufferCache = new Map<string, Buffer>();

	constructor(
		private readonly importPipeline: ImportPipeline,
		private readonly credentialsService: CredentialsService,
		private readonly sourceConnectionService: PromotionSourceConnectionService,
		private readonly fetcher: DirectDeployableFetcher,
	) {}
	async listPending(user: User): Promise<PromotionReviewSummary[]> {
		await this.refresh();

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
		const packageBuffer = await this.resolveBuffer(promotion);
		const importPlan = await this.importPipeline.plan({
			user,
			projectId,
			packageBuffer,
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
		if (! plan.canApply) {
			throw new UnexpectedError('Cannot approve promotion while import plan has blocking issues');
		}

		const promotion = this.getPromotion(promotionId);
		const packageBuffer = await this.resolveBuffer(promotion);
		const result = await this.importPipeline.run({
			user,
			projectId,
			packageBuffer,
			credentialMatchingMode: 'id-only',
			credentialMissingMode: 'must-preexist',
			credentialBindings: new Map(Object.entries(credentialBindings)),
			workflowConflictPolicy: WorkflowConflictPolicy.NewVersion,
			workflowPublishingPolicy: WorkflowPublishingPolicy.MatchSource,
			workflowIdPolicy: WorkflowIdPolicy.New,
		});

		this.localStatus.set(promotionId, 'approved');

		return result;
	}

	reject(promotionId: string): void {
		const promotion = this.getPromotion(promotionId);
		promotion.status = 'rejected';
		this.localStatus.set(promotionId, 'rejected');
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

	/** Pulls each configured source connection's outbox into the inbox. */
	private async refresh(): Promise<void> {
		const connections = await this.sourceConnectionService.list();
		this.promotions.clear();

		if (connections.length === 0) return;

		for (const connection of connections) {
			const resolved = await this.sourceConnectionService.resolve(connection.id);
			const outbox = await this.fetcher.listOutbox(resolved);
			for (const entry of outbox) {
				const record = this.toPulledRecord(connection.id, connection.name, entry);
				this.promotions.set(record.id, record);
			}
		}
	}

	private toPulledRecord(
		sourceConnectionId: string,
		sourceInstanceName: string,
		entry: OutboxEntry,
	): PromotionRecord {
		const { request } = entry;
		const status = this.localStatus.get(request.id) ?? mapRequestStatus(request.status);
		return {
			id: request.id,
			title: request.title,
			sourceInstanceName,
			sourceBranch: request.targetEnv,
			submittedAt: request.createdAt,
			submittedBy: request.createdBy,
			status,
			source: {
				kind: 'pulled',
				sourceConnectionId,
				deployableHash: request.deployableHash,
			},
		};
	}

	private async resolveBuffer(promotion: PromotionRecord): Promise<Buffer> {
		const { deployableHash, sourceConnectionId } = promotion.source;
		const cached = this.bufferCache.get(deployableHash);
		if (cached) return cached;

		const resolved = await this.sourceConnectionService.resolve(sourceConnectionId);
		const buffer = await this.fetcher.fetchDeployable(resolved, deployableHash);
		this.bufferCache.set(deployableHash, buffer);
		return buffer;
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
			hasBlockers: ! plan.canApply,
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
			workflowDiffs: [],
		};
	}
}

function mapRequestStatus(status: 'pending' | 'accepted' | 'rejected'): PromotionStatus {
	if (status === 'accepted') return 'approved';
	return status;
}
