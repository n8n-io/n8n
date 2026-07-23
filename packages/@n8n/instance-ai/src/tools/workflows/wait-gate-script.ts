/**
 * Wait-gate decision scripts for verification.
 *
 * A send-and-wait gate on a loop cannot be verified with a single pinned
 * response (the constant decision re-runs the loop forever). Instead, verify
 * runs one pass per scripted decision — approve-ish and reject-ish — on an
 * ephemeral workflow copy with one loop edge removed, so every pass is
 * acyclic regardless of how the decision routes. This module derives that
 * script (cut edge + decision fixtures) from the workflow at build time.
 *
 * V1 limits: send-and-wait operations only (Wait/Form keep the halt), exactly
 * one scripted gate per workflow, and custom forms need a dropdown field to
 * enumerate decisions. Anything underivable returns [] and the gate falls
 * back to its `haltBranch` behaviour.
 */

import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { isTriggerNodeType } from './workflow-json-utils';
import type {
	NodeSimulationVerdict,
	WaitGateScript,
} from '../../workflow-loop/workflow-loop-state';

type WorkflowNode = WorkflowJSON['nodes'][number];
type Edge = { source: string; target: string };

const SEND_AND_WAIT_OPERATION = 'sendAndWait';

const APPROVE_TEXT = 'Approved — looks good, go ahead.';
const REVISE_TEXT = 'Please revise: tighten the copy and add one concrete example.';

function isSendAndWaitNode(node: WorkflowNode): boolean {
	const parameters = isRecord(node.parameters) ? node.parameters : {};
	return parameters.operation === SEND_AND_WAIT_OPERATION;
}

/** All `main` edges of the workflow, in stable declaration order. */
function mainEdges(json: WorkflowJSON): Edge[] {
	const edges: Edge[] = [];
	for (const [source, byType] of Object.entries(json.connections ?? {})) {
		if (!isRecord(byType) || !Array.isArray(byType.main)) continue;
		for (const group of byType.main) {
			if (!Array.isArray(group)) continue;
			for (const connection of group) {
				if (isRecord(connection) && typeof connection.node === 'string') {
					edges.push({ source, target: connection.node });
				}
			}
		}
	}
	return edges;
}

function buildAdjacency(edges: Edge[], skip?: Edge): Map<string, string[]> {
	const adjacency = new Map<string, string[]>();
	for (const edge of edges) {
		if (skip && edge.source === skip.source && edge.target === skip.target) continue;
		const targets = adjacency.get(edge.source);
		if (targets) targets.push(edge.target);
		else adjacency.set(edge.source, [edge.target]);
	}
	return adjacency;
}

function reaches(edges: Edge[], from: string, to: string, skip?: Edge): boolean {
	const adjacency = buildAdjacency(edges, skip);
	// Seed with successors so `from === to` requires traversing at least one edge.
	const queue = [...(adjacency.get(from) ?? [])];
	const visited = new Set<string>();
	while (queue.length > 0) {
		const current = queue.pop();
		if (current === undefined) break;
		if (current === to) return true;
		if (visited.has(current)) continue;
		visited.add(current);
		queue.push(...(adjacency.get(current) ?? []));
	}
	return false;
}

function reachableFrom(edges: Edge[], sources: string[], skip?: Edge): Set<string> {
	const adjacency = buildAdjacency(edges, skip);
	const visited = new Set<string>(sources);
	const queue = [...sources];
	while (queue.length > 0) {
		const current = queue.pop();
		if (current === undefined) break;
		for (const next of adjacency.get(current) ?? []) {
			if (visited.has(next)) continue;
			visited.add(next);
			queue.push(next);
		}
	}
	return visited;
}

/**
 * Find a `main` edge whose removal breaks every cycle through `gateName`
 * without shrinking the set of nodes reachable from the triggers — i.e. a
 * true loop-back edge whose cut costs no coverage. Returns undefined when no
 * such edge exists (e.g. the loop-back edge is also the only inbound path).
 */
export function findCycleCutEdge(json: WorkflowJSON, gateName: string): Edge | undefined {
	const edges = mainEdges(json);
	const triggers = (json.nodes ?? [])
		.filter(
			(node): node is WorkflowNode & { name: string } =>
				Boolean(node.name) && !node.disabled && isTriggerNodeType(node.type),
		)
		.map((node) => node.name);
	if (triggers.length === 0) return undefined;
	if (!reaches(edges, gateName, gateName)) return undefined;

	const baseline = reachableFrom(edges, triggers);
	for (const edge of edges) {
		if (reaches(edges, gateName, gateName, edge)) continue;
		const afterCut = reachableFrom(edges, triggers, edge);
		const preservesCoverage = [...baseline].every((node) => afterCut.has(node));
		if (preservesCoverage) return edge;
	}
	return undefined;
}

type Decision = WaitGateScript['decisions'][number];

interface FormField {
	fieldLabel: string;
	fieldType?: string;
	options: string[];
	multiselect: boolean;
}

function parseFormFields(parameters: Record<string, unknown>): FormField[] | undefined {
	if (parameters.defineForm === 'json') return undefined;
	const formFields = isRecord(parameters.formFields) ? parameters.formFields : {};
	const values = Array.isArray(formFields.values) ? formFields.values : [];
	const fields: FormField[] = [];
	for (const value of values) {
		if (!isRecord(value) || typeof value.fieldLabel !== 'string') continue;
		const fieldOptions = isRecord(value.fieldOptions) ? value.fieldOptions : {};
		const optionValues = Array.isArray(fieldOptions.values) ? fieldOptions.values : [];
		const options = optionValues
			.map((option) => (isRecord(option) ? option.option : undefined))
			.filter((option): option is string => typeof option === 'string');
		fields.push({
			fieldLabel: value.fieldLabel,
			fieldType: typeof value.fieldType === 'string' ? value.fieldType : undefined,
			options,
			multiselect: value.multiselectDropdown === true || value.multiselect === true,
		});
	}
	return fields;
}

function cannedFieldValue(field: FormField, passLabel: string): unknown {
	switch (field.fieldType) {
		case 'dropdown':
			return field.multiselect ? field.options.slice(0, 1) : (field.options[0] ?? '');
		case 'number':
			return 1;
		case 'date':
			return '2026-01-01';
		case 'email':
			return 'reviewer@example.com';
		case 'checkbox':
			return false;
		default:
			return passLabel;
	}
}

/** Response fixtures per decision, mirroring the shared send-and-wait output shapes. */
function deriveDecisions(node: WorkflowNode): Decision[] | undefined {
	const parameters = isRecord(node.parameters) ? node.parameters : {};
	const responseType =
		typeof parameters.responseType === 'string' ? parameters.responseType : 'approval';
	const respondedAt = new Date().toISOString();

	if (responseType === 'approval') {
		return [
			{ label: 'approve', items: [{ data: { approved: true, respondedAt } }] },
			{ label: 'decline', items: [{ data: { approved: false, respondedAt } }] },
		];
	}

	if (responseType === 'freeText') {
		return [
			{ label: 'approve', items: [{ data: { text: APPROVE_TEXT, respondedAt } }] },
			{ label: 'request changes', items: [{ data: { text: REVISE_TEXT, respondedAt } }] },
		];
	}

	if (responseType === 'customForm') {
		const fields = parseFormFields(parameters);
		if (!fields || fields.length === 0) return undefined;
		// The first single-select dropdown with 2+ options drives the decision;
		// without one the routing condition is free text we cannot enumerate.
		const driver = fields.find(
			(field) => field.fieldType === 'dropdown' && !field.multiselect && field.options.length >= 2,
		);
		if (!driver) return undefined;

		const buildPass = (driverValue: string): Decision => {
			const data: Record<string, unknown> = {};
			for (const field of fields) {
				data[field.fieldLabel] =
					field === driver ? driverValue : cannedFieldValue(field, driverValue);
			}
			data.respondedAt = respondedAt;
			return { label: driverValue, items: [{ data }] };
		};
		return [buildPass(driver.options[0]), buildPass(driver.options[1])];
	}

	return undefined;
}

/**
 * Derive scripted-decision verification for the workflow's halted wait gates.
 * V1 scripts exactly one send-and-wait gate; every underivable shape returns
 * [] so the gate keeps its halt fallback.
 */
export function deriveWaitGateScripts(
	workflow: WorkflowJSON,
	plan: NodeSimulationVerdict[],
): WaitGateScript[] {
	const halted = plan.filter((verdict) => verdict.verdict === 'simulate' && verdict.haltBranch);
	if (halted.length !== 1) return [];

	const gateName = halted[0].nodeName;
	const node = (workflow.nodes ?? []).find((candidate) => candidate.name === gateName);
	if (!node || !isSendAndWaitNode(node)) return [];

	const cutEdge = findCycleCutEdge(workflow, gateName);
	if (!cutEdge) return [];

	const decisions = deriveDecisions(node);
	if (!decisions) return [];

	return [{ nodeName: gateName, cutEdge, decisions }];
}
