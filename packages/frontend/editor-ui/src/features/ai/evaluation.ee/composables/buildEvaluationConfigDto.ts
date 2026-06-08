import { nanoid } from 'nanoid';
import type {
	ChatHubLLMProvider,
	EvaluationMetric,
	UpsertEvaluationConfigDto,
} from '@n8n/api-types';

import {
	CANNED_METRICS,
	LLM_JUDGE_METRIC_KEYS,
	LM_SUBNODE_TYPE_TO_CHATHUB_PROVIDER,
	type CannedMetricKey,
} from '../evaluation.constants';
import type { CustomCheck, JudgeSelection } from '../wizardSidepanel.store';

// Invert the hydration map so any provider we can hydrate also maps back when
// re-saving; a hand-maintained copy previously drifted on multi-word keys.
const CHATHUB_PROVIDER_TO_NODE_TYPE: Partial<Record<ChatHubLLMProvider, string>> = {};
for (const [nodeType, provider] of Object.entries(LM_SUBNODE_TYPE_TO_CHATHUB_PROVIDER)) {
	CHATHUB_PROVIDER_TO_NODE_TYPE[provider] = nodeType;
}

export type BuildDtoInput = {
	workflowName: string;
	upstreamNodeName: string;
	startNodeName: string;
	endNodeName: string;
	inputFieldNames: readonly string[];
	selectedMetrics: readonly CannedMetricKey[];
	judgeSelectionByMetric: Partial<Record<CannedMetricKey, JudgeSelection>>;
	customChecks: readonly CustomCheck[];
	dataTableId: string;
};

export type BuildDtoResult =
	| { ok: true; dto: UpsertEvaluationConfigDto }
	| { ok: false; reason: string };

export function buildEvaluationConfigDto(input: BuildDtoInput): BuildDtoResult {
	const metrics: EvaluationMetric[] = [];

	for (const key of input.selectedMetrics) {
		const meta = CANNED_METRICS.find((m) => m.key === key);
		if (!meta) continue;
		const built = buildMetric(key, meta.key, input);
		if (built.kind === 'err') return { ok: false, reason: built.reason };
		metrics.push(built.metric);
	}

	for (const check of input.customChecks) {
		const built = buildCustomCheckMetric(check);
		if (built.kind === 'err') return { ok: false, reason: built.reason };
		metrics.push(built.metric);
	}

	if (metrics.length === 0) {
		return { ok: false, reason: 'No metrics selected' };
	}

	return {
		ok: true,
		dto: {
			name: `Evaluation: ${input.workflowName}`.slice(0, 128),
			startNodeName: input.startNodeName,
			endNodeName: input.endNodeName,
			metrics,
			datasetSource: 'data_table',
			datasetRef: { dataTableId: input.dataTableId },
		},
	};
}

// n8n expressions wrap node names in `$('…')` single quotes. A node literally
// named `Customer's Webhook` (perfectly legal) would break the expression
// without escaping. Escape backslashes first to avoid double-processing.
function escapeForSingleQuoted(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

type BuildMetricResult = { kind: 'ok'; metric: EvaluationMetric } | { kind: 'err'; reason: string };

function buildMetric(key: CannedMetricKey, name: string, input: BuildDtoInput): BuildMetricResult {
	const id = nanoid();
	const upstream = escapeForSingleQuoted(input.upstreamNodeName);
	const endNode = escapeForSingleQuoted(input.endNodeName);
	// Compiler rewrites upstream → `__eval_trigger` at runtime.
	const datasetCol = (col: string) =>
		`={{ $('${upstream}').first().json[${JSON.stringify(col)}] }}`;
	const endOutputAsString = `={{ JSON.stringify($('${endNode}').first().json) }}`;

	// Mirror of extractAnswerText() in evaluation.utils.ts — keep the two in sync.
	// Prefer output > text > response; else single-key value; else JSON.stringify.
	// Object values are JSON.stringified (not coerced to "[object Object]") so the
	// runtime score matches the previewed answer exactly.
	const endAnswer = `={{ (() => { const j = $('${endNode}').first().json; if (j === null || j === undefined) return ''; if (typeof j !== 'object') return String(j); const p = j.output ?? j.text ?? j.response; if (p !== undefined && p !== null) return typeof p === 'object' ? JSON.stringify(p) : String(p); const ks = Object.keys(j); if (ks.length === 1) { const o = j[ks[0]]; return typeof o === 'object' && o !== null ? JSON.stringify(o) : String(o); } return JSON.stringify(j); })() }}`;

	if (LLM_JUDGE_METRIC_KEYS.has(key)) {
		const selection = input.judgeSelectionByMetric[key];
		if (!selection) {
			return { kind: 'err', reason: `Missing model selection for ${name}` };
		}
		const nodeType = CHATHUB_PROVIDER_TO_NODE_TYPE[selection.provider];
		if (!nodeType) {
			return { kind: 'err', reason: `Unsupported provider ${selection.provider}` };
		}

		// Prompt omitted — the compiled Set Metrics node uses the canned preset.
		if (key === 'correctness') {
			return {
				kind: 'ok',
				metric: {
					id,
					name,
					type: 'llm_judge',
					config: {
						preset: 'correctness',
						provider: nodeType,
						credentialId: selection.credentialId,
						model: selection.model,
						outputType: 'numeric',
						inputs: {
							actualAnswer: endOutputAsString,
							expectedAnswer: datasetCol('expectedAnswer'),
						},
					},
				},
			};
		}
		if (key === 'helpfulness') {
			// Single input column only — full-row stringify leaks ground-truth.
			const userInputCol = input.inputFieldNames[0];
			if (!userInputCol) {
				return {
					kind: 'err',
					reason:
						'Helpfulness needs at least one input column from the workflow execution to use as the user query',
				};
			}
			return {
				kind: 'ok',
				metric: {
					id,
					name,
					type: 'llm_judge',
					config: {
						preset: 'helpfulness',
						provider: nodeType,
						credentialId: selection.credentialId,
						model: selection.model,
						outputType: 'numeric',
						inputs: {
							actualAnswer: endOutputAsString,
							userQuery: datasetCol(userInputCol),
						},
					},
				},
			};
		}
	}

	if (key === 'stringSimilarity') {
		return {
			kind: 'ok',
			metric: {
				id,
				name,
				type: 'string_similarity',
				config: {
					inputs: {
						actualAnswer: endAnswer,
						expectedAnswer: datasetCol('expectedAnswer'),
					},
				},
			},
		};
	}
	if (key === 'categorization') {
		return {
			kind: 'ok',
			metric: {
				id,
				name,
				type: 'categorization',
				config: {
					inputs: {
						actualAnswer: endAnswer,
						expectedAnswer: datasetCol('expectedAnswer'),
					},
				},
			},
		};
	}
	if (key === 'toolsUsed') {
		return {
			kind: 'ok',
			metric: {
				id,
				name,
				type: 'tools_used',
				config: {
					inputs: {
						expectedTools: datasetCol('expectedTools'),
						intermediateSteps: `={{ $('${endNode}').first().json.intermediateSteps }}`,
					},
				},
			},
		};
	}

	return { kind: 'err', reason: `Unsupported metric ${key}` };
}

function buildCustomCheckMetric(check: CustomCheck): BuildMetricResult {
	return {
		kind: 'ok',
		metric: {
			id: nanoid(),
			name: check.name,
			type: 'expression',
			config: {
				expression: normalizeN8nExpression(check.expression),
				outputType: 'numeric',
			},
		},
	};
}

// Canonical form is `={{ <expr> }}`; accept `={{...}}`, `{{...}}`, or bare.
function normalizeN8nExpression(raw: string): string {
	const trimmed = raw.trim();
	if (trimmed.length === 0) return trimmed;
	if (trimmed.startsWith('=')) return trimmed;
	if (trimmed.startsWith('{{')) return `=${trimmed}`;
	return `={{ ${trimmed} }}`;
}
