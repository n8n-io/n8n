/**
 * The report of `scripts/gym-diff.ts` (`docs/gym-diff.md`). The numbers come
 * from the run; the explanation of each difference comes from `notes.ts`,
 * where each one was checked by hand.
 */
import { writeFileSync } from 'node:fs';

import { explain } from '../convert-coverage-explained.ts';
import type { Classification } from './eligibility.ts';
import { brief } from './normalize.ts';
import { HOW_TO_RUN, NOTES, NORMALIZATION_TEXT, PREAMBLE, TAIL } from './notes.ts';
import type { RunReport } from './run-one.ts';

export interface Summary {
	sample: number;
	eligible: number;
	eligibleExternal: number;
	eligibleInternal: number;
	partial: number;
	ineligible: number;
	sidecar: number;
	run: number;
	setupFailed: number;
	convertFailed: number;
	v1Ok: number;
	compiledOk: number;
	bothOk: number;
	statusEqual: number;
	outputsEqual: number;
	stateEqual: number;
	allEqual: number;
	normalizedTime: number;
	normalizedId: number;
	partialReasons: Array<[string, number]>;
	ineligibleReasons: Array<[string, number]>;
	services: Array<[string, number]>;
	/** Gym gaps seen in the runs: credential types it did not give, ids it could not bind. */
	missingCredentials: Array<[string, number]>;
	unbound: Array<[string, number]>;
	minutes: number;
}

function count(keys: string[]): Array<[string, number]> {
	const m = new Map<string, number>();
	for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
	return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function summarize(
	classified: Array<{ key: string; cls: Classification }>,
	reports: RunReport[],
	extra: { selected: number; sidecar: number; minutes: number },
): Summary {
	const eligible = classified.filter((c) => c.cls.status === 'eligible');
	const ran = reports.filter((r) => r.outcome !== 'setup failed' && r.outcome !== 'convert failed');
	return {
		sample: classified.length,
		eligible: eligible.length,
		eligibleExternal: eligible.filter((c) => c.cls.external.length > 0).length,
		eligibleInternal: eligible.filter((c) => c.cls.external.length === 0).length,
		partial: classified.filter((c) => c.cls.status === 'partial').length,
		ineligible: classified.filter((c) => c.cls.status === 'ineligible').length,
		sidecar: extra.sidecar,
		run: extra.selected,
		setupFailed: reports.filter((r) => r.outcome === 'setup failed').length,
		convertFailed: reports.filter((r) => r.outcome === 'convert failed').length,
		v1Ok: ran.filter((r) => r.v1.ok).length,
		compiledOk: ran.filter((r) => r.compiled.ok).length,
		bothOk: ran.filter((r) => r.v1.ok && r.compiled.ok).length,
		statusEqual: ran.filter((r) => !r.outcome.includes('status')).length,
		outputsEqual: ran.filter((r) => r.nodeDiffs.length === 0).length,
		stateEqual: ran.filter((r) => r.stateDiffs.length === 0).length,
		allEqual: ran.filter((r) => r.outcome === 'equal').length,
		normalizedTime: ran.reduce((s, r) => s + r.normalized.time, 0),
		normalizedId: ran.reduce((s, r) => s + r.normalized.id, 0),
		partialReasons: count(
			classified.filter((c) => c.cls.status === 'partial').map((c) => c.cls.reasonKey ?? '?'),
		),
		ineligibleReasons: count(
			classified.filter((c) => c.cls.status === 'ineligible').map((c) => c.cls.reasonKey ?? '?'),
		),
		services: count(eligible.flatMap((c) => c.cls.services)),
		missingCredentials: count(reports.flatMap((r) => r.missingCredentials ?? [])),
		unbound: count(
			reports.flatMap((r) =>
				(r.unbound ?? []).map((u) =>
					u.replace(/^[^:]*\.(\w+)(?:\[\d+\])*: .*?(\(no free ref .*\))$/, '$1 $2'),
				),
			),
		),
		minutes: Math.round(extra.minutes * 10) / 10,
	};
}

function cell(text: string): string {
	return text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').replace(/`/g, "'");
}

function row(cells: Array<string | number>): string {
	return `| ${cells.map((c) => cell(String(c))).join(' | ')} |`;
}

function numbers(s: Summary, b?: Summary): string[] {
	const line = (label: string, key: keyof Summary) => {
		const now = s[key];
		const before = b ? b[key] : undefined;
		return b ? row([label, String(before), String(now)]) : row([label, String(now)]);
	};
	return [
		b ? '| Measure | Before fixes | After fixes |' : '| Measure | Value |',
		b ? '|---|---|---|' : '|---|---|',
		line('Workflows run', 'run'),
		line('Setup failed (seed, credentials, gym)', 'setupFailed'),
		line('Convert or compile failed', 'convertFailed'),
		line('(a) v1 succeeded', 'v1Ok'),
		line('(b) compiled succeeded', 'compiledOk'),
		line('Both succeeded', 'bothOk'),
		line('Same status (both succeed or both stop at an error)', 'statusEqual'),
		line('Node outputs equal', 'outputsEqual'),
		line('Gym state equal', 'stateEqual'),
		line('Status, outputs and state equal', 'allEqual'),
		line('Values normalized: times', 'normalizedTime'),
		line('Values normalized: ids', 'normalizedId'),
	];
}

export function writeReport(
	file: string,
	s: Summary,
	reports: RunReport[],
	baseline?: Summary,
): void {
	const out: string[] = [];
	out.push('# Gym differential test: v1 engine and compiled engine', '');
	out.push(
		'Generated by `node scripts/gym-diff.ts`. The explanations come from `scripts/gym/notes.ts`.',
		'',
	);
	out.push(...HOW_TO_RUN, '');
	out.push(...PREAMBLE, '');
	out.push('## Eligibility', '');
	out.push('| Class | Workflows |', '|---|---|');
	out.push(row(['Sample', s.sample]));
	out.push(row(['Eligible', s.eligible]));
	out.push(row(['  with calls to gym services', s.eligibleExternal]));
	out.push(row(['  with no external call', s.eligibleInternal]));
	out.push(row(['  not run: a service needs a sidecar server', s.sidecar]));
	out.push(row(['Partly covered', s.partial]));
	out.push(row(['Not eligible', s.ineligible]));
	out.push('');
	out.push('Services of the eligible workflows:', '');
	out.push(s.services.map(([k, v]) => `${k} ${v}`).join(', '), '');
	out.push('<details><summary>Partly covered, by the first gap</summary>', '');
	out.push('| Gap | Workflows |', '|---|---|');
	for (const [k, v] of s.partialReasons) out.push(row([k, v]));
	out.push('', '</details>', '');
	out.push('<details><summary>Not eligible, by the first missing service</summary>', '');
	out.push('| Missing | Workflows |', '|---|---|');
	for (const [k, v] of s.ineligibleReasons) out.push(row([k, v]));
	out.push('', '</details>', '');
	out.push('## Results', '');
	out.push(...numbers(s, baseline), '');
	out.push(`Run time: ${s.minutes} min.`, '');
	out.push(...NORMALIZATION_TEXT, '');
	out.push('### Gym gaps seen in the runs', '');
	out.push('| Credential type the gym did not give | Workflows |', '|---|---|');
	for (const [k, v] of s.missingCredentials) out.push(row([k, v]));
	out.push('');
	out.push('| Fixed id that could not be bound to the world | Times |', '|---|---|');
	for (const [k, v] of s.unbound.slice(0, 30)) out.push(row([k, v]));
	out.push('');
	out.push('## Differences', '');
	const diffs = reports
		.filter((r) => r.outcome !== 'equal')
		.sort((a, b) => a.key.localeCompare(b.key));
	out.push('| Workflow | Outcome | (a) / (b) | First difference | Explanation | Owner |');
	out.push('|---|---|---|---|---|---|');
	for (const r of diffs) {
		const note = NOTES.find((n) => r.key.includes(n.match));
		const first = r.nodeDiffs[0]
			? `${r.nodeDiffs[0].node}: ${r.nodeDiffs[0].diffs[0]?.path} ${brief(r.nodeDiffs[0].diffs[0]?.a, 60)} / ${brief(r.nodeDiffs[0].diffs[0]?.b, 60)}`
			: r.stateDiffs[0]
				? `${r.stateDiffs[0].path} ${brief(r.stateDiffs[0].a, 60)} / ${brief(r.stateDiffs[0].b, 60)}`
				: (r.note ?? '');
		const ab = `${r.v1.ok ? 'ok' : `${r.v1.status}: ${r.v1.error ?? ''}`.slice(0, 80)} / ${r.compiled.ok ? 'ok' : `${r.compiled.status}: ${r.compiled.error ?? ''}`.slice(0, 80)}`;
		// A workflow without gym calls that also differs in the convert-coverage oracle run.
		const known = r.services.length === 0 ? explain(r.key) : 'not explained';
		const why =
			note?.why ??
			(known !== 'not explained' ? `Known (convert-coverage): ${known}` : 'not explained yet');
		out.push(
			row([
				r.key,
				r.outcome,
				ab,
				first,
				why,
				note?.owner ?? (known !== 'not explained' ? 'known' : ''),
			]),
		);
	}
	out.push('');
	out.push(...TAIL, '');
	writeFileSync(file, out.join('\n'));
}
