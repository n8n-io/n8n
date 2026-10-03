// ---------------------------------------------------------------------------
// Writes the `--json-out` results file. The file is rewritten after every
// finished case, so an interrupted run still leaves the cases it finished.
// ---------------------------------------------------------------------------

import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { buildRoutingTrialRecord } from './routing-trial';
import type { DiscoveryRunResult } from './runner';
import type { RoutingCaseResult, RoutingResultsFile } from './types';
import type { RoutingCase } from '../routing/loader';

export type RoutingResultsMeta = Omit<RoutingResultsFile, 'finishedAt' | 'complete' | 'cases'>;

export function toRoutingCaseResult(
	scenario: { id: string; userMessage: string },
	routingCase: RoutingCase | undefined,
	results: DiscoveryRunResult[],
): RoutingCaseResult {
	return {
		id: scenario.id,
		...(routingCase
			? {
					bucket: routingCase.bucket,
					accepts: routingCase.accepts,
					policyDependent: routingCase.policyDependent ?? false,
				}
			: {}),
		userMessage: scenario.userMessage,
		trials: results.map((result, index) =>
			buildRoutingTrialRecord({
				trial: index + 1,
				events: result.instanceEvents,
				durationMs: result.durationMs,
				streamStatus: result.streamStatus,
				...(result.stop ? { stop: result.stop } : {}),
				...(result.usage ? { usage: result.usage } : {}),
				...(result.runError ? { runError: result.runError } : {}),
			}),
		),
	};
}

export class RoutingResultsWriter {
	readonly filePath: string;

	private readonly cases: Array<RoutingCaseResult | undefined>;

	/** Serializes writes: cases that finish together must not race on the temp file. */
	private pending: Promise<void> = Promise.resolve();

	constructor(
		filePath: string,
		private readonly meta: RoutingResultsMeta,
		caseCount: number,
	) {
		this.filePath = resolve(filePath);
		this.cases = new Array<RoutingCaseResult | undefined>(caseCount);
	}

	/** Records a finished case at its load-order position and rewrites the file. */
	async record(index: number, result: RoutingCaseResult): Promise<void> {
		this.cases[index] = result;
		await this.enqueueWrite(false);
	}

	async finish(): Promise<void> {
		await this.enqueueWrite(true);
	}

	private async enqueueWrite(complete: boolean): Promise<void> {
		// A failed write must not block later ones; the caller still sees its own failure.
		this.pending = this.pending.catch(() => {}).then(async () => await this.write(complete));
		await this.pending;
	}

	private async write(complete: boolean): Promise<void> {
		const file: RoutingResultsFile = {
			...this.meta,
			finishedAt: new Date().toISOString(),
			complete,
			cases: this.cases.filter((c): c is RoutingCaseResult => c !== undefined),
		};
		await mkdir(dirname(this.filePath), { recursive: true });
		const tmpPath = `${this.filePath}.tmp`;
		await writeFile(tmpPath, JSON.stringify(file, null, 2) + '\n', 'utf-8');
		await rename(tmpPath, this.filePath);
	}
}
