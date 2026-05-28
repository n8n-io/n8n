import { nanoid } from 'nanoid';
import type { EvaluationMetric, UpsertEvaluationConfigDto } from '@n8n/api-types';

import {
	CANNED_METRICS,
	LLM_JUDGE_METRIC_KEYS,
	type CannedMetricKey,
} from '../evaluation.constants';
import type { CustomScorer, JudgeSelection } from '../wizardSidepanel.store';

// ChatHub provider keys ('openai', 'anthropic', …) map 1:1 to langchain
// node types in the api-types CHATHUB_TO_CATALOG table. Keeping this duplicate
// here lets the wizard avoid importing from @/features/ai/chatHub for a
// single mapping object.
const CHATHUB_PROVIDER_TO_NODE_TYPE: Record<string, string> = {
	openai: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
	anthropic: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
	google: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
	'google-vertex': '@n8n/n8n-nodes-langchain.lmChatGoogleVertex',
	'azure-openai': '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
	'aws-bedrock': '@n8n/n8n-nodes-langchain.lmChatAwsBedrock',
	ollama: '@n8n/n8n-nodes-langchain.lmChatOllama',
	'vercel-ai-gateway': '@n8n/n8n-nodes-langchain.lmChatVercelAiGateway',
};

export type BuildDtoInput = {
	workflowName: string;
	// Trigger / upstream node name. Used to reference dataset columns in
	// expressions; the compiler rewrites `$('<upstreamName>')` to
	// `$('__eval_trigger')` at run time.
	upstreamNodeName: string;
	startNodeName: string;
	endNodeName: string;
	// Top-level keys of the dataset row coming from the upstream trigger.
	// Used to pick a sensible `userQuery` source for the helpfulness preset
	// (first input column) instead of stringifying the whole row, which would
	// leak ground-truth columns into the judge prompt.
	inputFieldNames: readonly string[];
	selectedMetrics: readonly CannedMetricKey[];
	judgeSelectionByMetric: Partial<Record<CannedMetricKey, JudgeSelection>>;
	// User-defined scorers added via the "+ New custom scorer" modal in step 1.
	// Appended after the canned metrics in the DTO so the run results render in
	// the same order the user built them.
	customScorers: readonly CustomScorer[];
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

	for (const scorer of input.customScorers) {
		const built = buildCustomScorerMetric(scorer);
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
	// Dataset row expression: the compiler rewrites the upstream name to the
	// injected `__eval_trigger` at run time, so this resolves to the dataset
	// row's column value.
	const datasetCol = (col: string) =>
		`={{ $('${upstream}').first().json[${JSON.stringify(col)}] }}`;
	// End-node output: the Set Metrics node receives the end node's output
	// directly as $json, but we reference it via $('endNode') so the
	// expression is robust to future changes in how metric nodes are wired.
	const endOutputAsString = `={{ JSON.stringify($('${endNode}').first().json) }}`;

	if (LLM_JUDGE_METRIC_KEYS.has(key)) {
		const selection = input.judgeSelectionByMetric[key];
		if (!selection) {
			return { kind: 'err', reason: `Missing model selection for ${name}` };
		}
		const nodeType = CHATHUB_PROVIDER_TO_NODE_TYPE[selection.provider];
		if (!nodeType) {
			return { kind: 'err', reason: `Unsupported provider ${selection.provider}` };
		}

		// Prompt is intentionally omitted — the compiled Set Metrics node
		// uses the canned correctness/helpfulness prompt declared in the
		// node schema. Users can override later by editing the config.
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
			// userQuery must reference a SINGLE input column, not the whole
			// row — stringifying the row would leak the dataset's
			// `expectedAnswer` / `expectedTools` columns into the very text the
			// judge is supposed to score helpfulness against.
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
						actualAnswer: endOutputAsString,
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
						actualAnswer: endOutputAsString,
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
						// Agents emit `intermediateSteps` on their output. We
						// reference the end node explicitly so the meaning is
						// stable even if the runtime wiring of the metric node
						// changes; the field is `undefined` when the terminal
						// isn't an agent — the toolsUsed handler then throws
						// `'Intermediate steps missing'`, which surfaces as a
						// clear case-level error rather than silently scoring 0.
						intermediateSteps: `={{ $('${endNode}').first().json.intermediateSteps }}`,
					},
				},
			},
		};
	}

	return { kind: 'err', reason: `Unsupported metric ${key}` };
}

// User-defined scorer → backend EvaluationMetric. Maps to the `expression`
// metric type with a numeric output (the out-of-the-box value users compare
// against thresholds). Custom LLM-as-judge scorers are not exposed in the
// modal — the Set Metrics node doesn't support a fully custom LLM judge.
function buildCustomScorerMetric(scorer: CustomScorer): BuildMetricResult {
	return {
		kind: 'ok',
		metric: {
			id: nanoid(),
			name: scorer.name,
			type: 'expression',
			config: {
				expression: normalizeN8nExpression(scorer.expression),
				outputType: 'numeric',
			},
		},
	};
}

// n8n's expression engine only evaluates a string if it begins with `=`
// (canonical form: `={{ <expr> }}`). A custom-scorer field is a free-text
// input, so users can type three reasonable shapes — we accept all of them
// and emit the canonical form:
//
//   =$x          (already a directive — pass through as-is)
//   ={{ $x }}    (already a directive — pass through as-is)
//   {{ $x }}     (forgot the `=` — prepend it)
//   $x           (bare expression — wrap in `={{ }}`)
//
// Without this, a value like `{{ $json.output.length }}` reaches the Set
// Metrics handler as a literal string and the run fails with "isn't a number".
function normalizeN8nExpression(raw: string): string {
	const trimmed = raw.trim();
	if (trimmed.length === 0) return trimmed;
	if (trimmed.startsWith('=')) return trimmed;
	if (trimmed.startsWith('{{')) return `=${trimmed}`;
	return `={{ ${trimmed} }}`;
}
