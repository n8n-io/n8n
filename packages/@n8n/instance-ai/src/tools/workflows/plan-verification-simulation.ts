/**
 * Verification Simulation Planning
 *
 * Single entry point for the execute-vs-simulate plan and its mock fixtures,
 * shared by the build and submit tools so the planning policy cannot drift
 * between the two submit paths. The policy:
 *
 * - Never blocks the submit — failures degrade, they do not throw.
 * - An empty plan (no candidate nodes) is kept as `[]` so verify can tell
 *   "nothing to simulate" apart from "classification failed". Only the latter
 *   (plan `undefined`) runs unprotected and makes verify surface a warning.
 * - Fixtures are only generated for non-empty plans; a fixture failure keeps
 *   the plan (verify pins fixture-less simulated nodes with an empty item).
 */

import type { OutputSchemaLookup, WorkflowJSON } from '@n8n/workflow-sdk';

import { classifyNodesForSimulation } from './classify-node-destructiveness.service';
import {
	generateSimulationFixtures,
	type SimulationFixtures,
} from './generate-simulation-fixtures.service';
import { isMockableTriggerNodeType, isTriggerNodeType } from './workflow-json-utils';
import type { Logger } from '../../logger';
import type { NodeSimulationVerdict } from '../../workflow-loop/workflow-loop-state';

export interface PlanVerificationSimulationInput {
	workflow: WorkflowJSON;
	/** Node names whose credentials were mocked — always simulated. */
	mockedNodeNames?: string[];
	/**
	 * Explicit node outputs declared in the workflow SDK source. These become
	 * simulated verification fixtures even for normally safe read-only nodes.
	 */
	declaredOutputFixtures?: SimulationFixtures;
	/** Saved workflow id, for log context only. */
	workflowId: string;
	/** Node output `__schema__` lookup used to shape generated fixtures. */
	outputSchemaLookup?: OutputSchemaLookup;
	logger?: Logger;
}

export interface VerificationSimulationPlan {
	nodeSimulationPlan?: NodeSimulationVerdict[];
	simulationFixtures?: SimulationFixtures;
}

const DECLARED_OUTPUT_SIMULATION_REASON = 'Source declares verification output for this node';

const TRIGGER_SIMULATION_REASON = 'Trigger event is simulated during verification';

/**
 * Non-deterministic triggers (anything outside `KNOWN_MOCKABLE_TRIGGER_TYPES`)
 * get a deterministic `simulate` verdict so fixture generation produces the
 * event payload the trigger would deliver and the real trigger (e.g. a
 * polling node) never executes during verification. The destructiveness
 * classifier deliberately skips triggers, so this is the single injection
 * point for them.
 */
function withSimulatedTriggerVerdicts(
	plan: NodeSimulationVerdict[],
	workflow: WorkflowJSON,
): NodeSimulationVerdict[] {
	const plannedNodeNames = new Set(plan.map((verdict) => verdict.nodeName));
	const verdicts = [...plan];

	for (const node of workflow.nodes ?? []) {
		if (!node.name || node.disabled || plannedNodeNames.has(node.name)) continue;
		if (!isTriggerNodeType(node.type) || isMockableTriggerNodeType(node.type)) continue;
		verdicts.push({
			nodeName: node.name,
			verdict: 'simulate',
			reason: TRIGGER_SIMULATION_REASON,
			confidence: 'high',
			source: 'deterministic',
		});
	}

	return verdicts;
}

const CREDENTIALLESS_AI_ROOT_SIMULATION_REASON =
	'Language model sub-node has no configured credentials — output is simulated during verification';

/**
 * AI roots (Agent/Chain) whose `ai_languageModel` sub-node has no usable
 * credentials get their `execute` verdict overridden to `simulate`: the real
 * run would die at the root with a credential error ("Node does not have any
 * credentials set"), leaving every downstream simulated node unreached. The
 * classifier marks AI roots safe by type and never visits `ai_*` sub-nodes,
 * so — like the trigger pass above — this is the single injection point.
 * Roots already `simulate` (declared fixtures, mocked credentials) keep
 * their verdict and reason.
 */
function withSimulatedCredentiallessAiRootVerdicts(
	plan: NodeSimulationVerdict[],
	workflow: WorkflowJSON,
	mockedNodeNames: Set<string>,
): NodeSimulationVerdict[] {
	const nodesByName = new Map(
		(workflow.nodes ?? [])
			.filter((node): node is WorkflowJSON['nodes'][number] & { name: string } =>
				Boolean(node.name),
			)
			.map((node) => [node.name, node] as const),
	);

	// `ai_languageModel` connections run sub-node → root, so the connection
	// SOURCE is the model and the listed targets are the roots it feeds.
	const rootsWithCredentiallessModel = new Set<string>();
	for (const [sourceName, nodeConns] of Object.entries(workflow.connections ?? {})) {
		const modelConns = (nodeConns as Record<string, unknown>).ai_languageModel;
		if (!Array.isArray(modelConns)) continue;

		const subNode = nodesByName.get(sourceName);
		if (!subNode || subNode.disabled) continue;
		const credentialless =
			mockedNodeNames.has(sourceName) ||
			!subNode.credentials ||
			Object.keys(subNode.credentials).length === 0;
		if (!credentialless) continue;

		for (const group of modelConns) {
			if (!Array.isArray(group)) continue;
			for (const conn of group) {
				if (typeof conn !== 'object' || conn === null || !('node' in conn)) continue;
				rootsWithCredentiallessModel.add((conn as { node: string }).node);
			}
		}
	}
	if (rootsWithCredentiallessModel.size === 0) return plan;

	const verdicts = plan.map((verdict) =>
		rootsWithCredentiallessModel.has(verdict.nodeName) && verdict.verdict !== 'simulate'
			? {
					...verdict,
					verdict: 'simulate' as const,
					reason: CREDENTIALLESS_AI_ROOT_SIMULATION_REASON,
					confidence: 'high' as const,
					source: 'deterministic' as const,
				}
			: verdict,
	);

	const plannedNodeNames = new Set(verdicts.map((verdict) => verdict.nodeName));
	for (const rootName of rootsWithCredentiallessModel) {
		const rootNode = nodesByName.get(rootName);
		if (!rootNode || rootNode.disabled || plannedNodeNames.has(rootName)) continue;
		verdicts.push({
			nodeName: rootName,
			verdict: 'simulate',
			reason: CREDENTIALLESS_AI_ROOT_SIMULATION_REASON,
			confidence: 'high',
			source: 'deterministic',
		});
	}

	return verdicts;
}

function nonEmptyDeclaredFixtures(
	fixtures: SimulationFixtures | undefined,
): SimulationFixtures | undefined {
	if (!fixtures) return undefined;

	const entries = Object.entries(fixtures).filter(([, items]) => items.length > 0);
	return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function withDeclaredOutputVerdicts(
	plan: NodeSimulationVerdict[],
	declaredFixtures: SimulationFixtures | undefined,
): NodeSimulationVerdict[] {
	if (!declaredFixtures) return plan;

	const declaredNodeNames = new Set(Object.keys(declaredFixtures));
	const plannedNodeNames = new Set(plan.map((verdict) => verdict.nodeName));
	const overriddenPlan = plan.map((verdict) =>
		declaredNodeNames.has(verdict.nodeName)
			? {
					...verdict,
					verdict: 'simulate' as const,
					reason: DECLARED_OUTPUT_SIMULATION_REASON,
					confidence: 'high' as const,
					source: 'deterministic' as const,
				}
			: verdict,
	);

	for (const nodeName of declaredNodeNames) {
		if (plannedNodeNames.has(nodeName)) continue;
		overriddenPlan.push({
			nodeName,
			verdict: 'simulate',
			reason: DECLARED_OUTPUT_SIMULATION_REASON,
			confidence: 'high',
			source: 'deterministic',
		});
	}

	return overriddenPlan;
}

export async function planVerificationSimulation({
	workflow,
	mockedNodeNames,
	declaredOutputFixtures,
	workflowId,
	outputSchemaLookup,
	logger,
}: PlanVerificationSimulationInput): Promise<VerificationSimulationPlan> {
	let nodeSimulationPlan: NodeSimulationVerdict[] | undefined;
	let simulationFixtures: SimulationFixtures | undefined;
	const declaredFixtures = nonEmptyDeclaredFixtures(declaredOutputFixtures);
	try {
		nodeSimulationPlan = await classifyNodesForSimulation({ workflow, mockedNodeNames });
		nodeSimulationPlan = withDeclaredOutputVerdicts(nodeSimulationPlan, declaredFixtures);
		nodeSimulationPlan = withSimulatedTriggerVerdicts(nodeSimulationPlan, workflow);
		nodeSimulationPlan = withSimulatedCredentiallessAiRootVerdicts(
			nodeSimulationPlan,
			workflow,
			new Set(mockedNodeNames ?? []),
		);
		if (nodeSimulationPlan.length > 0) {
			const planNeedingGeneratedFixtures = nodeSimulationPlan.filter(
				(verdict) =>
					verdict.verdict === 'simulate' && !declaredFixtures?.[verdict.nodeName]?.length,
			);
			const generatedFixtures =
				planNeedingGeneratedFixtures.length > 0
					? await generateSimulationFixtures({
							workflow,
							plan: planNeedingGeneratedFixtures,
							outputSchemaLookup,
						})
					: {};
			const fixtures = { ...generatedFixtures, ...declaredFixtures };
			simulationFixtures = Object.keys(fixtures).length > 0 ? fixtures : undefined;
			logger?.debug('Classified workflow nodes for verification simulation', {
				workflowId,
				nodeCount: nodeSimulationPlan.length,
				simulateCount: nodeSimulationPlan.filter((v) => v.verdict === 'simulate').length,
				llmCount: nodeSimulationPlan.filter((v) => v.source === 'llm').length,
				fallbackCount: nodeSimulationPlan.filter((v) => v.source === 'fallback').length,
			});
		}
	} catch (error) {
		logger?.warn('Node simulation planning failed', {
			workflowId,
			planAvailable: nodeSimulationPlan !== undefined,
			error: error instanceof Error ? error.message : String(error),
		});
		if (declaredFixtures) {
			nodeSimulationPlan = withDeclaredOutputVerdicts(nodeSimulationPlan ?? [], declaredFixtures);
			simulationFixtures = declaredFixtures;
		}
	}
	return { nodeSimulationPlan, simulationFixtures };
}
