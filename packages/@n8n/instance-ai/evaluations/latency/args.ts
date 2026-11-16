// ---------------------------------------------------------------------------
// CLI arguments for the first-build latency benchmark
// ---------------------------------------------------------------------------

import { z } from 'zod';

const runArgsSchema = z.object({
	mode: z.literal('run'),
	label: z.string({ required_error: '--label is required for a run' }).min(1),
	outDir: z.string().min(1).default('.output/latency'),
	repeat: z.coerce.number().int().min(1).default(4),
	baseUrl: z.string().url().default('http://localhost:5678'),
	timeoutMs: z.coerce.number().int().min(1).default(600_000),
});

const compareArgsSchema = z.object({
	mode: z.literal('compare'),
	fileA: z.string().min(1),
	fileB: z.string().min(1),
});

export type LatencyRunArgs = z.infer<typeof runArgsSchema>;
export type LatencyArgs = LatencyRunArgs | z.infer<typeof compareArgsSchema>;

const RUN_FLAGS: Record<string, keyof LatencyRunArgs> = {
	'--label': 'label',
	'--out': 'outDir',
	'--repeat': 'repeat',
	'--base-url': 'baseUrl',
	'--timeout-ms': 'timeoutMs',
};

export function parseLatencyArgs(argv: string[]): LatencyArgs {
	const compareAt = argv.indexOf('--compare');
	if (compareAt === -1) return runArgsSchema.parse({ mode: 'run', ...readRunFlags(argv) });
	const [fileA, fileB] = argv.slice(compareAt + 1);
	if (!fileA || !fileB)
		throw new Error('--compare needs two run files: --compare <a.jsonl> <b.jsonl>');
	return compareArgsSchema.parse({ mode: 'compare', fileA, fileB });
}

function readRunFlags(argv: string[]): Record<string, string> {
	const values: Record<string, string> = {};
	for (let i = 0; i < argv.length; i += 2) {
		const key = RUN_FLAGS[argv[i]];
		const value = argv[i + 1];
		if (!key || value === undefined) throw new Error(`Unknown or incomplete flag: ${argv[i]}`);
		values[key] = value;
	}
	return values;
}
