import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';

import { DeduplicationHelper } from '@/deduplication/deduplication-helper';

import { dataTableCallSchema } from '../engine-v2/engine-data-tables.contract';
import { EngineDataTablesService } from '../engine-v2/engine-data-tables.service';
import type { WfrtServiceEvent } from './compiled-engine.types';
import { MANUAL_WORKFLOW_SUFFIX } from './compiled-engine.types';
import { loadWorkflowLang } from './workflow-lang';
import { WfrtAdminClient } from './wfrt-admin.client';

/** The answer to a service call (spec section 9.9). */
export type ServiceAnswer =
	| { ok: true; result: unknown }
	| { ok: false; error: { message: string; description?: string } };

/** How long n8n keeps an answer, so that a call that `wfrt` sends again gets the same one. */
const ANSWER_TTL_MS = 10 * 60 * 1000;

/**
 * The backend of the service calls of compiled executions (spec section 9.9).
 * A `dataTable` call runs with the engine v2 data-table service: it resolves
 * the project of the workflow and checks access, as for a v1 execution. A
 * `deduplication` call runs with n8n's `DeduplicationHelper` on the
 * `processed_data` table, always for the workflow of the execution.
 *
 * `wfrt` sends a waiting call again when the event stream opens again. Each
 * answer is kept by call id and attempt, so a write that ran already is not
 * run twice.
 */
@Service()
export class CompiledServiceCalls {
	private readonly answers = new Map<string, { at: number; answer: Promise<ServiceAnswer> }>();

	constructor(
		private readonly client: WfrtAdminClient,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('compiled-engine');
	}

	/** Runs the call once for each call id and attempt, and sends the answer to `wfrt`. */
	async handle(event: WfrtServiceEvent): Promise<void> {
		const now = Date.now();
		for (const [key, entry] of this.answers) {
			if (now - entry.at > ANSWER_TTL_MS) this.answers.delete(key);
		}
		const key = `${event.callId}#${event.attempt}`;
		let entry = this.answers.get(key);
		if (!entry) {
			entry = { at: now, answer: this.run(event) };
			this.answers.set(key, entry);
		}
		const answer = await entry.answer;
		try {
			await this.client.answerService(event.callId, answer);
		} catch (error) {
			this.logger.warn('Could not answer a service call of wfrt', {
				callId: event.callId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/** Runs one call. Errors become `ok: false` answers; the step sees their message. */
	async run(event: WfrtServiceEvent): Promise<ServiceAnswer> {
		const args = isRecord(event.args) ? event.args : {};
		const workflowId = event.workflowId.endsWith(MANUAL_WORKFLOW_SUFFIX)
			? event.workflowId.slice(0, -MANUAL_WORKFLOW_SUFFIX.length)
			: event.workflowId;
		if (event.service === 'deduplication') {
			const { runDeduplicationCall } = await loadWorkflowLang();
			return await runDeduplicationCall(
				new DeduplicationHelper(),
				{ service: event.service, op: event.op, args },
				workflowId,
			);
		}
		if (event.service !== 'dataTable') {
			return { ok: false, error: { message: `Unknown service "${event.service}"` } };
		}
		const parsed = dataTableCallSchema.safeParse({ ...args, kind: event.op });
		if (!parsed.success) {
			return { ok: false, error: { message: `Invalid data table call "${event.op}"` } };
		}
		try {
			const outcome = await Container.get(EngineDataTablesService).call({
				execution: { executionId: event.executionId, workflowId },
				consumer: { nodeType: 'n8n-nodes-base.dataTable' },
				call: parsed.data,
			});
			if ('error' in outcome) {
				const { message, description } = outcome.error;
				return { ok: false, error: description ? { message, description } : { message } };
			}
			return { ok: true, result: outcome.data };
		} catch (error) {
			return {
				ok: false,
				error: { message: error instanceof Error ? error.message : String(error) },
			};
		}
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
