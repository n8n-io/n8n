import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { deepCopy } from 'n8n-workflow';

import type { ExecutionDebugInfo } from '../../types';
import type { NodeRegistry } from '../catalog/node-registry';
import type { WorkflowPatch } from './patch';

type NodeJSON = WorkflowJSON['nodes'][number];
type Values = Record<string, unknown>;

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

const CLASSIFIERS: Array<[FailureClass, RegExp]> = [
	[
		'credential',
		/\b(credential|unauthori[sz]ed|forbidden|401|403|invalid[_ ]?token|api key|authentication)\b/i,
	],
	['rate_limited', /\b(rate limit|too many requests|429)\b/i],
	['timeout', /\b(timeout|timed out|ETIMEDOUT)\b/i],
	[
		'transient',
		/\b(ECONNRESET|ECONNREFUSED|EAI_AGAIN|502|503|504|service unavailable|bad gateway|socket hang up)\b/i,
	],
	['not_found', /\b(not found|404|does not exist|no such)\b/i],
	[
		'expression_reference',
		/\b(referenced node|no node named|is not defined|cannot read propert|undefined \(reading|\$\(|paired item)\b/i,
	],
	[
		'missing_parameter',
		/\b(parameter .* is required|required parameter|missing (required )?(field|parameter|value)|please fill|cannot be empty|is empty)\b/i,
	],
	[
		'rejected_input',
		/\b(400|422|bad request|invalid (input|payload|request|value)|validation (failed|error))\b/i,
	],
];

/** Classifies the execution failure from the recorded error text. Deterministic keyword rules, no model. */
export function classifyFailure(execution: ExecutionDebugInfo): FailureDiagnosis {
	const failed = execution.failedNode;
	if (!failed) {
		return { failureClass: 'no_failed_node', evidence: [`execution status: ${execution.status}`] };
	}
	const evidence = [`failed node: ${failed.name} (${failed.type})`, `error: ${failed.error}`];
	const failureClass =
		CLASSIFIERS.find(([, pattern]) => pattern.test(failed.error))?.[0] ?? 'unknown';
	return { failureClass, failedNode: failed.name, error: failed.error, evidence };
}

function levenshtein(a: string, b: string): number {
	const rows = a.length + 1;
	const cols = b.length + 1;
	const matrix = Array.from({ length: rows }, (_, i) =>
		Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
	);
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

const isContainer = (value: unknown): value is Values =>
	typeof value === 'object' && value !== null;

/** Rewrites every string leaf in place, descending through nested objects and arrays. */
function rewriteStrings(container: Values, rewrite: (value: string) => string): void {
	for (const [key, item] of Object.entries(container)) {
		if (typeof item === 'string') container[key] = rewrite(item);
		else if (isContainer(item)) rewriteStrings(item, rewrite);
	}
}

/** Debug mode: classify the failure from execution evidence, then choose the smallest fix. Never continues on error or removes the failing branch. */
export function planDebug(input: DebugPlanInput): DebugPlanResult {
	const diagnosis = classifyFailure(input.execution);
	const node = input.workflow.nodes.find((candidate) => candidate.name === diagnosis.failedNode);
	return { diagnosis, fix: chooseFix(diagnosis, node, input) };
}

function chooseFix(
	diagnosis: FailureDiagnosis,
	node: NodeJSON | undefined,
	input: DebugPlanInput,
): DebugFix {
	const { failedNode, error } = diagnosis;
	const askUser = (summary: string, tail: string): DebugFix => ({
		kind: 'needs_user_input',
		summary,
		question: `"${failedNode}" fails with: ${error}. ${tail}`,
	});
	switch (diagnosis.failureClass) {
		case 'no_failed_node':
			return {
				kind: 'no_fix',
				summary: `The execution ended with status "${input.execution.status}" and no failed node; nothing to patch.`,
			};
		case 'credential':
			return {
				kind: 'setup',
				summary: `"${failedNode}" failed to authenticate; its credential needs setup or replacement.`,
				credentialTypes: node?.credentials ? Object.keys(node.credentials) : [],
			};
		case 'rate_limited':
		case 'transient':
		case 'timeout': {
			if (!node?.name) return { kind: 'no_fix', summary: 'Transient failure on an unknown node.' };
			if (node.retryOnFail) {
				return {
					kind: 'needs_user_input',
					summary: `"${node.name}" already retries and still fails.`,
					question: `"${node.name}" keeps failing with a transient error after retries. Is the target service reachable from this instance?`,
				};
			}
			const waitBetweenTries = diagnosis.failureClass === 'rate_limited' ? 5000 : 2000;
			const settings = { retryOnFail: true, maxTries: 3, waitBetweenTries };
			return {
				kind: 'patch',
				patches: [{ op: 'update_node', nodeName: node.name, settings }],
				summary: `Enabled retries on "${node.name}" for its ${diagnosis.failureClass.replace('_', ' ')} failure.`,
			};
		}
		case 'expression_reference': {
			if (!node?.name) return { kind: 'no_fix', summary: 'Expression failure on an unknown node.' };
			const names = input.workflow.nodes.map((candidate) => candidate.name ?? '').filter(Boolean);
			const parameters: NonNullable<NodeJSON['parameters']> = deepCopy(node.parameters ?? {});
			let repaired = 0;
			rewriteStrings(parameters, (value) => {
				if (!value.startsWith('=')) return value;
				return value.replace(
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
			});
			if (repaired === 0) {
				return askUser(
					`"${node.name}" references data that does not exist at runtime.`,
					'Which upstream node and field should it read?',
				);
			}
			return {
				kind: 'patch',
				patches: [{ op: 'update_node', nodeName: node.name, parameters }],
				summary: `Repaired ${repaired} node reference(s) in "${node.name}".`,
			};
		}
		case 'missing_parameter':
			return askUser(`"${failedNode}" is missing a required value.`, 'What value should it use?');
		case 'not_found':
			return askUser(
				`"${failedNode}" targets a resource that does not exist.`,
				'Which existing resource should it target?',
			);
		case 'rejected_input':
			return askUser(
				`The service rejected the data "${failedNode}" sent.`,
				'Which field is wrong, and what should it contain?',
			);
		case 'unknown':
			return askUser(
				`"${failedNode}" failed for a reason the compiler cannot classify.`,
				'How should it behave instead?',
			);
	}
}
