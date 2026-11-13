/**
 * `wfc convert <workflow.json> [-o <file.ts>]`: converts n8n workflow JSON to
 * workflow-language source. It writes the source to the file (or to standard
 * output) and the diagnostics to standard error. The exit code is 1 when a
 * diagnostic is an error.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

import { convertWorkflow, formatConvertDiagnostic } from './index.ts';

export function runConvert(args: string[]): number {
	const file = args[0];
	const oi = args.indexOf('-o');
	const out = oi >= 0 ? args[oi + 1] : undefined;
	if (!file || (oi >= 0 && !out)) {
		process.stderr.write('usage: wfc convert <workflow.json> [-o <file.ts>]\n');
		return 2;
	}
	const input: unknown = JSON.parse(readFileSync(file, 'utf8'));
	const result = convertWorkflow(input, { name: basename(file).replace(/\.json$/, '') });
	for (const d of result.diagnostics) process.stderr.write(`${formatConvertDiagnostic(d)}\n`);
	if (result.source !== '') {
		if (out) writeFileSync(out, result.source);
		else process.stdout.write(result.source);
	}
	if (result.fallbackNodes.length > 0) {
		process.stderr.write(`fallback host: ${result.fallbackNodes.join(', ')}\n`);
	}
	return result.ok ? 0 : 1;
}
