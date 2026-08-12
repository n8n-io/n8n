import { ModuleRegistry } from '@n8n/backend-common';
import {
	CredentialsRepository,
	WorkflowRepository,
	type CredentialsEntity,
	type WorkflowEntity,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { OperationalError, STICKY_NODE_TYPE, UserError, type INode } from 'n8n-workflow';
import { z } from 'zod';

import type { DataTable } from '@/modules/data-table/data-table.entity';

import type {
	ConnectorSyncContext,
	ConnectorSyncResult,
	KnowledgeConnector,
	KnowledgeDocumentDraft,
} from './connector.types';
import type { KnowledgeSourceType } from '../knowledge.constants';

/** Rows read per round trip. Instance metadata is small enough that a page fits comfortably in memory. */
const BATCH_SIZE = 100;

const configSchema = z.object({
	includeWorkflows: z.boolean().default(true),
	includeDataTables: z.boolean().default(true),
	includeCredentials: z.boolean().default(true),
});

export type N8nConnectorConfig = {
	includeWorkflows: boolean;
	includeDataTables: boolean;
	includeCredentials: boolean;
};

/**
 * Indexes the instance's own metadata - workflows, data tables and credentials -
 * so an agent can answer "what exists on this n8n instance?".
 *
 * Only metadata is emitted, never anything that can carry a secret: credential
 * `data` is never read, and node `parameters` are never emitted. The single
 * exception is a sticky note's `content`, which is user-authored documentation.
 */
@Service()
export class N8nKnowledgeConnector implements KnowledgeConnector {
	readonly type: KnowledgeSourceType = 'n8n';

	readonly requiresCredential = false;

	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
	) {}

	parseConfig(config: unknown): N8nConnectorConfig {
		const parsed = configSchema.safeParse(config ?? {});

		if (!parsed.success) {
			const issues = parsed.error.issues
				.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
				.join('; ');

			throw new UserError(`Invalid configuration for the n8n knowledge source: ${issues}`);
		}

		return parsed.data;
	}

	async *sync(
		ctx: ConnectorSyncContext,
	): AsyncGenerator<KnowledgeDocumentDraft, ConnectorSyncResult> {
		const config = this.parseConfig(ctx.source.config);
		const since = parseSince(ctx.checkpoint);
		const startedAt = new Date();

		ctx.logger.debug('Syncing n8n instance metadata', {
			sourceId: ctx.source.id,
			since: since?.toISOString() ?? null,
		});

		const streams: Array<AsyncGenerator<KnowledgeDocumentDraft>> = [];
		if (config.includeWorkflows) streams.push(this.workflowDocuments(ctx, since));
		if (config.includeDataTables) streams.push(this.dataTableDocuments(ctx, since));
		if (config.includeCredentials) streams.push(this.credentialDocuments(ctx, since));

		let maxUpdatedAt = since;

		for (const stream of streams) {
			for await (const draft of stream) {
				const { sourceUpdatedAt } = draft;
				if (sourceUpdatedAt && (maxUpdatedAt === null || sourceUpdatedAt > maxUpdatedAt)) {
					maxUpdatedAt = sourceUpdatedAt;
				}

				yield draft;
			}
		}

		// Falling back to the sync start (rather than the epoch) keeps the next
		// incremental run cheap on an instance that has nothing to index yet.
		return { checkpoint: { since: (maxUpdatedAt ?? startedAt).toISOString() } };
	}

	async listExternalIds(ctx: ConnectorSyncContext): Promise<string[]> {
		const config = this.parseConfig(ctx.source.config);
		const externalIds: string[] = [];

		if (config.includeWorkflows) {
			externalIds.push(
				...(await this.collectIds(
					ctx,
					'workflow',
					async (skip) =>
						await this.workflowRepository.find({
							select: ['id'],
							order: { id: 'ASC' },
							take: BATCH_SIZE,
							skip,
						}),
				)),
			);
		}

		if (config.includeDataTables) {
			const repository = await this.dataTableRepository();

			if (repository) {
				externalIds.push(
					...(await this.collectIds(
						ctx,
						'dataTable',
						async (skip) =>
							await repository.find({
								select: ['id'],
								order: { id: 'ASC' },
								take: BATCH_SIZE,
								skip,
							}),
					)),
				);
			}
		}

		if (config.includeCredentials) {
			externalIds.push(
				...(await this.collectIds(
					ctx,
					'credential',
					async (skip) =>
						await this.credentialsRepository.find({
							select: ['id'],
							order: { id: 'ASC' },
							take: BATCH_SIZE,
							skip,
						}),
				)),
			);
		}

		return externalIds;
	}

	private async *workflowDocuments(ctx: ConnectorSyncContext, since: Date | null) {
		const pages = this.paginate(
			ctx,
			async (skip) =>
				await this.workflowRepository.find({
					// `nodes` is needed for the inventory; `connections`, `pinData` and
					// `staticData` are deliberately left unread - they are large and can carry PII.
					select: ['id', 'name', 'activeVersionId', 'nodes', 'updatedAt'],
					relations: { tags: true },
					order: { id: 'ASC' },
					take: BATCH_SIZE,
					skip,
				}),
		);

		for await (const page of pages) {
			for (const workflow of page) {
				if (isUnchanged(workflow.updatedAt, since)) continue;

				yield workflowDraft(workflow);
			}
		}
	}

	private async *dataTableDocuments(ctx: ConnectorSyncContext, since: Date | null) {
		const repository = await this.dataTableRepository();

		if (!repository) {
			ctx.logger.debug('Skipping data tables, the data-table module is not active');
			return;
		}

		const pages = this.paginate(
			ctx,
			async (skip) =>
				await repository.find({
					select: ['id', 'name', 'projectId', 'updatedAt'],
					relations: { columns: true },
					order: { id: 'ASC' },
					take: BATCH_SIZE,
					skip,
				}),
		);

		for await (const page of pages) {
			for (const dataTable of page) {
				if (isUnchanged(dataTable.updatedAt, since)) continue;

				yield dataTableDraft(dataTable);
			}
		}
	}

	private async *credentialDocuments(ctx: ConnectorSyncContext, since: Date | null) {
		const pages = this.paginate(
			ctx,
			async (skip) =>
				await this.credentialsRepository.find({
					// `data` (the encrypted blob) must never be read, let alone indexed.
					select: ['id', 'name', 'type', 'updatedAt'],
					order: { id: 'ASC' },
					take: BATCH_SIZE,
					skip,
				}),
		);

		for await (const page of pages) {
			for (const credential of page) {
				if (isUnchanged(credential.updatedAt, since)) continue;

				yield credentialDraft(credential);
			}
		}
	}

	/**
	 * Data table entities belong to the separately-enableable `data-table` module,
	 * so the repository is resolved lazily and only while that module is active -
	 * constructor-injecting it would break every instance running without it.
	 */
	private async dataTableRepository() {
		if (!Container.get(ModuleRegistry).isActive('data-table')) return null;

		const { DataTableRepository } = await import('@/modules/data-table/data-table.repository.js');

		return Container.get(DataTableRepository);
	}

	/** Reads `find` page by page until it returns a short page, checking the abort signal between pages. */
	private async *paginate<T>(
		ctx: ConnectorSyncContext,
		find: (skip: number) => Promise<T[]>,
	): AsyncGenerator<T[]> {
		for (let skip = 0; ; skip += BATCH_SIZE) {
			if (ctx.abortSignal?.aborted) {
				throw new OperationalError('n8n knowledge sync was aborted');
			}

			const page = await find(skip);
			if (page.length > 0) yield page;
			if (page.length < BATCH_SIZE) return;
		}
	}

	private async collectIds(
		ctx: ConnectorSyncContext,
		prefix: string,
		find: (skip: number) => Promise<Array<{ id: string }>>,
	): Promise<string[]> {
		const externalIds: string[] = [];

		for await (const page of this.paginate(ctx, find)) {
			externalIds.push(...page.map(({ id }) => `${prefix}:${id}`));
		}

		return externalIds;
	}
}

function parseSince(checkpoint: Record<string, unknown> | null): Date | null {
	const since = checkpoint?.since;
	if (typeof since !== 'string') return null;

	const parsed = new Date(since);

	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isUnchanged(updatedAt: Date | undefined, since: Date | null): boolean {
	return since !== null && updatedAt !== undefined && updatedAt <= since;
}

/** Sticky notes are the one node whose parameters are documentation rather than configuration. */
function stickyNoteContent(node: INode): string | null {
	if (node.type !== STICKY_NODE_TYPE) return null;

	const content = node.parameters?.content;

	return typeof content === 'string' && content.trim().length > 0 ? content.trim() : null;
}

function workflowDraft(workflow: WorkflowEntity): KnowledgeDocumentDraft {
	const inventory: string[] = [];
	const notes: string[] = [];

	for (const node of workflow.nodes ?? []) {
		const note = stickyNoteContent(node);

		if (note !== null) notes.push(`- ${note}`);
		else inventory.push(`- ${node.name} (${node.type})`);
	}

	const active = (workflow.activeVersionId ?? null) !== null;
	const tags = (workflow.tags ?? []).map((tag) => tag.name);

	const lines = [`Workflow "${workflow.name}"`, `Status: ${active ? 'active' : 'inactive'}`];
	if (tags.length > 0) lines.push(`Tags: ${tags.join(', ')}`);
	if (inventory.length > 0) lines.push('Nodes:', ...inventory);
	if (notes.length > 0) lines.push('Notes:', ...notes);

	return {
		externalId: `workflow:${workflow.id}`,
		title: workflow.name,
		url: `/workflow/${workflow.id}`,
		text: lines.join('\n'),
		metadata: {
			kind: 'workflow',
			workflowId: workflow.id,
			active,
			// Sticky notes are documentation, not steps, so they are not counted as nodes.
			nodeCount: inventory.length,
		},
		sourceUpdatedAt: workflow.updatedAt,
	};
}

function dataTableDraft(dataTable: DataTable): KnowledgeDocumentDraft {
	const columns = [...(dataTable.columns ?? [])].sort((a, b) => a.index - b.index);

	const lines = [`Data table "${dataTable.name}"`, `Project: ${dataTable.projectId}`];
	if (columns.length > 0) {
		lines.push('Columns:', ...columns.map((column) => `- ${column.name} (${column.type})`));
	}

	return {
		externalId: `dataTable:${dataTable.id}`,
		title: dataTable.name,
		text: lines.join('\n'),
		metadata: {
			kind: 'dataTable',
			dataTableId: dataTable.id,
			projectId: dataTable.projectId,
		},
		sourceUpdatedAt: dataTable.updatedAt,
	};
}

function credentialDraft(credential: CredentialsEntity): KnowledgeDocumentDraft {
	return {
		externalId: `credential:${credential.id}`,
		title: credential.name,
		text: `Credential "${credential.name}" of type "${credential.type}" is available on this instance.`,
		metadata: {
			kind: 'credential',
			credentialId: credential.id,
			credentialType: credential.type,
		},
		sourceUpdatedAt: credential.updatedAt,
	};
}
