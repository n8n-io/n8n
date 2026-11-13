/**
 * Why a workflow of the coverage sample differs from n8n, by a part of its
 * path. Each entry was checked by hand. A new difference shows
 * "not explained" until it gets an entry.
 */
const EXPLAINED: Array<[string, string]> = [
	[
		'expression-mix',
		"The node runs in the fallback host for `$now`: the time differs, and the host's isolated expression engine gives null for a template whose parts throw, where n8n's legacy engine keeps the text parts.",
	],
	[
		'committed-workflows/1.json',
		'Endless loop in v1 too: a done output goes back into the loop. n8n stops at its timeout, the runtime at its fuel limit.',
	],
	[
		'execution-out-of-memory',
		'Endless loop by design (a test of the out-of-memory path), in n8n too.',
	],
	['Cyclic_workflow_for_insertion_test', 'Endless cycle in n8n too.'],
	[
		'committed-workflows/7.json',
		"n8n's engine cannot load a node of the fixture (`reading 'execute'`); the converted code runs it.",
	],
	[
		'committed-workflows/9.json',
		'A Switch 3.2 without `rules` (malformed fixture): v1 gives an empty item, the converted Switch routes nothing (conditions lowering).',
	],
	[
		'Code/test/Code.workflow',
		'Code step: the fallback host code runner does not keep changes that the code makes to its input items in place.',
	],
	[
		'do_not_obfuscate_validation_error',
		'The code returns an invalid item: n8n stops with a validation error, the host code runner accepts it.',
	],
	[
		'CompareDatasets',
		'Compare Datasets runs in the fallback host; fuzzy and skip-field results differ from n8n, or the worker thread ended in the host node runner.',
	],
	[
		'DateTime/test',
		'Date & Time in the fallback host formats a null date as 1970-01-01; v1 gives null.',
	],
	[
		'Filter/test',
		'Filter conditions with strict type validation give `false` where v1 stops with a type error; date comparisons differ (known difference 3).',
	],
	[
		'ItemLists/test',
		'Item Lists in the fallback host: a wrong field name gives error items where v1 stops or passes the items on.',
	],
	[
		'Merge/test/node/workflow.combine.multiplex',
		'Merge "all combinations": the converted helper orders the pairs by input 1 first, v1 by input 2.',
	],
	[
		'Merge/test/node/workflow.update_2_1',
		'Merge by field with a field that is missing: v1 passes the items, the converted helper gives none.',
	],
	[
		'Set/test/Set.v3',
		'Set type conversion with "ignore type errors": the converted helpers convert where v1 keeps the text, and the reverse.',
	],
	[
		'Set/test/Set.workflow.number',
		'Set version 1 number field: v1 keeps the number, the converted code writes the text of a fixed value.',
	],
	[
		'Switch/V1/test/switch.rules',
		'Switch version 1 rules: the converted code routes a rule to the output that it names; v1 routes by rule order.',
	],
	['js-code-node', 'The workflow uses random data (Debug Helper); each run gives other values.'],
	['simple-webhook-test', '`$now` is the batch clock of the fixture in the converted run.'],
	[
		'set-node-expressions',
		'A Set field name that is an expression: v1 evaluates the name, the converted code uses the text.',
	],
	[
		'cli-workflows/workflows/101.json',
		'Function node: the fallback host code runner fails on the legacy Function code (needs attention).',
	],
	[
		'cli-workflows/workflows/95.json',
		'Function node: the fallback host code runner fails on the legacy Function code (needs attention).',
	],
	[
		'cli-workflows/workflows/97.json',
		'Function and Crypto in the fallback host: random values and legacy Function code.',
	],
	[
		'cli-workflows/workflows/216.json',
		'Function Item node: the fallback host code runner fails on the legacy code (needs attention).',
	],
	[
		'cli-workflows/workflows/267.json',
		'Function node: the fallback host code runner fails on the legacy code (needs attention).',
	],
	[
		'cli-workflows/workflows/108.json',
		'The worker thread ended in a fallback-host node (Function, Merge); in one process the run ends with needs attention.',
	],
	[
		'cli-workflows/workflows/94.json',
		'The worker thread ended in a fallback-host node (Function, XML); in one process the run ends with needs attention.',
	],
	[
		'cli-workflows/workflows/92.json',
		'n8n rejects the IF expressions with "invalid syntax" and stops; the converted code evaluates them.',
	],
	[
		'ado-5857-parent',
		"Trace only: the callee's last node is an IF, and v1 gives the Execute Workflow node both IF outputs; the trace shows output 0. Items on output 0 are the same.",
	],
	['large.json', 'n8n stops at its 10 s timeout on this large workflow; the converted run ends.'],
	[
		'Lots_of_nodes',
		'IF version 2.3 with an empty condition: v1 and the converted condition do not agree on "is empty" (conditions lowering).',
	],
	[
		'Subworkflow-extraction-workflow',
		'`$(…).item` through a Merge pairs by position (known difference 2); v1 follows paired items.',
	],
	[
		'Test_workflow-actions_paste-data',
		'The schedule item is `{ scheduledAt }` (known difference 4); v1 gives date fields.',
	],
	[
		'pindata_workflow',
		'v1 stops: the paired item of a pinned node is missing. The converted code gives null.',
	],
];

export function explain(file: string): string {
	return EXPLAINED.find(([part]) => file.includes(part))?.[1] ?? 'not explained';
}
