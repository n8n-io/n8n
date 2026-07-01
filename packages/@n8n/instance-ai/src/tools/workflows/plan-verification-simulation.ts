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

import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { classifyNodesForSimulation } from './classify-node-destructiveness.service';
import {
	generateSimulationFixtures,
	type SimulationFixtures,
} from './generate-simulation-fixtures.service';
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
	logger?: Logger;
}

export interface VerificationSimulationPlan {
	nodeSimulationPlan?: NodeSimulationVerdict[];
	simulationFixtures?: SimulationFixtures;
}

const DECLARED_OUTPUT_SIMULATION_REASON = 'Source declares verification output for this node';

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
	logger,
}: PlanVerificationSimulationInput): Promise<VerificationSimulationPlan> {
	let nodeSimulationPlan: NodeSimulationVerdict[] | undefined;
	let simulationFixtures: SimulationFixtures | undefined;
	const declaredFixtures = nonEmptyDeclaredFixtures(declaredOutputFixtures);
	try {
		nodeSimulationPlan = await classifyNodesForSimulation({ workflow, mockedNodeNames });
		nodeSimulationPlan = withDeclaredOutputVerdicts(nodeSimulationPlan, declaredFixtures);
		if (nodeSimulationPlan.length > 0) {
			const planNeedingGeneratedFixtures = nodeSimulationPlan.filter(
				(verdict) =>
					verdict.verdict === 'simulate' && !declaredFixtures?.[verdict.nodeName]?.length,
			);
			const generatedFixtures =
				planNeedingGeneratedFixtures.length > 0
					? await generateSimulationFixtures({ workflow, plan: planNeedingGeneratedFixtures })
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
