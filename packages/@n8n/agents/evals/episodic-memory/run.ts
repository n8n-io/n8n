#!/usr/bin/env tsx
import { resolve } from 'node:path';

import { runEpisodicMemoryEval } from './runner';
import type { EpisodicEvalLogEvent } from './types';

interface CliOptions {
	preset: 'smoke' | 'golden';
	outputDir: string;
	model: string;
	judgeEnabled: boolean;
	judgeModel: string;
	verbose: boolean;
}

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));
	const artifacts = await runEpisodicMemoryEval({
		...options,
		log: options.verbose ? writeLogEvent : undefined,
	});
	const scorecard = artifacts.scorecard;
	process.stdout.write(
		`Episodic memory eval complete: ${options.outputDir}\n${JSON.stringify(scorecard, null, 2)}\n`,
	);
}

function writeLogEvent(event: EpisodicEvalLogEvent): void {
	const prefix = event.scenarioId ? `[${event.phase}:${event.scenarioId}]` : `[${event.phase}]`;
	const details = event.details ? ` ${JSON.stringify(event.details)}` : '';
	process.stderr.write(`${prefix} ${event.message}${details}\n`);
}

function parseArgs(args: string[]): CliOptions {
	const values = new Map<string, string>();
	for (let index = 0; index < args.length; index++) {
		const arg = args[index];
		if (!arg.startsWith('--')) continue;
		const key = arg.slice(2);
		const next = args[index + 1];
		if (!next || next.startsWith('--')) {
			values.set(key, 'true');
			continue;
		}
		values.set(key, next);
		index++;
	}

	const preset = values.get('preset') ?? 'smoke';
	if (preset !== 'smoke' && preset !== 'golden') {
		throw new Error('--preset must be smoke or golden');
	}

	return {
		preset,
		outputDir: resolve(values.get('out') ?? `episodic-memory-eval-${preset}`),
		model: values.get('model') ?? process.env.EM_EVAL_MODEL ?? 'openai/gpt-5.5',
		judgeEnabled:
			values.get('judge') === 'true' ||
			process.env.EM_EVAL_JUDGE === '1' ||
			process.env.EM_EVAL_JUDGE === 'true',
		judgeModel:
			values.get('judge-model') ??
			process.env.EM_EVAL_JUDGE_MODEL ??
			process.env.EM_EVAL_MODEL ??
			'openai/gpt-5.5',
		verbose: values.get('quiet') !== 'true',
	};
}

void main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`Episodic memory eval failed: ${message}\n`);
	process.exitCode = 1;
});
