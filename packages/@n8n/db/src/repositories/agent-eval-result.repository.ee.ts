import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { IDataObject, JsonObject } from 'n8n-workflow';

import { AgentEvalResult } from '../entities';
import type { AgentEvalResultStatus } from '../entities/agent-eval-result.ee';

type CreateAgentEvalResultAttrs = {
	runId: string;
	sourceRowId?: string | null;
	runIndex?: number | null;
	input?: JsonObject | null;
};

export type AgentEvalResultStatusCounts = Record<AgentEvalResultStatus, number>;

// Insert seeded rows in chunks so a large dataset stays under the driver's bound
// parameter limit (SQLite in particular).
const SEED_CHUNK_SIZE = 100;

@Service()
export class AgentEvalResultRepository extends Repository<AgentEvalResult> {
	constructor(dataSource: DataSource) {
		super(AgentEvalResult, dataSource.manager);
	}

	/**
	 * Seed one pending result per dataset row at run start, so the run detail
	 * view can list cases before each is executed.
	 */
	async seedResults(cases: CreateAgentEvalResultAttrs[]): Promise<AgentEvalResult[]> {
		const results = cases.map((c, index) =>
			this.create({
				status: 'new',
				runId: c.runId,
				sourceRowId: c.sourceRowId ?? null,
				// Fall back to the seed position so `findByRunId` (orders by
				// runIndex ASC) returns a stable order on every database. A null
				// runIndex would sort first on SQLite but last on Postgres.
				runIndex: c.runIndex ?? index,
				input: c.input ?? null,
			}),
		);

		return await this.save(results, { chunk: SEED_CHUNK_SIZE });
	}

	/**
	 * Per-status result counts for a run, computed in the database so callers
	 * (run aggregation, polled run summaries) never load the full result rows —
	 * including their `input`/`output`/`toolCalls` JSON — just to count them.
	 */
	async countByStatus(runId: string): Promise<AgentEvalResultStatusCounts> {
		const rows = await this.createQueryBuilder('result')
			.select('result.status', 'status')
			.addSelect('COUNT(*)', 'count')
			.where('result.runId = :runId', { runId })
			.groupBy('result.status')
			.getRawMany<{ status: AgentEvalResultStatus; count: string | number }>();

		const counts: AgentEvalResultStatusCounts = {
			new: 0,
			running: 0,
			success: 0,
			error: 0,
			cancelled: 0,
		};
		for (const row of rows) counts[row.status] = Number(row.count);
		return counts;
	}

	async markAsRunning(id: string) {
		return await this.update(id, { status: 'running', runAt: new Date() });
	}

	async markAsCancelled(id: string) {
		return await this.update(id, { status: 'cancelled', completedAt: new Date() });
	}

	async markAsCompleted(
		id: string,
		attrs: {
			output: JsonObject | null;
			toolCalls?: JsonObject | null;
			metrics?: IDataObject | null;
		},
	) {
		return await this.update(id, {
			status: 'success',
			completedAt: new Date(),
			output: attrs.output,
			toolCalls: attrs.toolCalls ?? null,
			metrics: attrs.metrics ?? null,
		});
	}

	async markAsError(id: string, errorCode: string, errorDetails?: IDataObject | null) {
		return await this.update(id, {
			status: 'error',
			completedAt: new Date(),
			errorCode,
			errorDetails: errorDetails ?? null,
		});
	}

	async findByRunId(runId: string): Promise<AgentEvalResult[]> {
		return await this.find({ where: { runId }, order: { runIndex: 'ASC' } });
	}

	async findById(id: string): Promise<AgentEvalResult | null> {
		return await this.findOneBy({ id });
	}
}
