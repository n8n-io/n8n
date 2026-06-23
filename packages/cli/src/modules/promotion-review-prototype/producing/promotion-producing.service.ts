import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import { createHash, randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { N8nPackageParser } from '@/modules/n8n-packages/engine/n8n-package-parser';
import { TarPackageReader } from '@/modules/n8n-packages/io/tar/tar-package-reader';
import { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';

import type {
	OutboxEntry,
	ProducingPromotionRequest,
	PromotionRequestStatus,
	StoredDeployable,
} from './promotion-producing.types';

/**
 * Producing-side role: turns selected workflows into an immutable deployable
 * (via the real package exporter), keeps it in memory, and exposes promotion
 * requests + deployable bytes for a consuming instance to pull. System of record
 * for the request and its (possibly-stale) status.
 */
@Service()
export class PromotionProducingService {
	private readonly deployables = new Map<string, StoredDeployable>();

	private readonly requests = new Map<string, ProducingPromotionRequest>();

	constructor(
		private readonly packagesService: N8nPackagesService,
		private readonly packageParser: N8nPackageParser,
		private readonly packageImportConfig: PackageImportConfig,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	/** Workflows the user can read on this instance (candidates for deployment). */
	async listProducibleWorkflows(user: User): Promise<Array<{ id: string; name: string }>> {
		const workflows = await this.workflowFinderService.findAllWorkflowsForUser(user, [
			'workflow:read',
		]);

		return workflows
			.filter((workflow) => !workflow.isArchived)
			.map((workflow) => ({ id: workflow.id, name: workflow.name }));
	}

	/** "Mark for deployment": build + freeze a deployable, create a promotion request. */
	async markForDeployment(
		user: User,
		workflowIds: string[],
		targetEnv: string,
		title?: string,
	): Promise<OutboxEntry> {
		const stream = await this.packagesService.exportWorkflows({ user, workflowIds });
		const buffer = await streamToBuffer(stream);
		const hash = createHash('sha256').update(buffer).digest('hex');

		const reader = new TarPackageReader(buffer, this.packageImportConfig);
		const manifest = await this.packageParser.getManifest(reader);

		const now = new Date().toISOString();
		this.deployables.set(hash, { hash, manifest, buffer, createdAt: now });

		const request: ProducingPromotionRequest = {
			id: randomUUID(),
			title: title ?? manifest.workflows?.[0]?.name ?? 'Promotion',
			targetEnv,
			deployableHash: hash,
			locator: { type: 'direct', deployableHash: hash },
			createdAt: now,
			createdBy: user.email ?? user.id,
			status: 'pending',
		};
		this.requests.set(request.id, request);

		return { request, manifest };
	}

	/** Intent + manifest for every promotion request — no workflow bytes. */
	listOutbox(): OutboxEntry[] {
		return [...this.requests.values()].map((request) => ({
			request,
			manifest: this.getDeployable(request.deployableHash).manifest,
		}));
	}

	/** The frozen deployable bytes, fetched on demand by the consuming instance. */
	getDeployableBytes(hash: string): Buffer {
		return this.getDeployable(hash).buffer;
	}

	/** Optional status callback target (consuming → producing). */
	setRequestStatus(requestId: string, status: PromotionRequestStatus): void {
		const request = this.requests.get(requestId);
		if (!request) throw new NotFoundError(`Promotion request not found: ${requestId}`);
		request.status = status;
		this.requests.set(requestId, request);
	}

	private getDeployable(hash: string): StoredDeployable {
		const deployable = this.deployables.get(hash);
		if (!deployable) throw new NotFoundError(`Deployable not found: ${hash}`);
		return deployable;
	}
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
	}
	if (chunks.length === 0) {
		throw new UnexpectedError('Export produced an empty deployable');
	}
	return Buffer.concat(chunks);
}
