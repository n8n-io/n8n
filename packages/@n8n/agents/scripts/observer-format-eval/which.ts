// Lists stored outputs that the current parser still rejects, with the offending lines.
import { readFileSync } from 'node:fs';
import { parseObservationLogMarkdown } from '../../src/runtime/memory/observation-log-observer';
for (const l of readFileSync('out/outputs.jsonl', 'utf8').trim().split('\n')) {
	const o = JSON.parse(l);
	const p = parseObservationLogMarkdown(o.text.trim());
	if (p.skippedLines.length) console.log(o.key, JSON.stringify(p.skippedLines));
}
