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
	/** Saved workflow id, for log context only. */
	workflowId: string;
	logger?: Logger;
}

export interface VerificationSimulationPlan {
	nodeSimulationPlan?: NodeSimulationVerdict[];
	simulationFixtures?: SimulationFixtures;
}

export async function planVerificationSimulation({
	workflow,
	mockedNodeNames,
	workflowId,
	logger,
}: PlanVerificationSimulationInput): Promise<VerificationSimulationPlan> {
	let nodeSimulationPlan: NodeSimulationVerdict[] | undefined;
	let simulationFixtures: SimulationFixtures | undefined;
	try {
		nodeSimulationPlan = await classifyNodesForSimulation({ workflow, mockedNodeNames });
		if (nodeSimulationPlan.length > 0) {
			const fixtures = await generateSimulationFixtures({ workflow, plan: nodeSimulationPlan });
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
	}
	return { nodeSimulationPlan, simulationFixtures };
}
