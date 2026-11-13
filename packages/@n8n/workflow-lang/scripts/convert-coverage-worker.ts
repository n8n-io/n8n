/**
 * Worker of `convert-coverage.ts`: runs one converted workflow on the
 * reference runner (smoke run), and optionally n8n's engine (oracle run).
 * The parent ends a worker that takes too long, so an endless loop in a
 * workflow cannot stop the report.
 */
import { parentPort } from 'node:worker_threads';

import type { TriggerChoice } from '../src/convert/__tests__/behaviour/compare.ts';
import {
	compareWithOracle,
	settle,
	smokeResolver,
} from '../src/convert/__tests__/behaviour/compare.ts';
import type { OracleWorkflow } from '../src/convert/__tests__/behaviour/oracle-engine.ts';

export interface WorkerTask {
	id: number;
	kind: 'smoke' | 'oracle';
	source: string;
	trigger: TriggerChoice;
	workflow?: OracleWorkflow;
	/** Workflows that sub-workflow calls can reach, by id. */
	callees?: Record<string, unknown>;
}

export interface WorkerResult {
	id: number;
	status?: string;
	error?: { name?: string; message?: string };
	settled?: boolean;
	oracleError?: string | null;
	mismatches?: Array<{ node: string; expected: unknown; actual: unknown }>;
	crash?: string;
}

function errorOf(result: unknown): { name?: string; message?: string } | undefined {
	if (typeof result !== 'object' || result === null) return undefined;
	const name = Reflect.get(result, 'name');
	const message = Reflect.get(result, 'message');
	return {
		name: typeof name === 'string' ? name : undefined,
		message: typeof message === 'string' ? message.slice(0, 200) : undefined,
	};
}

parentPort?.on('message', (task: WorkerTask) => {
	void (async () => {
		const reply: WorkerResult = { id: task.id };
		try {
			if (task.kind === 'smoke') {
				const { out, settled } = await settle(
					task.source,
					task.trigger.fixture,
					smokeResolver,
					150,
				);
				reply.status = out.status;
				reply.settled = settled;
				if (out.status !== 'ok') reply.error = errorOf(out.result);
			} else if (task.workflow) {
				const callees = task.callees ?? {};
				const c = await compareWithOracle(
					task.workflow,
					task.source,
					task.trigger,
					(id) => callees[id],
				);
				reply.status = c.converted.status;
				if (c.converted.status !== 'ok') reply.error = errorOf(c.converted.result);
				reply.oracleError = c.oracle.error;
				reply.mismatches = c.mismatches.map((m) => ({
					node: m.node,
					expected: m.expected,
					actual: m.actual,
				}));
			}
		} catch (e) {
			reply.crash = e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 300) : String(e);
		}
		parentPort?.postMessage(reply);
	})();
});
