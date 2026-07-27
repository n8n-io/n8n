import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { IDataObject, JsonObject } from 'n8n-workflow';

import { AgentEvalResult } from '../entities';

type CreateAgentEvalResultAttrs = {
	runId: string;
	sourceRowId?: string | null;
	runIndex?: number | null;
	input?: JsonObject | null;
};

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

		return await this.save(results);
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
}
