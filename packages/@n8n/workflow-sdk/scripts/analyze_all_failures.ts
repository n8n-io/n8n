import * as fs from 'fs';
import * as path from 'path';
import { generateWorkflowCode } from '../src/codegen';
import { parseWorkflowCode } from '../src/parse-workflow-code';
import type { WorkflowJSON, IConnection } from '../src/types/base';

const FIXTURES_DIR = path.resolve(__dirname, '../test-fixtures/real-workflows');

// Current skip list from codegen-roundtrip.test.ts
const SKIP_WORKFLOWS = [
	'2878',
	'2896',
	'3066',
	'3121',
	'3790',
	'4295',
	'4366',
	'4557',
	'4600',
	'4637',
	'4685',
	'4767',
	'4807',
	'4827',
	'4833',
	'4849',
	'4868',
	'4975',
	'5024',
	'5045',
	'5139',
	'5258',
	'5374',
	'5435',
	'5449',
	'5453',
	'5523',
	'5611',
	'5694',
	'5734',
	'5741',
	'5751',
	'5789',
	'5795',
	'5841',
	'5842',
	'5851',
	'5979',
	'6150',
	'6535',
	'6542',
	'6897',
	'6993',
	'7154',
	'7455',
	'7701',
	'7756',
	'7945',
	'7946',
	'7957',
	'8591',
	'9200',
	'9605',
	'9801',
	'9814',
	'10132',
	'10174',
	'10196',
	'10420',
	'10427',
	'10476',
	'10729',
	'10889',
	'11366',
	'11466',
	'11572',
	'11617',
	'11637',
	'11724',
	'12299',
	'12325',
	'12462',
	'12645',
];

interface MissingConn {
	source: string;
	outputIdx: number;
	target: string;
}

interface AnalysisResult {
	id: string;
	missing: MissingConn[];
	extra: MissingConn[];
	patternIndicators: string[];
}

function analyzeWorkflow(id: string): AnalysisResult | null {
	const filePath = path.join(FIXTURES_DIR, `${id}.json`);
	if (!fs.existsSync(filePath)) {
		return null;
	}

	const json = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WorkflowJSON;

	try {
		const code = generateWorkflowCode(json);
		const parsed = parseWorkflowCode(code);

		const missing: MissingConn[] = [];
		const extra: MissingConn[] = [];
		const patternIndicators: string[] = [];

		// Detect patterns in the original workflow
		const hasSplitInBatches = json.nodes.some((n) => n.type === 'n8n-nodes-base.splitInBatches');
		const hasSwitch = json.nodes.some((n) => n.type === 'n8n-nodes-base.switch');
		const hasIf = json.nodes.some((n) => n.type === 'n8n-nodes-base.if');
		const hasMerge = json.nodes.some((n) => n.type === 'n8n-nodes-base.merge');

		if (hasSplitInBatches) patternIndicators.push('SplitInBatches');
		if (hasSwitch) patternIndicators.push('Switch');
		if (hasIf) patternIndicators.push('IF');
		if (hasMerge) patternIndicators.push('Merge');

		// Check for fan-out patterns (one node connecting to multiple targets)
		for (const [src, types] of Object.entries(json.connections)) {
			const mainOutputs = (types as Record<string, IConnection[][]>).main;
			if (!mainOutputs) continue;
			for (const targets of mainOutputs) {
				if (targets && targets.length > 1) {
					patternIndicators.push(`FanOut(${src})`);
				}
			}
		}

		// Find missing connections
		for (const [src, types] of Object.entries(json.connections)) {
			for (const [type, outputs] of Object.entries(types as Record<string, IConnection[][]>)) {
				if (type !== 'main') continue;
				if (!Array.isArray(outputs)) continue;

				for (let outIdx = 0; outIdx < outputs.length; outIdx++) {
					const targets = outputs[outIdx];
					if (!targets || !Array.isArray(targets)) continue;

					for (const t of targets) {
						const parsedSrc = parsed.connections[src];
						const parsedOutputs = (parsedSrc as Record<string, IConnection[][]> | undefined)?.[
							type
						];
						const found = parsedOutputs?.[outIdx]?.some((p) => p.node === t.node);

						if (!found) {
							missing.push({ source: src, outputIdx: outIdx, target: t.node });
						}
					}
				}
			}
		}

		// Find extra connections
		for (const [src, types] of Object.entries(parsed.connections)) {
			for (const [type, outputs] of Object.entries(types as Record<string, IConnection[][]>)) {
				if (type !== 'main') continue;
				if (!Array.isArray(outputs)) continue;

				for (let outIdx = 0; outIdx < outputs.length; outIdx++) {
					const targets = outputs[outIdx];
					if (!targets || !Array.isArray(targets)) continue;

					for (const t of targets) {
						const origSrc = json.connections[src];
						const origOutputs = (origSrc as Record<string, IConnection[][]> | undefined)?.[type];
						const found = origOutputs?.[outIdx]?.some((o) => o.node === t.node);

						if (!found) {
							extra.push({ source: src, outputIdx: outIdx, target: t.node });
						}
					}
				}
			}
		}

		return { id, missing, extra, patternIndicators };
	} catch (err) {
		return {
			id,
			missing: [],
			extra: [],
			patternIndicators: [`ERROR: ${(err as Error).message.substring(0, 50)}`],
		};
	}
}

// Analyze all skipped workflows
const results: AnalysisResult[] = [];

for (const id of SKIP_WORKFLOWS) {
	const result = analyzeWorkflow(id);
	if (result) {
		results.push(result);
	}
}

// Categorize by pattern
const patternCounts = new Map<string, number>();
const patternWorkflows = new Map<string, string[]>();

for (const result of results) {
	// Build a pattern signature
	const patterns = [...new Set(result.patternIndicators.filter((p) => !p.startsWith('FanOut(')))];
	const patternKey = patterns.sort().join('+') || 'Unknown';

	patternCounts.set(patternKey, (patternCounts.get(patternKey) ?? 0) + 1);
	if (!patternWorkflows.has(patternKey)) {
		patternWorkflows.set(patternKey, []);
	}
	patternWorkflows.get(patternKey)!.push(result.id);
}

console.log('=== PATTERN ANALYSIS ===\n');

// Sort by count
const sortedPatterns = [...patternCounts.entries()].sort((a, b) => b[1] - a[1]);

for (const [pattern, count] of sortedPatterns) {
	console.log(`${pattern}: ${count} workflows`);
	console.log(`  IDs: ${patternWorkflows.get(pattern)!.join(', ')}`);
}

console.log('\n=== DETAILED MISSING CONNECTIONS ===\n');

// Group missing connections by target type (to understand what's being missed)
const missingByTarget = new Map<string, { id: string; source: string; outputIdx: number }[]>();

for (const result of results) {
	if (result.missing.length === 0) continue;

	console.log(`\n${result.id} (patterns: ${result.patternIndicators.join(', ')}):`);
	for (const m of result.missing) {
		console.log(`  ${m.source}[${m.outputIdx}] -> ${m.target}`);

		const key = m.target;
		if (!missingByTarget.has(key)) {
			missingByTarget.set(key, []);
		}
		missingByTarget.get(key)!.push({ id: result.id, source: m.source, outputIdx: m.outputIdx });
	}
}

console.log('\n=== COMMON MISSING TARGETS ===\n');

// Find targets that are commonly missed
const targetCounts = new Map<string, number>();
for (const result of results) {
	for (const m of result.missing) {
		// Normalize target names that look like patterns
		let targetType = 'other';
		if (m.target.toLowerCase().includes('loop') || m.target.toLowerCase().includes('batch')) {
			targetType = 'Loop/SplitInBatches';
		} else if (m.target.toLowerCase().includes('merge')) {
			targetType = 'Merge';
		} else if (m.target.toLowerCase().includes('switch')) {
			targetType = 'Switch';
		} else if (m.target.toLowerCase().includes('if') || m.target.includes('?')) {
			targetType = 'IF';
		}
		targetCounts.set(targetType, (targetCounts.get(targetType) ?? 0) + 1);
	}
}

for (const [target, count] of [...targetCounts.entries()].sort((a, b) => b[1] - a[1])) {
	console.log(`${target}: ${count} missing connections`);
}

console.log('\n=== SUMMARY ===');
console.log(`Total skipped workflows: ${SKIP_WORKFLOWS.length}`);
console.log(`Analyzed: ${results.length}`);
console.log(`With missing connections: ${results.filter((r) => r.missing.length > 0).length}`);
console.log(
	`Without issues: ${results.filter((r) => r.missing.length === 0 && r.extra.length === 0).length}`,
);
