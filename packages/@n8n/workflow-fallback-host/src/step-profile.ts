/**
 * An optional profile of the steps that a worker runs, for benchmarks.
 *
 * Set `WF_FALLBACK_STEP_PROFILE` to a folder. Each worker then writes one
 * JSON line for each step to `<folder>/steps-<pid>.jsonl`:
 *
 *   { "t": <end, ms since epoch>, "kind": "node" | "code", "type", "resource",
 *     "operation", "cpu": <µs>, "wall": <µs>, "overlap": <bool> }
 *
 * `cpu` is the CPU time (user and system) of the worker process from the
 * step message to the result message, serialization included. A worker runs
 * many steps at a time, so when other steps ran in the same worker during
 * the step, `overlap` is true and `cpu` includes some of their CPU. Run the
 * benchmark with one run in flight to get clean values.
 *
 * The profile does not change what a step does. Without the variable, the
 * worker does not create a profiler.
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import type { StepRequest } from './protocol';

export const STEP_PROFILE_ENV = 'WF_FALLBACK_STEP_PROFILE';

/** Lines kept before a write. */
const FLUSH_LINES = 256;

const FLUSH_EVERY_MS = 1000;

export interface StepMark {
	cpu: NodeJS.CpuUsage;
	wall: bigint;
	overlap: boolean;
}

export interface StepProfiler {
	start(): StepMark;
	end(mark: StepMark, request: StepRequest): void;
	/** Forgets a mark without a line: the step did not run. */
	drop(mark: StepMark): void;
	flush(): void;
}

export interface StepKey {
	kind: string;
	type: string;
	resource: string;
	operation: string;
}

/** The node type, resource and operation of a step, for the profile. */
export function stepKey(request: StepRequest): StepKey {
	const args = request.args;
	if (request.kind === 'code') {
		const language = typeof args.language === 'string' ? args.language : 'javaScript';
		const mode = typeof args.mode === 'string' ? args.mode : '';
		return { kind: 'code', type: `code:${language}`, resource: '', operation: mode };
	}
	const type = typeof args.type === 'string' ? args.type : '';
	const parameters =
		typeof args.parameters === 'object' &&
		args.parameters !== null &&
		!Array.isArray(args.parameters)
			? args.parameters
			: {};
	const text = (value: unknown) => (typeof value === 'string' ? value : '');
	return {
		kind: 'node',
		type,
		resource: text(parameters.resource),
		operation: text(parameters.operation) || text(parameters.mode),
	};
}

export function createStepProfiler(folder: string | undefined): StepProfiler | undefined {
	if (!folder) return undefined;
	mkdirSync(folder, { recursive: true });
	const file = join(folder, `steps-${process.pid}.jsonl`);
	const active = new Set<StepMark>();
	let lines: string[] = [];

	const flush = () => {
		if (lines.length === 0) return;
		const text = lines.join('');
		lines = [];
		appendFileSync(file, text);
	};
	setInterval(flush, FLUSH_EVERY_MS).unref();

	return {
		start() {
			const mark: StepMark = {
				cpu: process.cpuUsage(),
				wall: process.hrtime.bigint(),
				overlap: active.size > 0,
			};
			for (const other of active) other.overlap = true;
			active.add(mark);
			return mark;
		},
		end(mark, request) {
			const cpu = process.cpuUsage(mark.cpu);
			const wall = Number((process.hrtime.bigint() - mark.wall) / 1000n);
			active.delete(mark);
			lines.push(
				`${JSON.stringify({
					t: Date.now(),
					...stepKey(request),
					cpu: cpu.user + cpu.system,
					wall,
					overlap: mark.overlap,
				})}\n`,
			);
			if (lines.length >= FLUSH_LINES) flush();
		},
		drop(mark) {
			active.delete(mark);
		},
		flush,
	};
}
