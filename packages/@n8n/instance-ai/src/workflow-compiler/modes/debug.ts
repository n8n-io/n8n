import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { deepCopy } from 'n8n-workflow';

import type { ExecutionDebugInfo } from '../../types';
import type { NodeRegistry } from '../catalog/node-registry';
import type { WorkflowPatch } from './patch';

type NodeJSON = WorkflowJSON['nodes'][number];

export type FailureClass =
	| 'credential'
	| 'missing_parameter'
	| 'expression_reference'
	| 'transient'
	| 'rate_limited'
	| 'not_found'
	| 'rejected_input'
	| 'timeout'
	| 'no_failed_node'
	| 'unknown';

export interface FailureDiagnosis {
	failureClass: FailureClass;
	failedNode?: string;
	error?: string;
	evidence: string[];
}

export type DebugFix =
	| { kind: 'patch'; patches: WorkflowPatch[]; summary: string }
	| { kind: 'setup'; summary: string; credentialTypes: string[] }
	| { kind: 'needs_user_input'; summary: string; question: string }
	| { kind: 'no_fix'; summary: string };

export interface DebugPlanInput {
	workflow: WorkflowJSON;
	execution: ExecutionDebugInfo;
	registry: NodeRegistry;
	request?: string;
}

export interface DebugPlanResult {
	diagnosis: FailureDiagnosis;
	fix: DebugFix;
}

const CLASSIFIERS: Array<{ failureClass: FailureClass; pattern: RegExp }> = [
	{
		failureClass: 'credential',
		pattern:
			/\b(credential|unauthori[sz]ed|forbidden|401|403|invalid[_ ]?token|api key|authentication)\b/i,
	},
	{ failureClass: 'rate_limited', pattern: /\b(rate limit|too many requests|429)\b/i },
	{ failureClass: 'timeout', pattern: /\b(timeout|timed out|ETIMEDOUT)\b/i },
	{
		failureClass: 'transient',
		pattern:
			/\b(ECONNRESET|ECONNREFUSED|EAI_AGAIN|502|503|504|service unavailable|bad gateway|socket hang up)\b/i,
	},
	{ failureClass: 'not_found', pattern: /\b(not found|404|does not exist|no such)\b/i },
	{
		failureClass: 'expression_reference',
		pattern:
			/\b(referenced node|no node named|is not defined|cannot read propert|undefined \(reading|\$\(|paired item)\b/i,
	},
	{
		failureClass: 'missing_parameter',
		pattern:
			/\b(parameter .* is required|required parameter|missing (required )?(field|parameter|value)|please fill|cannot be empty|is empty)\b/i,
	},
	{
		failureClass: 'rejected_input',
		pattern:
			/\b(400|422|bad request|invalid (input|payload|request|value)|validation (failed|error))\b/i,
	},
];

/** Classifies the execution failure from the recorded error text. Deterministic keyword rules, no model. */
export function classifyFailure(execution: ExecutionDebugInfo): FailureDiagnosis {
	const failed = execution.failedNode;
	if (!failed) {
		return { failureClass: 'no_failed_node', evidence: [`execution status: ${execution.status}`] };
	}
	const evidence = [`failed node: ${failed.name} (${failed.type})`, `error: ${failed.error}`];
	for (const { failureClass, pattern } of CLASSIFIERS) {
		if (pattern.test(failed.error))
			return { failureClass, failedNode: failed.name, error: failed.error, evidence };
	}
	return { failureClass: 'unknown', failedNode: failed.name, error: failed.error, evidence };
}

function levenshtein(a: string, b: string): number {
	const rows = a.length + 1;
	const cols = b.length + 1;
	const matrix: number[][] = Array.from({ length: rows }, (_, i) => [
		i,
		...Array.from({ length: cols - 1 }, () => 0),
	]);
	for (let j = 0; j < cols; j += 1) matrix[0][j] = j;
	for (let i = 1; i < rows; i += 1) {
		for (let j = 1; j < cols; j += 1) {
			matrix[i][j] = Math.min(
				matrix[i - 1][j] + 1,
				matrix[i][j - 1] + 1,
				matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
			);
		}
	}
	return matrix[rows - 1][cols - 1];
}

function* stringParameters(
	value: unknown,
	path: string[] = [],
): Generator<{ path: string[]; value: string }> {
	if (typeof value === 'string') yield { path, value };
	else if (Array.isArray(value))
		for (const [index, item] of value.entries())
			yield* stringParameters(item, [...path, String(index)]);
	else if (typeof value === 'object' && value !== null)
		for (const [key, item] of Object.entries(value)) yield* stringParameters(item, [...path, key]);
}

function setDeep(target: Record<string, unknown>, path: string[], value: unknown): void {
	let cursor: Record<string, unknown> = target;
	for (const segment of path.slice(0, -1)) {
		const next = cursor[segment];
		if (typeof next === 'object' && next !== null) cursor = next as Record<string, unknown>;
		else {
			const created: Record<string, unknown> = {};
			cursor[segment] = created;
			cursor = created;
		}
	}
	cursor[path[path.length - 1]] = value;
}

/**
 * Debug mode: use execution evidence to classify the failure, then choose the
 * smallest fix. Never "fixes" a failure by continuing on error or removing
 * the failing branch.
 */
export function planDebug(input: DebugPlanInput): DebugPlanResult {
	const diagnosis = classifyFailure(input.execution);
	const node = input.workflow.nodes.find((candidate) => candidate.name === diagnosis.failedNode);
	const fix = chooseFix(diagnosis, node, input);
	return { diagnosis, fix };
}

function chooseFix(
	diagnosis: FailureDiagnosis,
	node: NodeJSON | undefined,
	input: DebugPlanInput,
): DebugFix {
	switch (diagnosis.failureClass) {
		case 'no_failed_node':
			return {
				kind: 'no_fix',
				summary: `The execution ended with status "${input.execution.status}" and no failed node; nothing to patch.`,
			};
		case 'credential': {
			const types = node?.credentials ? Object.keys(node.credentials) : [];
			return {
				kind: 'setup',
				summary: `"${diagnosis.failedNode}" failed to authenticate; its credential needs setup or replacement.`,
				credentialTypes: types,
			};
		}
		case 'rate_limited':
		case 'transient':
		case 'timeout': {
			if (!node?.name) return { kind: 'no_fix', summary: 'Transient failure on an unknown node.' };
			if (node.retryOnFail)
				return {
					kind: 'needs_user_input',
					summary: `"${node.name}" already retries and still fails.`,
					question: `"${node.name}" keeps failing with a transient error after retries. Is the target service reachable from this instance?`,
				};
			const patches: WorkflowPatch[] = [
				{
					op: 'update_node',
					nodeName: node.name,
					settings: {
						retryOnFail: true,
						maxTries: 3,
						waitBetweenTries: diagnosis.failureClass === 'rate_limited' ? 5000 : 2000,
					},
				},
			];
			return {
				kind: 'patch',
				patches,
				summary: `Enabled retries on "${node.name}" for its ${diagnosis.failureClass.replace('_', ' ')} failure.`,
			};
		}
		case 'expression_reference': {
			if (!node?.name) return { kind: 'no_fix', summary: 'Expression failure on an unknown node.' };
			const names = input.workflow.nodes.map((candidate) => candidate.name ?? '').filter(Boolean);
			const parameters: NonNullable<NodeJSON['parameters']> = deepCopy(node.parameters ?? {});
			let repaired = 0;
			for (const { path, value } of stringParameters(parameters)) {
				if (!value.startsWith('=')) continue;
				const fixed = value.replace(
					/\$\((['"])([^'"]+)\1\)/g,
					(whole, quote: string, referenced: string) => {
						if (names.includes(referenced)) return whole;
						const best = names
							.map((name) => ({
								name,
								distance: levenshtein(name.toLowerCase(), referenced.toLowerCase()),
							}))
							.sort((a, b) => a.distance - b.distance)[0];
						if (!best || best.distance > Math.max(2, Math.floor(referenced.length / 3)))
							return whole;
						repaired += 1;
						return `$(${quote}${best.name}${quote})`;
					},
				);
				if (fixed !== value) setDeep(parameters, path, fixed);
			}
			if (repaired === 0) {
				return {
					kind: 'needs_user_input',
					summary: `"${node.name}" references data that does not exist at runtime.`,
					question: `"${node.name}" fails with: ${diagnosis.error}. Which upstream node and field should it read?`,
				};
			}
			return {
				kind: 'patch',
				patches: [{ op: 'update_node', nodeName: node.name, parameters }],
				summary: `Repaired ${repaired} node reference(s) in "${node.name}".`,
			};
		}
		case 'missing_parameter':
			return {
				kind: 'needs_user_input',
				summary: `"${diagnosis.failedNode}" is missing a required value.`,
				question: `"${diagnosis.failedNode}" fails with: ${diagnosis.error}. What value should it use?`,
			};
		case 'not_found':
			return {
				kind: 'needs_user_input',
				summary: `"${diagnosis.failedNode}" targets a resource that does not exist.`,
				question: `"${diagnosis.failedNode}" fails with: ${diagnosis.error}. Which existing resource should it target?`,
			};
		case 'rejected_input':
			return {
				kind: 'needs_user_input',
				summary: `The service rejected the data "${diagnosis.failedNode}" sent.`,
				question: `"${diagnosis.failedNode}" fails with: ${diagnosis.error}. Which field is wrong, and what should it contain?`,
			};
		case 'unknown':
			return {
				kind: 'needs_user_input',
				summary: `"${diagnosis.failedNode}" failed for a reason the compiler cannot classify.`,
				question: `"${diagnosis.failedNode}" fails with: ${diagnosis.error}. How should it behave instead?`,
			};
	}
}
